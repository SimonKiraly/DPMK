import { describe, expect, it } from 'vitest';

import { deriveSeverity, toServiceAlert } from '../src/alerts/normalize.js';
import type { RawRssItem } from '../src/alerts/rss.js';

const NOW = '2026-09-08T12:00:00.000Z';

const planned = (title: string, body: string): RawRssItem => ({
  guid: '900001',
  title,
  link: 'https://www.dpmk.sk/aktuality/2026/x',
  publishedAt: '2026-09-08T08:00:00.000Z',
  bodyText: body,
  rawHtml: '',
});

describe('deriveSeverity — quantitative + phrase signals only', () => {
  it('operational stays minor until it clearly spans many routes', () => {
    expect(deriveSeverity('connection_cancelled', 'výpadok spoja', 1)).toBe('minor');
    expect(deriveSeverity('delays', 'meškania', 3)).toBe('minor');
    expect(deriveSeverity('delays', 'meškania na linkách', 4)).toBe('major');
  });

  it('planned restoration → info', () => {
    expect(deriveSeverity('planned', 'Obnovenie premávky na linke 6.', 1)).toBe('info');
  });

  it('planned with a bare "výluka" and one route is NOT severe', () => {
    expect(deriveSeverity('planned', 'Z dôvodu výluky sa mení trasa linky 15.', 1)).toBe('major');
  });

  it('planned spanning three or more routes → severe', () => {
    expect(deriveSeverity('planned', 'Zmena trasy pre linky 6, 12 a 15.', 3)).toBe('severe');
  });

  it('planned with an explicit broad-disruption phrase → severe even with one route', () => {
    expect(
      deriveSeverity('planned', 'Zavádza sa náhradná autobusová doprava za električku.', 1),
    ).toBe('severe');
    expect(deriveSeverity('planned', 'Linka 6 nebude premávať v úseku Námestie osloboditeľov.', 1)).toBe(
      'severe',
    );
  });

  it('other → info', () => {
    expect(deriveSeverity('other', 'čokoľvek', 9)).toBe('info');
  });
});

describe('toServiceAlert — severity end to end', () => {
  it('a routine single-line "výluka" is major, not severe', () => {
    const a = toServiceAlert(
      planned(
        'Zmena trasy linky 15',
        'Z dôvodu výluky od 20. septembra 2026 sa mení trasa linky 15. Zastávka Poľská je preložená.',
      ),
      undefined,
      NOW,
    )!;
    expect(a.type).toBe('planned');
    expect(a.affectedRoutes).toEqual(['15']);
    expect(a.severity).toBe('major');
  });

  it('a tram-replacement notice is severe', () => {
    const a = toServiceAlert(
      planned(
        'Výluka električiek',
        'Z dôvodu opravy trate bude od 20. septembra 2026 zavedená náhradná autobusová doprava za električku na linke 6.',
      ),
      undefined,
      NOW,
    )!;
    expect(a.severity).toBe('severe');
  });

  it('a change affecting three lines is severe', () => {
    const a = toServiceAlert(
      planned(
        'Obchádzka na Južnej triede',
        'Z dôvodu rekonštrukcie od 20. septembra 2026 premávajú linky 6, 12 a 15 po obchádzkovej trase.',
      ),
      undefined,
      NOW,
    )!;
    expect(a.affectedRoutes.sort()).toEqual(['12', '15', '6']);
    expect(a.severity).toBe('severe');
  });
});
