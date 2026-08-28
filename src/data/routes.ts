import type { TransitRoute } from '@/types';
import { colors } from '@/constants/theme';

/**
 * Mock MHD Košice line network. Each route lists its outbound stop sequence;
 * the inbound direction is the reverse. Headways drive the mock timetable in
 * `transportService`.
 *
 * Swap for GTFS `routes.txt` + `trips.txt` + `stop_times.txt` later.
 */
export const ROUTES: TransitRoute[] = [
  {
    id: 'route-16',
    shortName: '16',
    mode: 'bus',
    headsigns: ['Sídlisko KVP, Cottbuská', 'Staničné námestie'],
    stopIds: [
      'stanicne',
      'dom-alzbety',
      'amfiteater',
      'trieda-snp',
      'terasa-torys',
      'kvp-chemicka',
      'kvp-cottbuska',
    ],
    color: colors.primary,
  },
  {
    id: 'route-19',
    shortName: '19',
    mode: 'bus',
    headsigns: ['Sídlisko Ťahanovce', 'Sídlisko KVP, Chemická'],
    stopIds: [
      'kvp-chemicka',
      'terasa-torys',
      'werferova',
      'divadlo',
      'dom-alzbety',
      'amfiteater',
      'tahanovce',
    ],
    color: colors.primary,
  },
  {
    id: 'route-12',
    shortName: '12',
    mode: 'bus',
    headsigns: ['Furča', 'Nad jazerom'],
    stopIds: [
      'nad-jazerom',
      'unlp',
      'namestie-oslob',
      'dom-alzbety',
      'divadlo',
      'amfiteater',
      'furca',
    ],
    color: colors.primary,
  },
  {
    id: 'route-23',
    shortName: '23',
    mode: 'bus',
    headsigns: ['Letisko Košice', 'Staničné námestie'],
    stopIds: ['stanicne', 'namestie-oslob', 'unlp', 'trieda-snp', 'oc-optima', 'barca', 'letisko'],
    color: colors.primary,
  },
  {
    id: 'route-2',
    shortName: '2',
    mode: 'tram',
    headsigns: ['Južná trieda', 'Staničné námestie'],
    stopIds: ['stanicne', 'maraton', 'dom-alzbety', 'namestie-oslob', 'juzna-trieda'],
    color: colors.accent,
  },
  {
    id: 'route-4',
    shortName: '4',
    mode: 'tram',
    headsigns: ['Nad jazerom', 'U. S. Steel'],
    stopIds: ['vss', 'juzna-trieda', 'namestie-oslob', 'divadlo', 'maraton', 'stanicne', 'nad-jazerom'],
    color: colors.accent,
  },
  {
    id: 'route-6',
    shortName: '6',
    mode: 'tram',
    headsigns: ['Barca, Nižné Kapustníky', 'Sídlisko Ťahanovce'],
    stopIds: ['tahanovce', 'amfiteater', 'divadlo', 'dom-alzbety', 'namestie-oslob', 'stanicne', 'barca'],
    color: colors.accent,
  },
  {
    id: 'route-9',
    shortName: '9',
    mode: 'tram',
    headsigns: ['Nad jazerom', 'U. S. Steel'],
    stopIds: ['vss', 'unlp', 'juzna-trieda', 'namestie-oslob', 'dom-alzbety', 'maraton', 'nad-jazerom'],
    color: colors.accent,
  },
  {
    id: 'route-n1',
    shortName: 'N1',
    mode: 'night',
    night: true,
    headsigns: ['Sídlisko KVP', 'Staničné námestie'],
    stopIds: ['stanicne', 'namestie-oslob', 'juzna-trieda', 'dom-alzbety', 'kvp-chemicka', 'kvp-cottbuska'],
    color: colors.textSecondary,
  },
  {
    id: 'route-n4',
    shortName: 'N4',
    mode: 'night',
    night: true,
    headsigns: ['Furča', 'Sídlisko Ťahanovce'],
    stopIds: ['tahanovce', 'amfiteater', 'dom-alzbety', 'nad-jazerom', 'furca'],
    color: colors.textSecondary,
  },
  {
    id: 'route-r810',
    shortName: 'R810',
    mode: 'rail',
    headsigns: ['Prešov', 'Košice'],
    stopIds: ['stanicne'],
    color: colors.primaryTint,
  },
];

export const ROUTE_BY_SHORT_NAME: Record<string, TransitRoute> = Object.fromEntries(
  ROUTES.map((r) => [r.shortName, r]),
);
export const ROUTE_BY_ID: Record<string, TransitRoute> = Object.fromEntries(
  ROUTES.map((r) => [r.id, r]),
);

export function getRoute(shortName: string): TransitRoute | undefined {
  return ROUTE_BY_SHORT_NAME[shortName];
}

/** Deterministic headway (minutes) per line, used by the mock timetable. */
export function headwayMinutes(shortName: string): number {
  const route = getRoute(shortName);
  if (!route) return 15;
  if (route.mode === 'rail') return 60;
  if (route.mode === 'night') return 30;
  if (route.mode === 'tram') return 8;
  return 12;
}
