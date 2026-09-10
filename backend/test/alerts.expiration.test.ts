import { describe, expect, it } from 'vitest';

import { computeStatus, toServiceAlert } from '../src/alerts/normalize.js';
import { kosiceClockOnDateOf } from '../src/lib/time.js';
import type { RawRssItem } from '../src/alerts/rss.js';

/**
 * `connection_cancelled` notices whose every cancelled departure has an explicit
 * time expire from those times directly (± a 30-minute grace, the default
 * `ALERTS_DEPARTURE_GRACE_MS`); anything less certain keeps the Phase-0
 * feed-presence behaviour.
 */
const NOW = Date.parse('2026-09-08T12:00:00.000Z');

const base = {
  type: 'connection_cancelled' as const,
  validFrom: '2026-09-08T08:00:00.000Z',
  validTo: null as string | null,
  lastSeenInFeedAt: '2026-09-08T11:55:00.000Z',
  inLatestFeed: true,
};

describe('computeStatus — cancelled-departure expiry', () => {
  it('future single cancellation → active (even once off the feed)', () => {
    expect(
      computeStatus(
        { ...base, inLatestFeed: false, cancelledDepartureTimes: ['2026-09-08T12:30:00.000Z'] },
        NOW,
      ),
    ).toBe('active');
  });

  it('past single cancellation, grace elapsed → ended', () => {
    expect(
      computeStatus(
        { ...base, inLatestFeed: false, cancelledDepartureTimes: ['2026-09-08T11:00:00.000Z'] },
        NOW,
      ),
    ).toBe('ended');
  });

  it('past single cancellation still inside the 30-min grace → active', () => {
    expect(
      computeStatus({ ...base, cancelledDepartureTimes: ['2026-09-08T11:45:00.000Z'] }, NOW),
    ).toBe('active');
  });

  it('multiple cancellations with one still upcoming → active', () => {
    expect(
      computeStatus(
        {
          ...base,
          inLatestFeed: false,
          cancelledDepartureTimes: ['2026-09-08T09:00:00.000Z', '2026-09-08T14:00:00.000Z'],
        },
        NOW,
      ),
    ).toBe('active');
  });

  it('multiple cancellations all in the past → ended', () => {
    expect(
      computeStatus(
        {
          ...base,
          inLatestFeed: false,
          cancelledDepartureTimes: ['2026-09-08T08:30:00.000Z', '2026-09-08T09:15:00.000Z'],
        },
        NOW,
      ),
    ).toBe('ended');
  });

  it('a departure with no stated time → fall back to the feed-presence grace', () => {
    // still in the feed → active
    expect(
      computeStatus(
        { ...base, cancelledDepartureTimes: ['2026-09-08T08:30:00.000Z', null] },
        NOW,
      ),
    ).toBe('active');
    // gone from the feed longer than the 2-h operational grace → ended
    expect(
      computeStatus(
        {
          ...base,
          inLatestFeed: false,
          lastSeenInFeedAt: '2026-09-08T04:00:00.000Z',
          cancelledDepartureTimes: ['2026-09-08T08:30:00.000Z', null],
        },
        NOW,
      ),
    ).toBe('ended');
  });

  it('no cancelled-departure times at all → unchanged Phase-0 behaviour', () => {
    expect(computeStatus({ ...base }, NOW)).toBe('active');
    expect(
      computeStatus(
        { ...base, inLatestFeed: false, lastSeenInFeedAt: '2026-09-08T04:00:00.000Z' },
        NOW,
      ),
    ).toBe('ended');
  });

  it('an explicit validTo still wins over a future cancelled departure', () => {
    expect(
      computeStatus(
        {
          ...base,
          validTo: '2026-09-08T11:00:00.000Z',
          cancelledDepartureTimes: ['2026-09-08T14:00:00.000Z'],
        },
        NOW,
      ),
    ).toBe('ended');
  });

  it('does not apply the departure-time rule to non-operational notices', () => {
    expect(
      computeStatus(
        {
          type: 'planned',
          validFrom: null,
          validTo: null,
          lastSeenInFeedAt: '2026-09-08T11:55:00.000Z',
          inLatestFeed: true,
          cancelledDepartureTimes: ['2026-09-08T08:00:00.000Z'],
        },
        NOW,
      ),
    ).toBe('active');
  });
});

/* ----------------------------------------------------------------------------
 * Regression: a cancelled departure's ČAS must be anchored to the *publication
 * day*, never rolled forward. A notice published in the afternoon that lists a
 * morning departure used to have that departure pushed to "tomorrow" by the
 * forward-rolling `combineDateAndClock`, so the alert never expired.
 * ------------------------------------------------------------------------- */

describe('kosiceClockOnDateOf — anchor a ČAS to the publication day', () => {
  it('keeps a same-day past time on the publication day (afternoon notice, morning trip)', () => {
    // 2026-09-08 14:30 Košice
    expect(kosiceClockOnDateOf(new Date('2026-09-08T12:30:00.000Z'), '11:48')).toBe(
      '2026-09-08T09:48:00.000Z',
    );
  });
  it('keeps a same-day near-future time on the publication day (pre-announced výpadok)', () => {
    // 2026-09-09 06:00 Košice, trip at 07:30
    expect(kosiceClockOnDateOf(new Date('2026-09-09T04:00:00.000Z'), '07:30')).toBe(
      '2026-09-09T05:30:00.000Z',
    );
  });
  it('never rolls a morning time forward past an evening publication', () => {
    // 2026-09-08 20:00 Košice — the bug case
    expect(kosiceClockOnDateOf(new Date('2026-09-08T18:00:00.000Z'), '11:48')).toBe(
      '2026-09-08T09:48:00.000Z',
    );
  });
  it('steps *back* a day when a just-after-midnight notice names a just-before-midnight trip', () => {
    // base 2026-09-10 00:15 Košice, trip 23:55 → the previous Košice day
    expect(kosiceClockOnDateOf(new Date('2026-09-09T22:15:00.000Z'), '23:55')).toBe(
      '2026-09-09T21:55:00.000Z',
    );
  });
  it('rejects a malformed clock', () => {
    expect(kosiceClockOnDateOf(new Date('2026-09-08T12:00:00.000Z'), '99:99')).toBeNull();
    expect(kosiceClockOnDateOf(new Date('nonsense'), '08:00')).toBeNull();
  });
});

describe('toServiceAlert — operational expiry, end to end', () => {
  const shapeA = (times: (string | null)[], predpoklad?: string): string => {
    const lines = ['VÝPADOK SPOJA 18'];
    for (const t of times) {
      lines.push('MIESTO: Tesco, Džungľa smer Nová nemocnica');
      if (t) lines.push(`ČAS: ${t}`);
    }
    lines.push('DOTKNUTÉ LINKY: 18', 'OBMEDZENIE: výpadok spoja', 'DÔVOD: porucha vozidla');
    if (predpoklad) {
      lines.push('PREDPOKLAD TRVANIA OBMEDZENÍ:', `${predpoklad} odchod nasledujúceho spoja`);
    }
    return lines.join('\n');
  };
  const alert = (pub: string, body: string, now: string) =>
    toServiceAlert(
      { guid: '119531', title: 'VÝPADOK SPOJA 18', link: '', publishedAt: pub, bodyText: body, rawHtml: '' } as RawRssItem,
      undefined,
      now,
    )!;

  it('THE REPORTED BUG: pub 2026-09-08 (afternoon), departures 11:48 & 12:03, now 2026-09-09 06:27 → ended', () => {
    const a = alert('2026-09-08T12:30:00.000Z', shapeA(['11:48', '12:03']), '2026-09-09T04:27:00.000Z');
    expect(a.cancelledDepartures.map((d) => d.time)).toEqual([
      '2026-09-08T09:48:00.000Z',
      '2026-09-08T10:03:00.000Z',
    ]);
    expect(a.status).toBe('ended');
  });

  it('same-day future departure → active', () => {
    // pub 06:00 Košice, trip 07:30, now 06:27 Košice
    const a = alert('2026-09-09T04:00:00.000Z', shapeA(['07:30']), '2026-09-09T04:27:00.000Z');
    expect(a.cancelledDepartures[0]!.time).toBe('2026-09-09T05:30:00.000Z');
    expect(a.status).toBe('active');
  });

  it('same-day past departure, still inside the 30-min grace → active', () => {
    // trip 06:05 Košice (04:05Z), now 06:27 Košice (04:27Z) → 22 min ago
    const a = alert('2026-09-09T03:30:00.000Z', shapeA(['06:05']), '2026-09-09T04:27:00.000Z');
    expect(a.cancelledDepartures[0]!.time).toBe('2026-09-09T04:05:00.000Z');
    expect(a.status).toBe('active');
  });

  it('same-day past departure, more than 30 min ago → ended', () => {
    // trip 05:30 Košice (03:30Z), now 06:27 Košice → 57 min ago
    const a = alert('2026-09-09T02:00:00.000Z', shapeA(['05:30']), '2026-09-09T04:27:00.000Z');
    expect(a.cancelledDepartures[0]!.time).toBe('2026-09-09T03:30:00.000Z');
    expect(a.status).toBe('ended');
  });

  it('previous-day departure (notice published before its trips) → ended', () => {
    const a = alert('2026-09-08T09:00:00.000Z', shapeA(['11:48', '12:03']), '2026-09-09T04:27:00.000Z');
    expect(a.cancelledDepartures.map((d) => d.time)).toEqual([
      '2026-09-08T09:48:00.000Z',
      '2026-09-08T10:03:00.000Z',
    ]);
    expect(a.status).toBe('ended');
  });

  it('multiple departures with one still in the future → active', () => {
    // trips 05:00 (past) and 09:00 (future) Košice, now 06:27 Košice
    const a = alert('2026-09-09T02:00:00.000Z', shapeA(['05:00', '09:00']), '2026-09-09T04:27:00.000Z');
    expect(a.cancelledDepartures.map((d) => d.time)).toEqual([
      '2026-09-09T03:00:00.000Z',
      '2026-09-09T07:00:00.000Z',
    ]);
    expect(a.status).toBe('active');
  });

  it('a departure with no stated ČAS → falls back to the feed-presence grace (fresh feed → active)', () => {
    const a = alert('2026-09-08T12:30:00.000Z', shapeA(['11:48', null]), '2026-09-09T04:27:00.000Z');
    // the null time is preserved, not invented
    expect(a.cancelledDepartures.map((d) => d.time)).toEqual(['2026-09-08T09:48:00.000Z', null]);
    // fresh from the feed (inLatestFeed:true at parse) → active despite the past time
    expect(a.status).toBe('active');
    // …and once it has been off the feed past the 2 h operational grace → ended
    expect(
      computeStatus(
        {
          type: a.type,
          validFrom: a.validFrom,
          validTo: a.validTo,
          lastSeenInFeedAt: '2026-09-09T00:00:00.000Z',
          inLatestFeed: false,
          cancelledDepartureTimes: a.cancelledDepartures.map((d) => d.time),
        },
        Date.parse('2026-09-09T04:27:00.000Z'),
      ),
    ).toBe('ended');
  });

  it('an explicit validTo (PREDPOKLAD) that has passed still takes precedence → ended', () => {
    // PREDPOKLAD 12:23 → validTo on 2026-09-08; now is the next morning
    const a = alert('2026-09-08T10:00:00.000Z', shapeA(['11:48'], '12:23'), '2026-09-09T04:27:00.000Z');
    expect(a.validTo).toBe('2026-09-08T10:23:00.000Z');
    expect(a.status).toBe('ended');
  });

  it('an explicit validTo still in the future keeps the alert active even when the departure is past', () => {
    // pub 06:00 Košice, trip 06:10 (past by 07:00), PREDPOKLAD 08:00 (future) — resolution not yet reached
    const a = alert('2026-09-09T04:00:00.000Z', shapeA(['06:10'], '08:00'), '2026-09-09T05:00:00.000Z');
    expect(a.validTo).toBe('2026-09-09T06:00:00.000Z');
    expect(a.status).toBe('active');
  });
});
