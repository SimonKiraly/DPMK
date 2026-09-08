import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { decodeEntities, htmlToText, parseRss } from '../src/alerts/rss.js';

const fx = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');

const realFeed = fx('dpmk-aktuality.rss.xml');
const syntheticFeed = fx('dpmk-alerts.synthetic.rss.xml');

describe('decodeEntities', () => {
  it('decodes the named + numeric entities the feed uses', () => {
    expect(decodeEntities('&lt;p&gt;a &amp; b&lt;/p&gt;')).toBe('<p>a & b</p>');
    expect(decodeEntities('a&nbsp;b')).toBe('a b');
    expect(decodeEntities('&#8211;&#x2013;')).toBe('––');
    expect(decodeEntities('&bdquo;x&ldquo;')).toBe('„x“');
  });
  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&unknownthing; &amp;')).toBe('&unknownthing; &');
  });
});

describe('htmlToText', () => {
  it('turns <br>/<\/p> into newlines and drops other tags', () => {
    const t = htmlToText('<p>A<br>B</p><p>C</p><div><span>D</span></div>');
    expect(t.split('\n')).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('parseRss — real DPMK feed', () => {
  const { items, skipped } = parseRss(realFeed);

  it('reads every <item> in the captured feed', () => {
    expect(items).toHaveLength(10);
    expect(skipped).toBe(0);
  });

  it('extracts a numeric guid, title, link, ISO pubDate and body text', () => {
    const first = items[0]!;
    expect(first.guid).toBe('119534');
    expect(first.title).toBe('VÝPADOK SPOJA 15');
    expect(first.link).toBe('https://www.dpmk.sk/aktuality/2026/vypadok-spoja-15-86');
    expect(first.publishedAt).toBe('2026-09-08T18:01:23.000Z');
    expect(first.bodyText).toContain('MIESTO: Obchodné centrum Cassovia smer Exnárova');
    expect(first.bodyText).toContain('DOTKNUTÉ LINKY: 15');
    expect(first.bodyText).not.toContain('<'); // fully flattened
  });

  it('every item has a non-empty guid and title', () => {
    for (const it of items) {
      expect(it.guid).toMatch(/^\d+$/);
      expect(it.title.length).toBeGreaterThan(0);
    }
  });
});

describe('parseRss — malformed input is survivable', () => {
  it('skips items with no guid / broken tags but keeps the good ones', () => {
    const { items, skipped } = parseRss(syntheticFeed);
    // 10 <item> blocks; the "NO GUID" one is skipped, the broken one has a guid
    // but an unterminated <description> — still readable enough to keep.
    expect(items.length).toBeGreaterThanOrEqual(8);
    expect(skipped).toBeGreaterThanOrEqual(1);
    expect(items.every((i) => i.guid.length > 0)).toBe(true);
  });

  it('returns an empty result for junk instead of throwing', () => {
    expect(parseRss('not xml at all').items).toEqual([]);
    expect(parseRss('').items).toEqual([]);
    expect(parseRss('<rss><channel><item></item></channel></rss>').skipped).toBe(1);
  });
});
