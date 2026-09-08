import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { computeStatus, toServiceAlert } from '../src/alerts/normalize.js';
import { parseRss, type RawRssItem } from '../src/alerts/rss.js';
import type { ServiceAlert } from '../src/types.js';

const items = parseRss(
  readFileSync(
    fileURLToPath(new URL('./fixtures/dpmk-alerts.synthetic.rss.xml', import.meta.url)),
    'utf8',
  ),
).items;
const byTitle = (t: string): RawRssItem => items.find((i) => i.title === t)!;
const NOW = '2026-09-08T18:10:00.000Z';

describe('toServiceAlert — VÝPADOK SPOJA 15', () => {
  const a = toServiceAlert(byTitle('VÝPADOK SPOJA 15'), undefined, NOW)!;

  it('is a fully-parsed connection_cancelled alert', () => {
    expect(a.id).toBe('119534');
    expect(a.type).toBe('connection_cancelled');
    expect(a.severity).toBe('minor');
    expect(a.source).toBe('dpmk-rss');
    expect(a.sourceUrl).toContain('vypadok-spoja-15');
    expect(a.publishedAt).toBe('2026-09-08T18:01:23.000Z');
    expect(a.validFrom).toBe(a.publishedAt);
    expect(a.reason).toBe('porucha vozidla');
    expect(a.needsReview).toBe(false);
  });

  it('resolves the affected route and stop', () => {
    expect(a.affectedRoutes).toEqual(['15']);
    expect(a.affectedStops.map((s) => s.id)).toEqual(['s-oc-cassovia']);
  });

  it('builds one cancelled departure with a real timestamp', () => {
    expect(a.cancelledDepartures).toHaveLength(1);
    const d = a.cancelledDepartures[0]!;
    expect(d.routeShortNames).toEqual(['15']);
    expect(d.stopId).toBe('s-oc-cassovia');
    expect(d.direction).toBe('Exnárova');
    // "ČAS: 20:00" paired with the pubDate's Košice date (2026-09-08)
    expect(d.time).toBe('2026-09-08T18:00:00.000Z');
  });

  it('turns "PREDPOKLAD … 20:20" into validTo (given, not guessed)', () => {
    expect(a.validTo).toBe('2026-09-08T18:20:00.000Z');
  });

  it('has a rebuilt human description', () => {
    expect(a.description).toContain('Linka 15');
    expect(a.description).toContain('20:00');
    expect(a.description).toContain('porucha vozidla');
  });
});

describe('toServiceAlert — VÝPADOK SPOJA 27 (two departures)', () => {
  const a = toServiceAlert(byTitle('VÝPADOK SPOJA 27'), undefined, NOW)!;
  it('keeps both cancelled departures with their own stop/direction/time', () => {
    expect(a.cancelledDepartures).toHaveLength(2);
    expect(a.cancelledDepartures.map((d) => d.stopId)).toEqual([
      's-madridska',
      's-stanicne-namestie',
    ]);
    expect(a.affectedStops).toHaveLength(2);
    expect(a.validTo).toBeNull(); // no PREDPOKLAD in this notice
  });
});

describe('toServiceAlert — MEŠKANIE', () => {
  const a = toServiceAlert(byTitle('UPOZORNENIE NA MEŠKANIE SPOJOV'), undefined, NOW)!;
  it('is a delays alert with no routes/stops and the prose kept', () => {
    expect(a.type).toBe('delays');
    expect(a.affectedRoutes).toEqual([]);
    expect(a.affectedStops).toEqual([]);
    expect(a.cancelledDepartures).toEqual([]);
    expect(a.description.toLowerCase()).toContain('meškani');
    expect(a.needsReview).toBe(false);
  });
});

describe('toServiceAlert — planned', () => {
  const a = toServiceAlert(byTitle('Dočasná zmena zastavovania na Rastislavovej ulici'), undefined, NOW)!;
  it('is classified, prose-cleaned, dates left null, flagged for review', () => {
    expect(a.type).toBe('planned');
    expect(a.severity).toBe('major');
    expect(a.validFrom).toBeNull();
    expect(a.validTo).toBeNull();
    expect(a.needsReview).toBe(true);
    expect(a.description).toContain('7. septembra 2026');
    expect(a.description).not.toContain('hovorca@');
  });
  it('still resolves explicitly named lines/stops best-effort', () => {
    expect(a.affectedRoutes.sort()).toEqual(['12', '54']);
    expect(a.affectedStops.map((s) => s.id)).toEqual(
      expect.arrayContaining(['s-verejny-cintorin', 's-polska']),
    );
  });
});

describe('toServiceAlert — noise and breakage', () => {
  it('drops NÁLEZ / STRATA / PR (returns null)', () => {
    expect(toServiceAlert(byTitle('NÁLEZ'), undefined, NOW)).toBeNull();
    expect(toServiceAlert(byTitle('STRATA'), undefined, NOW)).toBeNull();
    expect(
      toServiceAlert(
        byTitle('V septembri prídu do Košíc elektrobusy, nabíjacia infraštruktúra je takmer hotová'),
        undefined,
        NOW,
      ),
    ).toBeNull();
  });

  it('never throws on a malformed item', () => {
    const junk: RawRssItem = {
      guid: 'x',
      title: 'VÝPADOK SPOJA ??',
      link: '',
      publishedAt: null,
      bodyText: 'ČAS: 99:99\nMIESTO:\nDOTKNUTÉ LINKY:',
      rawHtml: '',
    };
    const a = toServiceAlert(junk, undefined, NOW);
    expect(a).not.toBeNull();
    expect(a!.needsReview).toBe(true);
    expect(a!.cancelledDepartures).toEqual([]);
  });

  it('preserves firstSeenAt from a previous version of the same alert', () => {
    const prev = toServiceAlert(byTitle('VÝPADOK SPOJA 15'), undefined, '2026-09-08T18:02:00.000Z')!;
    const next = toServiceAlert(byTitle('VÝPADOK SPOJA 15'), prev, NOW)!;
    expect(next.firstSeenAt).toBe(prev.firstSeenAt);
    expect(next.updatedAt).toBe(NOW);
  });
});

describe('computeStatus — only from available info', () => {
  const mk = (over: Partial<Parameters<typeof computeStatus>[0]>) => ({
    type: 'connection_cancelled' as const,
    validFrom: '2026-09-08T18:00:00.000Z',
    validTo: null as string | null,
    lastSeenInFeedAt: '2026-09-08T18:00:00.000Z',
    inLatestFeed: true,
    ...over,
  });

  it('active while in the feed', () => {
    expect(computeStatus(mk({}), Date.parse('2026-09-08T18:05:00Z'))).toBe('active');
  });
  it('upcoming when validFrom is still in the future', () => {
    expect(
      computeStatus(mk({ validFrom: '2026-09-10T00:00:00Z' }), Date.parse('2026-09-08T18:05:00Z')),
    ).toBe('upcoming');
  });
  it('ended once validTo has passed', () => {
    expect(
      computeStatus(mk({ validTo: '2026-09-08T18:20:00Z' }), Date.parse('2026-09-08T19:00:00Z')),
    ).toBe('ended');
  });
  it('ended when an operational notice left the feed hours ago', () => {
    expect(
      computeStatus(
        mk({ inLatestFeed: false, lastSeenInFeedAt: '2026-09-08T12:00:00Z' }),
        Date.parse('2026-09-08T18:00:00Z'),
      ),
    ).toBe('ended');
  });
  it('a planned notice with no dates stays active while recently seen', () => {
    expect(
      computeStatus(
        {
          type: 'planned',
          validFrom: null,
          validTo: null,
          lastSeenInFeedAt: '2026-09-08T18:00:00Z',
          inLatestFeed: false,
        },
        Date.parse('2026-09-09T18:00:00Z'),
      ),
    ).toBe('active');
  });
});
