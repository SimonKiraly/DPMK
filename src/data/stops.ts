import type { Stop, TransportMode } from '@/types';
import { DPMK_ROUTES, DPMK_STOPS } from '@/data/dpmkNetwork';

/**
 * MHD Košice stop inventory — adapter over the official DPMK network in
 * `data/dpmkNetwork.ts`. The `Stop` shape stays GTFS-ish so the rest of the app
 * is unaffected. A handful of freight-only U. S. Steel sidings have no public
 * coordinate; they keep {0,0} and are excluded from map rendering via
 * `MAPPABLE_STOPS` / `hasLocation`.
 */

const MODE_BY_LINE: Record<string, TransportMode> = {};
for (const r of DPMK_ROUTES) MODE_BY_LINE[r.number] = r.transportType;

function stopMode(lines: string[]): TransportMode {
  if (lines.some((l) => MODE_BY_LINE[l] === 'tram')) return 'tram';
  if (lines.length > 0 && lines.every((l) => MODE_BY_LINE[l] === 'night')) return 'night';
  return 'bus';
}

export const STOPS: Stop[] = DPMK_STOPS.map((s) => ({
  id: s.id,
  name: s.name,
  mode: stopMode(s.lines),
  location: { latitude: s.latitude ?? 0, longitude: s.longitude ?? 0 },
  lines: s.lines,
  zone: 1,
}));

export const STOP_BY_ID: Record<string, Stop> = Object.fromEntries(
  STOPS.map((s) => [s.id, s]),
);

export function getStop(id: string): Stop | undefined {
  return STOP_BY_ID[id];
}

export function stopLabel(stop: Stop): string {
  return stop.platform ? `${stop.name}, ${stop.platform}` : stop.name;
}

/** True when the stop has a verified coordinate (not the {0,0} sentinel). */
export function hasLocation(stop: Stop): boolean {
  return stop.location.latitude !== 0 || stop.location.longitude !== 0;
}

/** Stops safe to project onto the schematic map. */
export const MAPPABLE_STOPS: Stop[] = STOPS.filter(hasLocation);
