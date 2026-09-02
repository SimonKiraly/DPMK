import type { LatLng } from '@/types';

/**
 * A finite number inside `[lo, hi]`. Rejects `NaN`, `±Infinity`, `null`,
 * `undefined`, booleans and numeric strings (`typeof` guards the last three).
 */
function inRange(value: unknown, lo: number, hi: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= lo && value <= hi;
}

/** True when `value` is a usable geographic coordinate for a map overlay. */
export function isValidLatLng(value: unknown): value is LatLng {
  if (value == null || typeof value !== 'object') return false;
  const { latitude, longitude } = value as Record<string, unknown>;
  return inRange(latitude, -90, 90) && inRange(longitude, -180, 180);
}

/** `[0, 0]` (null island) is valid latitude/longitude but never a real fix here. */
export function isRealLatLng(value: unknown): value is LatLng {
  return isValidLatLng(value) && (value.latitude !== 0 || value.longitude !== 0);
}

/** Narrowing predicate for `array.filter(...)` over anything carrying a `location`. */
export function hasValidCoordinates<T extends { location?: unknown }>(
  item: T | null | undefined,
): item is T & { location: LatLng } {
  return item != null && isRealLatLng((item as { location?: unknown }).location);
}

/** Keep only the valid points of a polyline / path. */
export function sanitizePath(points: readonly unknown[] | null | undefined): LatLng[] {
  if (!Array.isArray(points)) return [];
  return points.filter(isValidLatLng);
}
