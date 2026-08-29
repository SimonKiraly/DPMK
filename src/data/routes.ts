import type { TransitRoute, TransportMode } from '@/types';
import { colors } from '@/constants/theme';
import { DPMK_ROUTES } from '@/data/dpmkNetwork';

/**
 * MHD Košice line network — adapter over the official DPMK route sheet in
 * `data/dpmkNetwork.ts` (valid from 1. 7. 2026).
 *
 * `ROUTES` gives one entry per line for list/detail screens and the schematic
 * map. `ROUTE_PATTERNS` keeps every DPMK direction as its own stop sequence —
 * the journey planner and the mock departure board iterate those so the reverse
 * direction is never assumed to be the mirror image of the forward one.
 */

const COLOR_BY_TYPE: Record<TransportMode, string | undefined> = {
  tram: colors.accentDeep,
  bus: colors.primary,
  night: colors.textSecondary,
  trolleybus: colors.primary,
  rail: colors.primaryTint,
};

export interface RoutePattern {
  /** DPMK direction id. */
  id: string;
  routeId: string;
  shortName: string;
  mode: TransportMode;
  headsign: string;
  /** Ordered stop ids for this direction, exactly as published. */
  stopIds: string[];
}

export const ROUTE_PATTERNS: RoutePattern[] = DPMK_ROUTES.flatMap((r) =>
  r.directions.map((d) => ({
    id: d.id,
    routeId: r.id,
    shortName: r.number,
    mode: r.transportType,
    headsign: d.destination,
    stopIds: d.stops.map((s) => s.id),
  })),
);

export const ROUTES: TransitRoute[] = DPMK_ROUTES.map((r) => {
  const outbound = r.directions[0];
  const inbound = r.directions[1] ?? r.directions[0];
  return {
    id: r.id,
    shortName: r.number,
    mode: r.transportType,
    headsigns: [outbound.destination, inbound.destination] as [string, string],
    stopIds: outbound.stops.map((s) => s.id),
    color: COLOR_BY_TYPE[r.transportType],
    night: r.transportType === 'night',
  };
});

export const ROUTE_BY_SHORT_NAME: Record<string, TransitRoute> = Object.fromEntries(
  ROUTES.map((r) => [r.shortName, r]),
);
export const ROUTE_BY_ID: Record<string, TransitRoute> = Object.fromEntries(
  ROUTES.map((r) => [r.id, r]),
);

export const PATTERNS_BY_SHORT_NAME: Record<string, RoutePattern[]> = ROUTE_PATTERNS.reduce(
  (acc, p) => {
    (acc[p.shortName] ??= []).push(p);
    return acc;
  },
  {} as Record<string, RoutePattern[]>,
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
