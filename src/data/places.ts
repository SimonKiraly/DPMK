import type { Place } from '@/types';

/**
 * Named locations the journey planner understands. In production this is a
 * geocoding / places autocomplete service; the planner only needs a coordinate
 * and the nearest stop id to build itineraries.
 */
export const PLACES: Place[] = [
  {
    id: 'pl-hlavna',
    name: 'Hlavná ulica',
    subtitle: 'Historické centrum · Košice',
    location: { latitude: 48.7211, longitude: 21.2578 },
    nearestStopId: 'dom-alzbety',
    kind: 'poi',
  },
  {
    id: 'pl-stanica',
    name: 'Železničná stanica',
    subtitle: 'Staničné námestie 9',
    location: { latitude: 48.7239, longitude: 21.2683 },
    nearestStopId: 'stanicne',
    kind: 'stop',
  },
  {
    id: 'pl-oslob',
    name: 'Námestie osloboditeľov',
    subtitle: 'Dolná brána · Košice',
    location: { latitude: 48.7186, longitude: 21.2591 },
    nearestStopId: 'namestie-oslob',
    kind: 'poi',
  },
  {
    id: 'pl-optima',
    name: 'OC Optima',
    subtitle: 'Moldavská cesta 32',
    location: { latitude: 48.6959, longitude: 21.2199 },
    nearestStopId: 'oc-optima',
    kind: 'poi',
  },
  {
    id: 'pl-letisko',
    name: 'Letisko Košice',
    subtitle: 'Medzinárodné letisko · 5 km',
    location: { latitude: 48.6631, longitude: 21.2411 },
    nearestStopId: 'letisko',
    kind: 'poi',
  },
  {
    id: 'pl-terasa',
    name: 'Terasa',
    subtitle: 'Sídlisko · Trieda SNP',
    location: { latitude: 48.7175, longitude: 21.2318 },
    nearestStopId: 'terasa-torys',
    kind: 'address',
  },
  {
    id: 'pl-tahanovce',
    name: 'Sídlisko Ťahanovce',
    subtitle: 'Americká trieda',
    location: { latitude: 48.7529, longitude: 21.2561 },
    nearestStopId: 'tahanovce',
    kind: 'address',
  },
  {
    id: 'pl-jazero',
    name: 'Nad jazerom',
    subtitle: 'Spoločenský pavilón',
    location: { latitude: 48.6932, longitude: 21.2818 },
    nearestStopId: 'nad-jazerom',
    kind: 'address',
  },
  {
    id: 'pl-furca',
    name: 'Furča',
    subtitle: 'Sídlisko Dargovských hrdinov',
    location: { latitude: 48.7371, longitude: 21.2869 },
    nearestStopId: 'furca',
    kind: 'address',
  },
  {
    id: 'pl-kvp',
    name: 'KVP',
    subtitle: 'Sídlisko KVP · Cottbuská',
    location: { latitude: 48.7302, longitude: 21.2168 },
    nearestStopId: 'kvp-cottbuska',
    kind: 'address',
  },
  {
    id: 'pl-divadlo',
    name: 'Štátne divadlo Košice',
    subtitle: 'Hlavná 58',
    location: { latitude: 48.7221, longitude: 21.2586 },
    nearestStopId: 'divadlo',
    kind: 'poi',
  },
  {
    id: 'pl-unlp',
    name: 'UNLP Rastislavova',
    subtitle: 'Univerzitná nemocnica',
    location: { latitude: 48.7133, longitude: 21.2556 },
    nearestStopId: 'unlp',
    kind: 'poi',
  },
  {
    id: 'pl-werferova',
    name: 'Werferova',
    subtitle: 'Business Centrum Košice',
    location: { latitude: 48.7156, longitude: 21.2507 },
    nearestStopId: 'werferova',
    kind: 'work',
  },
];

export const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(
  PLACES.map((p) => [p.id, p]),
);

export function searchPlaces(query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return PLACES;
  return PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q),
  );
}
