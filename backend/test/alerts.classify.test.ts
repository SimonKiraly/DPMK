import { describe, expect, it } from 'vitest';

import { classify } from '../src/alerts/classify.js';

describe('classify — noise', () => {
  it('drops NÁLEZ / STRATA (lost & found)', () => {
    expect(classify('NÁLEZ', 'ČAS: 14:45 LINKA: 36 NÁJDENÝ PREDMET: bunda').drop).toBe(true);
    expect(classify('STRATA', 'LINKA: 6 STRATENÝ PREDMET: peňaženka').drop).toBe(true);
  });

  it('drops obvious PR / corporate news', () => {
    expect(
      classify(
        'V septembri prídu do Košíc elektrobusy, nabíjacia infraštruktúra je takmer hotová',
        'DPMK investuje do modernizácie vozidlového parku.',
      ).drop,
    ).toBe(true);
    expect(classify('DPMK oslavuje 130 rokov existencie', '').drop).toBe(true);
  });
});

describe('classify — operational', () => {
  it('VÝPADOK SPOJA → connection_cancelled', () => {
    const c = classify('VÝPADOK SPOJA 15', 'OBMEDZENIE: výpadok spoja');
    expect(c).toMatchObject({ type: 'connection_cancelled', drop: false, uncertain: false });
  });
  it('MEŠKANIE → delays', () => {
    const c = classify(
      'UPOZORNENIE NA MEŠKANIE SPOJOV',
      'Z dôvodu zhustenej premávky dochádza k meškaniam na viacerých linkách.',
    );
    expect(c).toMatchObject({ type: 'delays', drop: false });
  });
});

describe('classify — planned', () => {
  const plannedTitles = [
    'Dočasná zmena zastavovania na Rastislavovej ulici',
    'Zrušenie dočasnej zastávky Meteorová od 1. septembra 2026',
    'Výluka električkovej dopravy na rýchlodráhe',
    'Rekonštrukcia na Popradskej ulici prinesie dočasnú zmenu trasy autobusovej linky 17',
    'Organizácia MHD počas podujatia Race Jahodná 2026',
    'Dočasný posun autobusovej zastávky Bruselská',
    'Obnovenie pôvodnej autobusovej zastávky Palackého smer Bosákova',
  ];
  it.each(plannedTitles)('classifies "%s" as planned', (title) => {
    expect(classify(title, '').type).toBe('planned');
  });
});

describe('classify — unknown → other + needs review', () => {
  it('keeps an unrecognised item but flags it', () => {
    const c = classify('Informácia pre cestujúcich', 'Nejasný text bez línie a zastávky.');
    expect(c).toMatchObject({ type: 'other', drop: false, uncertain: true });
  });
});
