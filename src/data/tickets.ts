import type { FareClass, TicketProduct } from '@/types';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * MHD Košice ticket catalogue with in-app prices (EUR). Prices match the
 * published DPMK app tariff. `paperPrice` powers the "ušetríte oproti papieru"
 * line and is optional.
 */
export const TICKET_PRODUCTS: TicketProduct[] = [
  {
    id: 't30min',
    category: 'basic',
    name: '30-minútový lístok',
    shortLabel: '30',
    unit: 'MIN',
    note: 'Prestup v cene',
    durationMs: 30 * MIN,
    price: { standard: 1.1, discounted: 0.55 },
    zones: 'Zóna 1 + 2',
  },
  {
    id: 't60min',
    category: 'basic',
    name: '60-minútový lístok',
    shortLabel: '60',
    unit: 'MIN',
    note: 'Najobľúbenejší · prestupný',
    durationMs: 60 * MIN,
    price: { standard: 1.3, discounted: 0.65 },
    zones: 'Zóna 1 + 2',
  },
  {
    id: 't24h',
    category: 'basic',
    name: '24-hodinový lístok',
    shortLabel: '24',
    unit: 'HOD',
    note: 'Neobmedzené jazdy 1 deň',
    durationMs: 24 * HOUR,
    price: { standard: 3.8, discounted: 1.9 },
    zones: 'Zóna 1 + 2',
  },
  {
    id: 't3d',
    category: 'basic',
    name: '3-dňový lístok',
    shortLabel: '3',
    unit: 'DNI',
    note: 'Ideálny pre návštevníkov',
    durationMs: 3 * DAY,
    price: { standard: 7.6, discounted: 3.8 },
    zones: 'Zóna 1 + 2',
  },
  {
    id: 'p30d',
    category: 'prepaid',
    name: '30-dňový predplatný lístok',
    shortLabel: '30',
    unit: 'DNI',
    note: 'Mesačný predplatný',
    durationMs: 30 * DAY,
    price: { standard: 30, discounted: 15 },
    zones: 'Všetky zóny',
  },
  {
    id: 'p90d',
    category: 'prepaid',
    name: '90-dňový predplatný lístok',
    shortLabel: '90',
    unit: 'DNI',
    note: 'Štvrťročný pre dochádzajúcich',
    durationMs: 90 * DAY,
    price: { standard: 80, discounted: 40 },
    zones: 'Všetky zóny',
  },
  {
    id: 'p180d',
    category: 'prepaid',
    name: '180-dňový predplatný lístok',
    shortLabel: '180',
    unit: 'DNI',
    note: 'Polročný predplatný',
    durationMs: 180 * DAY,
    price: { standard: 140, discounted: 70 },
    zones: 'Všetky zóny',
  },
  {
    id: 'p365d',
    category: 'prepaid',
    name: '365-dňový predplatný lístok',
    shortLabel: '365',
    unit: 'DNI',
    note: 'Najnižšia cena za deň · všetky zóny',
    durationMs: 365 * DAY,
    price: { standard: 240, discounted: 120 },
    bestValue: true,
    zones: 'Všetky zóny',
  },
];

/** Optional "paper ticket" comparison price for basic tickets. */
export const PAPER_PRICE: Record<string, Record<FareClass, number>> = {
  t30min: { standard: 1.2, discounted: 0.6 },
  t60min: { standard: 1.4, discounted: 0.7 },
  t24h: { standard: 4.0, discounted: 2.0 },
  t3d: { standard: 8.0, discounted: 4.0 },
};

export const TICKET_BY_ID: Record<string, TicketProduct> = Object.fromEntries(
  TICKET_PRODUCTS.map((t) => [t.id, t]),
);

export function getTicketProduct(id: string): TicketProduct | undefined {
  return TICKET_BY_ID[id];
}

export function perDayLabel(product: TicketProduct, fare: FareClass): string {
  const days = product.durationMs / DAY;
  if (days < 1) return '';
  const perDay = product.price[fare] / days;
  return `€${perDay.toFixed(2).replace('.', ',')} / deň`;
}
