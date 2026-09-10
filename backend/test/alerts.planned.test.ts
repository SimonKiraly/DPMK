import { describe, expect, it } from 'vitest';

import { toServiceAlert } from '../src/alerts/normalize.js';
import { extractPlannedReason, parsePlannedDates } from '../src/alerts/parse.js';
import type { RawRssItem } from '../src/alerts/rss.js';

// Publication instant used for the "no explicit year" fallback logic.
const PUB = '2026-09-08T08:00:00.000Z';

describe('parsePlannedDates — deterministic Slovak date phrases', () => {
  it('"od pondelka 7. septembra 2026" → Košice midnight of the 7th', () => {
    const d = parsePlannedDates('… že od pondelka 7. septembra 2026 dôjde k zmene.', PUB);
    expect(d.validFrom).toBe('2026-09-06T22:00:00.000Z');
    expect(d.validTo).toBeNull();
    expect(d.confident).toBe(true);
  });

  it('reads an "od … do …" range', () => {
    const d = parsePlannedDates('Výluka potrvá od 1. októbra 2026 do 15. októbra 2026.', PUB);
    expect(d.validFrom).toBe('2026-09-30T22:00:00.000Z');
    expect(d.validTo).toBe('2026-10-15T21:59:00.000Z');
    expect(d.confident).toBe(true);
  });

  it('accepts the fully numeric "od DD. MM. YYYY" form', () => {
    const d = parsePlannedDates('Zmena platí od 7. 9. 2026.', PUB);
    expect(d.validFrom).toBe('2026-09-06T22:00:00.000Z');
  });

  it('rolls a year-less month that already passed to next year', () => {
    // published in September, notice talks about January → next year
    const d = parsePlannedDates('Od 20. januára sa mení trasa.', PUB);
    expect(d.validFrom).toBe('2027-01-19T23:00:00.000Z'); // Košice midnight, CET
  });

  it('does not invent a window when the notice states no date', () => {
    const d = parsePlannedDates('Od pondelka dôjde k dočasnej zmene zastavovania.', PUB);
    expect(d).toEqual({ validFrom: null, validTo: null, confident: false });
  });

  it('does not mistake "do 15 minút" for a date', () => {
    const d = parsePlannedDates('Dochádza k meškaniam do 15 minút.', PUB);
    expect(d.confident).toBe(false);
  });
});

describe('extractPlannedReason', () => {
  it('lifts "z dôvodu …" up to the sentence end', () => {
    expect(
      extractPlannedReason('… bude zrušená zastávka Poľská z dôvodu rekonštrukcie. Ďakujeme.'),
    ).toBe('rekonštrukcie');
  });

  it('stops before a following "od <dátum>" clause', () => {
    expect(extractPlannedReason('Z dôvodu opravy cesty od 20. septembra 2026 platí obchádzka.')).toBe(
      'opravy cesty',
    );
  });

  it('returns null when there is no reason clause', () => {
    expect(extractPlannedReason('Zmena zastávky na Rastislavovej ulici.')).toBeNull();
  });
});

describe('toServiceAlert — planned notice with a full, confident parse', () => {
  const item: RawRssItem = {
    guid: '900100',
    title: 'Dočasné zrušenie zastávky Poľská',
    link: 'https://www.dpmk.sk/aktuality/2026/docasne-zrusenie-zastavky-polska',
    publishedAt: PUB,
    bodyText:
      'Dopravný podnik mesta Košice, a.s. upozorňuje, že od 1. októbra 2026 do 15. októbra 2026 ' +
      'bude pre linky 12 a 54 zrušená zastávka Poľská z dôvodu rekonštrukcie. ' +
      'Odporúčame použiť zastávku Verejný cintorín.',
    rawHtml: '',
  };
  const a = toServiceAlert(item, undefined, '2026-09-08T09:00:00.000Z')!;

  it('populates the stated window, routes, stops and reason', () => {
    expect(a.type).toBe('planned');
    expect(a.validFrom).toBe('2026-09-30T22:00:00.000Z');
    expect(a.validTo).toBe('2026-10-15T21:59:00.000Z');
    expect(a.affectedRoutes.sort()).toEqual(['12', '54']);
    expect(a.affectedStops.map((s) => s.id).sort()).toEqual(['s-polska', 's-verejny-cintorin']);
    expect(a.reason).toBe('rekonštrukcie');
  });

  it('clears needsReview once everything resolved cleanly', () => {
    expect(a.needsReview).toBe(false);
  });

  it('is upcoming while the start date is still in the future', () => {
    expect(a.status).toBe('upcoming');
  });
});

describe('toServiceAlert — planned notice that stays under review', () => {
  const item: RawRssItem = {
    guid: '900101',
    title: 'Zmena organizácie dopravy počas podujatia',
    link: 'https://www.dpmk.sk/aktuality/2026/podujatie',
    publishedAt: PUB,
    bodyText:
      'Počas podujatia dôjde k dočasným zmenám v organizácii MHD v centre mesta. ' +
      'Podrobnosti zverejníme v deň konania.',
    rawHtml: '',
  };
  const a = toServiceAlert(item, undefined, '2026-09-08T09:00:00.000Z')!;

  it('keeps the cleaned prose but leaves dates null and needsReview true', () => {
    expect(a.type).toBe('planned');
    expect(a.validFrom).toBeNull();
    expect(a.validTo).toBeNull();
    expect(a.needsReview).toBe(true);
    expect(a.description.length).toBeGreaterThan(0);
  });
});
