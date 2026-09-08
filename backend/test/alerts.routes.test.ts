import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const feedXml = readFileSync(
  fileURLToPath(new URL('./fixtures/dpmk-alerts.synthetic.rss.xml', import.meta.url)),
  'utf8',
);

// Keep the alert poller off the network — feed it the fixture (or make it fail).
let rssResponse: { ok: true; xml: string } | { ok: false; err: string } = { ok: true, xml: feedXml };
vi.mock('../src/alerts/rssClient.js', () => ({
  RssError: class RssError extends Error {},
  fetchRssText: vi.fn(async () => {
    if (!rssResponse.ok) throw new Error(rssResponse.err);
    return rssResponse.xml;
  }),
}));
// The fleet poller also must not touch the network.
vi.mock('../src/ubian/client.js', () => ({
  UbianError: class UbianError extends Error {},
  ubianGet: vi.fn(async () => ({ status: 'ok', vehicles: [] })),
}));

import { buildServer } from '../src/server.js';
import * as fleetPoller from '../src/fleet/poller.js';
import * as alertPoller from '../src/alerts/poller.js';
import { alerts } from '../src/alerts/store.js';

let app: Awaited<ReturnType<typeof buildServer>>;

async function freshApp() {
  if (app) await app.close();
  alertPoller._stopForTest();
  alerts._reset();
  app = await buildServer();
  await app.ready();
}

afterAll(async () => {
  fleetPoller._stopForTest();
  alertPoller._stopForTest();
  await app?.close();
});

describe('GET /api/alerts — happy path', () => {
  beforeEach(async () => {
    rssResponse = { ok: true, xml: feedXml };
    await freshApp();
  });

  it('serves normalised alerts from the feed, noise removed', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/alerts' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.source).toBe('dpmk-rss');
    expect(body.warmingUp).toBe(false);
    expect(body.count).toBeGreaterThan(0);

    const titles = body.alerts.map((a: { title: string }) => a.title);
    expect(titles).not.toContain('NÁLEZ');
    expect(titles).not.toContain('STRATA');
    expect(titles.some((t: string) => /elektrobus/i.test(t))).toBe(false);

    for (const a of body.alerts) {
      expect(['connection_cancelled', 'delays', 'planned', 'other']).toContain(a.type);
      expect(['active', 'upcoming', 'ended']).toContain(a.status);
      expect(a.status).not.toBe('ended'); // default view hides ended
      expect(typeof a.rawText).toBe('string');
    }
  });

  it('deduplicates repeated <guid> entries', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/alerts?status=all' });
    const ids = res.json().alerts.map((a: { id: string }) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id: string) => id === '119534')).toHaveLength(1);
  });

  it('filters by type', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/alerts?type=connection_cancelled' });
    expect(res.json().alerts.every((a: { type: string }) => a.type === 'connection_cancelled')).toBe(
      true,
    );
  });

  it('GET /api/alerts/:id returns one alert, 404 for unknown', async () => {
    const ok = await app.inject({ method: 'GET', url: '/api/alerts/119534' });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().alert.id).toBe('119534');

    const miss = await app.inject({ method: 'GET', url: '/api/alerts/000000' });
    expect(miss.statusCode).toBe(404);
    expect(miss.json().error).toBe('alert_not_found');
  });
});

describe('GET /api/alerts — RSS unavailable', () => {
  it('warms up empty and does not error the request', async () => {
    rssResponse = { ok: false, err: 'ECONNREFUSED' };
    await freshApp();
    const res = await app.inject({ method: 'GET', url: '/api/alerts' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.alerts).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('keeps the last good snapshot when a later poll fails', async () => {
    rssResponse = { ok: true, xml: feedXml };
    await freshApp();
    const good = (await app.inject({ method: 'GET', url: '/api/alerts' })).json().count;
    expect(good).toBeGreaterThan(0);

    rssResponse = { ok: false, err: 'timeout' };
    await (alertPoller as unknown as { _stopForTest: () => void })._stopForTest();
    // simulate a failed refresh directly on the store
    alerts.markError('timeout');
    const res = await app.inject({ method: 'GET', url: '/api/alerts' });
    expect(res.json().count).toBe(good); // unchanged
  });
});

describe('GET /api/health includes alert status', () => {
  it('reports the alerts block', async () => {
    rssResponse = { ok: true, xml: feedXml };
    await freshApp();
    await app.inject({ method: 'GET', url: '/api/alerts' }); // warm
    const body = (await app.inject({ method: 'GET', url: '/api/health' })).json();
    expect(body.alerts.rssUrl).toContain('dpmk.sk');
    expect(typeof body.alerts.count).toBe('number');
  });
});
