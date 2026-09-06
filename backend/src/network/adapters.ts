/**
 * Adapters over the static DPMK network (`network/dpmkNetwork.ts`) — the backend
 * equivalent of the app's `src/data/routes.ts` + `src/data/stops.ts` +
 * `transportService.getRouteShapes()`.
 *
 * Same transforms, same output shapes. The only change vs the app: `route.color`
 * uses inlined hex (the app imported them from its UI theme, which the backend
 * has no business depending on).
 */
import type {
  LatLng,
  NetworkPayload,
  RouteShape,
  Stop,
  TransitRoute,
  TransportMode,
} from '../types.js';
import {
  DPMK_NETWORK_META,
  DPMK_ROUTES,
  DPMK_STOPS,
  type DpmkTransportType,
} from './dpmkNetwork.js';

// from src/constants/theme.ts — accentDeep / primary / textSecondary
const COLOR_BY_TYPE: Record<TransportMode, string | undefined> = {
  tram: '#FFC721',
  bus: '#2B629E',
  night: '#6B7A90',
};

/* ---------------------------------------------------------------------- stops */

const MODE_BY_LINE: Record<string, DpmkTransportType> = {};
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
  zone: 1 as const,
}));

export const STOP_BY_ID: Record<string, Stop> = Object.fromEntries(
  STOPS.map((s) => [s.id, s]),
);

/* --------------------------------------------------------------------- routes */

export interface RoutePattern {
  id: string;
  routeId: string;
  shortName: string;
  mode: TransportMode;
  headsign: string;
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
  const outbound = r.directions[0]!;
  const inbound = r.directions[1] ?? r.directions[0]!;
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

/* ---------------------------------------------------------------- map shapes */

const hasCoord = (l: LatLng): boolean => l.latitude !== 0 || l.longitude !== 0;

/** Route corridor = the outbound direction's stop chain (coords only). */
export const ROUTE_SHAPES: RouteShape[] = ROUTES.map((r) => ({
  routeId: r.id,
  shortName: r.shortName,
  mode: r.mode,
  points: r.stopIds
    .map((id) => STOP_BY_ID[id]?.location)
    .filter((p): p is LatLng => p != null && hasCoord(p)),
})).filter((s) => s.points.length > 1);

/* -------------------------------------------------------------- api payload */

export const NETWORK_PAYLOAD: NetworkPayload = {
  meta: {
    source: DPMK_NETWORK_META.source,
    section: DPMK_NETWORK_META.section,
    validFrom: DPMK_NETWORK_META.validFrom,
    extractedAt: DPMK_NETWORK_META.extractedAt,
    routes: ROUTES.length,
    stops: STOPS.length,
  },
  routes: ROUTES,
  stops: STOPS,
  shapes: ROUTE_SHAPES,
};

/** Single-route detail for `GET /api/routes/:shortName`. */
export function routeDetail(shortName: string) {
  const route = getRoute(shortName);
  if (!route) return null;
  return {
    route,
    patterns: PATTERNS_BY_SHORT_NAME[shortName] ?? [],
    shape: ROUTE_SHAPES.find((s) => s.shortName === shortName) ?? null,
  };
}
