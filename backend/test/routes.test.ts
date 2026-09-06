import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const syntheticRaw = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/vehicles-nearby.synthetic.json', import.meta.url)), 'utf8'),
);

// Keep the poller off the network — the fleet endpoint is fed the synthetic fixture.
vi.mock('../src/ubian/client.js', () => ({
  UbianError: class UbianError extends Error {},
  ubianGet: vi.fn(async (path: string) =>
    path.includes('/vehicles/nearby')
      ? { status: 'ok', vehicles: syntheticRaw.vehicles }
      : { status: 'ok' },
  ),
}));

import { buildServer } from '../src/server.js';
import { fleet } from '../src/fleet/snapshot.js';
import * as poller from '../src/fleet/poller.js';
import { normalizeVehicles } from '../src/ubian/normalize.js';
import type { UbianVehicleRaw } from '../src/ubian/types.js';

const synthetic = syntheticRaw as { vehicles: UbianVehicleRaw[] };

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  poller._stopForTest();
  await app.close();
});

describe('GET /api/health', () => {
  it('is 200 and reports fleet + ubian status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBe('1.0.0');
    expect(body.ubian.baseUrl).toContain('ubian');
    expect(typeof body.fleetCount).toBe('number');
  });
});

describe('GET /api/network', () => {
  it('serves routes + stops + shapes with an ETag', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/network' });
    expect(res.statusCode).toBe(200);
    expect(res.headers.etag).toBeTruthy();
    expect(res.headers['cache-control']).toContain('max-age=86400');
    const body = res.json();
    expect(body.routes.length).toBeGreaterThan(50);
    expect(body.stops.length).toBeGreaterThan(200);
    expect(body.shapes.length).toBeGreaterThan(50);
    expect(body.meta.validFrom).toBe('2026-07-01');
  });

  it('returns 304 for a matching If-None-Match', async () => {
    const first = await app.inject({ method: 'GET', url: '/api/network' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/network',
      headers: { 'if-none-match': String(first.headers.etag) },
    });
    expect(res.statusCode).toBe(304);
  });
});

describe('GET /api/routes/:shortName', () => {
  it('returns a known route', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/routes/6' });
    expect(res.statusCode).toBe(200);
    expect(res.json().route.shortName).toBe('6');
  });
  it('404s an unknown route', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/routes/ZZZ' });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/vehicles — MHD-only, from the snapshot', () => {
  it('serves the pre-seeded snapshot without any non-MHD vehicle', async () => {
    fleet.setVehicles(normalizeVehicles(synthetic.vehicles).vehicles);
    const res = await app.inject({ method: 'GET', url: '/api/vehicles' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(5);
    expect(body.warmingUp).toBe(false);
    for (const v of body.vehicles) {
      expect(['bus', 'tram', 'night']).toContain(v.mode);
      expect(v.operatorId).toBe(18024);
      expect(v.routeShortName).not.toMatch(/^\d{6}$/);
    }
  });

  it('filters by ?mode=', async () => {
    fleet.setVehicles(normalizeVehicles(synthetic.vehicles).vehicles);
    const res = await app.inject({ method: 'GET', url: '/api/vehicles?mode=tram' });
    expect(res.json().vehicles.every((v: { mode: string }) => v.mode === 'tram')).toBe(true);
  });
});

describe('input validation', () => {
  it('400s /api/stops without lat/lng', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/stops' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('bad_request');
  });

  it('404s an unknown path', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
  });
});
