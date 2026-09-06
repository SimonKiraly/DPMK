/**
 * Geo helpers — verbatim port of the mobile app's `src/utils/geo.ts`
 * (`haversineMeters`, `bearingDeg`). Bearing is derived from consecutive
 * positions because the Ubian feed has no heading field.
 */
import type { LatLng } from '../types.js';

const R = 6371000; // earth radius, metres
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two coordinates. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing a -> b, degrees clockwise from north. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.cos(toRad(b.longitude - a.longitude));
  return (Math.atan2(y, x) * 180) / Math.PI;
}
