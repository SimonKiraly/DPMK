import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  cleanPlannedDescription,
  extractFields,
  parseShapeA,
  splitPlaceDirection,
} from '../src/alerts/parse.js';
import { parseRss, type RawRssItem } from '../src/alerts/rss.js';

const feed = parseRss(
  readFileSync(fileURLToPath(new URL('./fixtures/dpmk-aktuality.rss.xml', import.meta.url)), 'utf8'),
);
const byTitle = (t: string): RawRssItem => feed.items.find((i) => i.title === t)!;

describe('splitPlaceDirection', () => {
  it('splits "<stop> smer <terminus>"', () => {
    expect(splitPlaceDirection('Madridská smer Staničné námestie')).toEqual({
      place: 'Madridská',
      direction: 'Staničné námestie',
    });
    expect(splitPlaceDirection('Zimná smer KVP, kláštor')).toEqual({
      place: 'Zimná',
      direction: 'KVP, kláštor',
    });
  });
  it('returns direction null when there is no "smer"', () => {
    expect(splitPlaceDirection('Madridská')).toEqual({ place: 'Madridská', direction: null });
  });
});

describe('parseShapeA — VÝPADOK SPOJA (single MIESTO/ČAS)', () => {
  const parsed = parseShapeA(extractFields(byTitle('VÝPADOK SPOJA 15').bodyText));

  it('reads DOTKNUTÉ LINKY, DÔVOD, OBMEDZENIE', () => {
    expect(parsed.lineTokens).toEqual(['15']);
    expect(parsed.reason).toBe('porucha vozidla');
    expect(parsed.restriction).toBe('výpadok spoja');
  });
  it('reads the one MIESTO/ČAS pair with a direction', () => {
    expect(parsed.places).toHaveLength(1);
    expect(parsed.places[0]).toEqual({
      place: 'Obchodné centrum Cassovia',
      direction: 'Exnárova',
      time: '20:00',
    });
  });
  it('reads a leading HH:MM out of PREDPOKLAD', () => {
    expect(parsed.expected?.time).toBe('20:20');
    expect(parsed.expected?.text).toContain('odchod nasledujúceho spoja');
  });
});

describe('parseShapeA — VÝPADOK SPOJA 27 (two MIESTO/ČAS blocks)', () => {
  const parsed = parseShapeA(extractFields(byTitle('VÝPADOK SPOJA 27').bodyText));
  it('captures both cancelled departures', () => {
    expect(parsed.places).toEqual([
      { place: 'Madridská', direction: 'Staničné námestie', time: '07:10' },
      { place: 'Staničné námestie', direction: 'Madridská', time: '07:37' },
    ]);
    expect(parsed.lineTokens).toEqual(['27']);
  });
});

describe('parseShapeA — MEŠKANIE (no structured fields)', () => {
  const parsed = parseShapeA(extractFields(byTitle('UPOZORNENIE NA MEŠKANIE SPOJOV').bodyText));
  it('yields no places / lines but does not throw', () => {
    expect(parsed.places).toEqual([]);
    expect(parsed.lineTokens).toEqual([]);
    expect(parsed.reason).toBeNull();
  });
});

describe('cleanPlannedDescription', () => {
  it('keeps the operational sentences and cuts the media boilerplate', () => {
    const body = [
      'Dočasná zmena zastavovania na Rastislavovej ulici',
      'Košice, 4. september 2026',
      'DPMK upozorňuje cestujúcich, že od pondelka 7. septembra 2026 dôjde k zmene.',
      'Zastávka Poľská smer Stará nemocnica je zrušená bez náhrady.',
      'Kontakt pre médiá: hovorca@dpmk.kosice.sk',
      'Spájame Košičanov už od roku 1891',
      'facebook.com/dpmkofficial',
    ].join('\n');
    const out = cleanPlannedDescription(body);
    expect(out).toContain('od pondelka 7. septembra 2026');
    expect(out).toContain('zrušená bez náhrady');
    expect(out).not.toContain('hovorca@');
    expect(out).not.toContain('facebook');
    expect(out).not.toContain('Košice, 4. september');
  });
});
