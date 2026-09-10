import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { toServiceAlert } from '../src/alerts/normalize.js';
import { parseUpdateTimestamp } from '../src/alerts/parse.js';
import { parseRss, type RawRssItem } from '../src/alerts/rss.js';

const items = parseRss(
  readFileSync(
    fileURLToPath(new URL('./fixtures/dpmk-aktuality.rss.xml', import.meta.url)),
    'utf8',
  ),
).items;
const byTitle = (t: string): RawRssItem => items.find((i) => i.title === t)!;

// 09:55:17Z == 11:55 Košice (CEST) on 2026-09-08
const PUB = '2026-09-08T09:55:17.000Z';

describe('parseUpdateTimestamp', () => {
  it('reads "📍(HH:MM) AKTUALIZÁCIA:" and pairs it with the publication day', () => {
    expect(
      parseUpdateTimestamp('📍(12:28) AKTUALIZÁCIA: zapojené náhradné vozidlo', PUB),
    ).toBe('2026-09-08T10:28:00.000Z');
  });

  it('reads the "AKTUALIZÁCIA (HH:MM)" order as well', () => {
    expect(parseUpdateTimestamp('Text. AKTUALIZÁCIA (12:40): doplnené vozidlo.', PUB)).toBe(
      '2026-09-08T10:40:00.000Z',
    );
  });

  it('returns null when there is no AKTUALIZÁCIA stamp', () => {
    expect(parseUpdateTimestamp('MIESTO: Madridská\nČAS: 08:00', PUB)).toBeNull();
  });

  it('returns null when the stamp predates publication (not a later revision)', () => {
    // 11:30 is before the 11:55 publication time on the same day
    expect(parseUpdateTimestamp('(11:30) AKTUALIZÁCIA: ...', PUB)).toBeNull();
  });

  it('returns null on an unparseable clock', () => {
    expect(parseUpdateTimestamp('AKTUALIZÁCIA (99:99): ...', PUB)).toBeNull();
  });
});

describe('toServiceAlert — updatedAt', () => {
  it('uses the AKTUALIZÁCIA revision stamp, not the parse time', () => {
    const a = toServiceAlert(byTitle('VÝPADOK SPOJA 72'), undefined, '2026-09-08T18:00:00.000Z')!;
    expect(a.publishedAt).toBe(PUB);
    expect(a.updatedAt).toBe('2026-09-08T10:28:00.000Z');
  });

  it('falls back to the parse time when the notice carries no stamp', () => {
    const a = toServiceAlert(byTitle('VÝPADOK SPOJA 18'), undefined, '2026-09-08T18:00:00.000Z')!;
    expect(a.updatedAt).toBe('2026-09-08T18:00:00.000Z');
  });
});
