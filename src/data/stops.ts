import type { Stop } from '@/types';

/**
 * Mock MHD Košice stop inventory. Coordinates are realistic placements around
 * Košice; `lines` are kept in sync with `data/routes.ts`.
 *
 * Replace with a GTFS `stops.txt` import or the DPMK stops endpoint later —
 * the `Stop` shape is intentionally close to GTFS.
 */
export const STOPS: Stop[] = [
  {
    id: 'stanicne',
    name: 'Staničné námestie',
    platform: 'Železničná stanica',
    mode: 'tram',
    location: { latitude: 48.7236, longitude: 21.2686 },
    lines: ['2', '4', '6', '16', '19', '23', 'N1', 'N4', 'R810', 'Ex620'],
    zone: 1,
  },
  {
    id: 'namestie-oslob',
    name: 'Námestie osloboditeľov',
    mode: 'tram',
    location: { latitude: 48.7188, longitude: 21.2589 },
    lines: ['2', '4', '9', '12', '23', 'N1'],
    zone: 1,
  },
  {
    id: 'dom-alzbety',
    name: 'Dóm sv. Alžbety',
    platform: 'Hlavná',
    mode: 'bus',
    location: { latitude: 48.7205, longitude: 21.2578 },
    lines: ['6', '9', '12', '16', '19', 'N1', 'N4'],
    zone: 1,
  },
  {
    id: 'divadlo',
    name: 'Štátne divadlo',
    platform: 'Hlavná',
    mode: 'bus',
    location: { latitude: 48.7223, longitude: 21.2585 },
    lines: ['4', '6', '12', '19'],
    zone: 1,
  },
  {
    id: 'maraton',
    name: 'Námestie Maratónu mieru',
    mode: 'tram',
    location: { latitude: 48.7247, longitude: 21.256 },
    lines: ['2', '4', '9'],
    zone: 1,
  },
  {
    id: 'amfiteater',
    name: 'Amfiteáter',
    mode: 'bus',
    location: { latitude: 48.728, longitude: 21.2545 },
    lines: ['6', '12', '16', '19', 'N4'],
    zone: 1,
  },
  {
    id: 'trieda-snp',
    name: 'Trieda SNP',
    mode: 'bus',
    location: { latitude: 48.718, longitude: 21.238 },
    lines: ['16', '19', '23'],
    zone: 1,
  },
  {
    id: 'terasa-torys',
    name: 'Toryská',
    platform: 'Terasa',
    mode: 'bus',
    location: { latitude: 48.7185, longitude: 21.2305 },
    lines: ['16', '19'],
    zone: 1,
  },
  {
    id: 'oc-optima',
    name: 'OC Optima',
    mode: 'bus',
    location: { latitude: 48.696, longitude: 21.22 },
    lines: ['16', '23'],
    zone: 2,
  },
  {
    id: 'kvp-chemicka',
    name: 'Sídlisko KVP',
    platform: 'Chemická',
    mode: 'bus',
    location: { latitude: 48.732, longitude: 21.223 },
    lines: ['16', '19', 'N1'],
    zone: 1,
  },
  {
    id: 'kvp-cottbuska',
    name: 'Sídlisko KVP',
    platform: 'Cottbuská',
    mode: 'bus',
    location: { latitude: 48.7301, longitude: 21.217 },
    lines: ['16', 'N1'],
    zone: 1,
  },
  {
    id: 'nad-jazerom',
    name: 'Nad jazerom',
    platform: 'Spoločenský pavilón',
    mode: 'tram',
    location: { latitude: 48.693, longitude: 21.282 },
    lines: ['4', '9', '12', 'N4'],
    zone: 1,
  },
  {
    id: 'barca',
    name: 'Barca',
    platform: 'Nižné Kapustníky',
    mode: 'tram',
    location: { latitude: 48.672, longitude: 21.266 },
    lines: ['6', '23'],
    zone: 1,
  },
  {
    id: 'letisko',
    name: 'Letisko Košice',
    mode: 'bus',
    location: { latitude: 48.6631, longitude: 21.24 },
    lines: ['23'],
    zone: 2,
  },
  {
    id: 'tahanovce',
    name: 'Sídlisko Ťahanovce',
    platform: 'Americká trieda',
    mode: 'tram',
    location: { latitude: 48.753, longitude: 21.256 },
    lines: ['6', '19', 'N4'],
    zone: 1,
  },
  {
    id: 'furca',
    name: 'Furča',
    platform: 'Sídlisko Dargovských hrdinov',
    mode: 'bus',
    location: { latitude: 48.737, longitude: 21.287 },
    lines: ['12', 'N4'],
    zone: 1,
  },
  {
    id: 'vss',
    name: 'U. S. Steel',
    platform: 'Vstupný areál',
    mode: 'tram',
    location: { latitude: 48.651, longitude: 21.221 },
    lines: ['4', '9'],
    zone: 2,
  },
  {
    id: 'unlp',
    name: 'UNLP Rastislavova',
    mode: 'bus',
    location: { latitude: 48.7135, longitude: 21.2555 },
    lines: ['9', '12', '23'],
    zone: 1,
  },
  {
    id: 'juzna-trieda',
    name: 'Južná trieda',
    mode: 'tram',
    location: { latitude: 48.7112, longitude: 21.259 },
    lines: ['2', '4', '9', 'N1'],
    zone: 1,
  },
  {
    id: 'werferova',
    name: 'Werferova',
    platform: 'Business Centrum',
    mode: 'bus',
    location: { latitude: 48.7155, longitude: 21.2508 },
    lines: ['12', '19'],
    zone: 1,
  },
];

export const STOP_BY_ID: Record<string, Stop> = Object.fromEntries(
  STOPS.map((s) => [s.id, s]),
);

export function getStop(id: string): Stop | undefined {
  return STOP_BY_ID[id];
}

export function stopLabel(stop: Stop): string {
  return stop.platform ? `${stop.name}, ${stop.platform}` : stop.name;
}
