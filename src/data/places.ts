import type { Place } from '@/types';

/**
 * Named locations the journey planner understands. In production this is a
 * geocoding / places service; the planner only needs a coordinate and the
 * nearest stop. Each entry is anchored to a real stop in the official DPMK
 * network (data/dpmkNetwork.ts) — both `location` and `nearestStopId` come
 * from that stop.
 */
export const PLACES: Place[] = [
  {
    id: 'pl-stanica',
    name: 'Železničná stanica',
    subtitle: 'Staničné námestie 9',
    location: { latitude: 48.72207, longitude: 21.266588 },
    nearestStopId: 's-stanicne-namestie', // Staničné námestie
    kind: 'stop',
  },
  {
    id: 'pl-oslob',
    name: 'Námestie osloboditeľov',
    subtitle: 'Dolná brána · Košice',
    location: { latitude: 48.717039, longitude: 21.260804 },
    nearestStopId: 's-namestie-osloboditelov', // Námestie osloboditeľov
    kind: 'poi',
  },
  {
    id: 'pl-optima',
    name: 'OC Optima',
    subtitle: 'Moldavská cesta 32',
    location: { latitude: 48.696017, longitude: 21.236224 },
    nearestStopId: 's-oc-optima', // OC Optima
    kind: 'poi',
  },
  {
    id: 'pl-letisko',
    name: 'Letisko Košice',
    subtitle: 'Medzinárodné letisko · 5 km',
    location: { latitude: 48.67316, longitude: 21.23691 },
    nearestStopId: 's-letisko', // Letisko
    kind: 'poi',
  },
  {
    id: 'pl-terasa',
    name: 'Terasa',
    subtitle: 'Sídlisko · Trieda SNP',
    location: { latitude: 48.705647, longitude: 21.2418 },
    nearestStopId: 's-kruhovy-objazd-trieda-snp', // Kruhový objazd, Trieda SNP
    kind: 'address',
  },
  {
    id: 'pl-tahanovce',
    name: 'Sídlisko Ťahanovce',
    subtitle: 'Americká trieda',
    location: { latitude: 48.76088, longitude: 21.27028 },
    nearestStopId: 's-hanojska', // Hanojská
    kind: 'address',
  },
  {
    id: 'pl-jazero',
    name: 'Nad jazerom',
    subtitle: 'Sídlisko Nad jazerom',
    location: { latitude: 48.690293, longitude: 21.279573 },
    nearestStopId: 's-levocska', // Levočská
    kind: 'address',
  },
  {
    id: 'pl-furca',
    name: 'Furča',
    subtitle: 'Sídlisko Dargovských hrdinov',
    location: { latitude: 48.730142, longitude: 21.290007 },
    nearestStopId: 's-dargovskych-hrdinov-miestny-urad', // Dargovských hrdinov, miestny úrad
    kind: 'address',
  },
  {
    id: 'pl-kvp',
    name: 'KVP',
    subtitle: 'Sídlisko KVP',
    location: { latitude: 48.711626, longitude: 21.208826 },
    nearestStopId: 's-klimkovicova', // Klimkovičova
    kind: 'address',
  },
  {
    id: 'pl-divadlo',
    name: 'Štátne divadlo Košice',
    subtitle: 'Hlavná 58',
    location: { latitude: 48.72484, longitude: 21.260365 },
    nearestStopId: 's-vodna', // Vodná
    kind: 'poi',
  },
  {
    id: 'pl-unlp',
    name: 'UNLP Rastislavova',
    subtitle: 'Univerzitná nemocnica · Košice',
    location: { latitude: 48.722012, longitude: 21.234997 },
    nearestStopId: 's-nova-nemocnica', // Nová nemocnica (najbližšia zastávka)
    kind: 'poi',
  },
  {
    id: 'pl-werferova',
    name: 'Werferova',
    subtitle: 'Business Centrum · Košice',
    location: { latitude: 48.716938, longitude: 21.249916 },
    nearestStopId: 's-krajsky-sud', // Krajský súd (najbližšia zastávka)
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
    (p) => p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q),
  );
}
