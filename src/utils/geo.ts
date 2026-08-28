import type { LatLng } from '@/types';

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
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Linear interpolation between two coordinates, t in 0..1. */
export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

/** Total length (metres) of a polyline plus per-segment cumulative lengths. */
export function polylineMetrics(points: LatLng[]): { total: number; cumulative: number[] } {
  const cumulative = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
    cumulative.push(total);
  }
  return { total, cumulative };
}

/** Point at fractional distance `t` (0..1) along a polyline. */
export function pointAlongPolyline(points: LatLng[], t: number): { point: LatLng; bearing: number } {
  if (points.length === 0) return { point: { latitude: 0, longitude: 0 }, bearing: 0 };
  if (points.length === 1) return { point: points[0], bearing: 0 };
  const { total, cumulative } = polylineMetrics(points);
  const target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < points.length; i += 1) {
    if (cumulative[i] >= target || i === points.length - 1) {
      const segLen = cumulative[i] - cumulative[i - 1] || 1;
      const local = (target - cumulative[i - 1]) / segLen;
      return {
        point: lerpLatLng(points[i - 1], points[i], local),
        bearing: bearingDeg(points[i - 1], points[i]),
      };
    }
  }
  return { point: points[points.length - 1], bearing: 0 };
}
