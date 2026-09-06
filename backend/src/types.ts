/**
 * App-facing DTOs served by this backend.
 *
 * These are a verbatim copy of the subset of `src/types/index.ts` in the mobile
 * app that crosses the wire — keep them in sync (or promote to a shared package)
 * when the app is migrated. Shapes are unchanged so `transportService` can point
 * at this backend with no UI changes.
 */

export type LatLng = { latitude: number; longitude: number };

/** Košice MHD runs buses and trams, plus a night service band. No trolleybus, no rail. */
export type TransportMode = 'bus' | 'tram' | 'night';

export type Occupancy = 'quiet' | 'busy' | 'full';

export type DelayStatus = {
  /** Minutes ahead(-) / behind(+) schedule. 0 = on time. */
  minutes: number;
  label: string;
  onTime: boolean;
};

export interface Stop {
  id: string;
  name: string;
  platform?: string;
  mode: TransportMode;
  location: LatLng;
  lines: string[];
  zone: 1 | 2;
}

export interface TransitRoute {
  id: string;
  shortName: string;
  mode: TransportMode;
  headsigns: [string, string];
  stopIds: string[];
  color?: string;
  night?: boolean;
}

export interface NearbyStop {
  stop: Stop;
  distanceMeters: number;
  walkMinutes: number;
  departures: Departure[];
}

export interface Departure {
  routeShortName: string;
  mode: TransportMode;
  headsign: string;
  time: string;
  inMinutes: number;
  realtime: boolean;
  delay: DelayStatus;
}

export interface Vehicle {
  id: string;
  routeShortName: string;
  routeId: string;
  mode: TransportMode;
  headsign: string;
  direction: 0 | 1;
  location: LatLng;
  bearing: number;
  progress: number;
  nextStopId: string;
  nextStopName: string;
  etaNextStopMinutes: number;
  occupancy: Occupancy;
  delay: DelayStatus;
  lowFloor: boolean;
  plate: string;
  source?: 'sim' | 'live';
  tripId?: string;
  operatorId?: number;
  atStop?: boolean;
  lastStopOrder?: number;
}

export interface VehicleDetail extends Vehicle {
  timeline: VehicleTimelineEntry[];
}

export interface VehicleTimelineEntry {
  stopId: string;
  name: string;
  platform?: string;
  time: string;
  state: 'passed' | 'current' | 'upcoming' | 'terminus';
}

export interface Place {
  id: string;
  name: string;
  subtitle: string;
  location: LatLng;
  nearestStopId: string;
  kind: 'poi' | 'address' | 'stop' | 'home' | 'work';
}

/* ---------------------------------------------------- backend-specific shapes */

/** Route corridor for the map layer (stop-chain polyline). */
export interface RouteShape {
  routeId: string;
  shortName: string;
  mode: TransportMode;
  points: LatLng[];
}

/** `GET /api/network` payload — the static DPMK network. */
export interface NetworkPayload {
  meta: {
    source: string;
    section: string;
    validFrom: string;
    extractedAt: string;
    routes: number;
    stops: number;
  };
  routes: TransitRoute[];
  stops: Stop[];
  shapes: RouteShape[];
}

/** Latest known MHD fleet + freshness. */
export interface FleetSnapshot {
  vehicles: Vehicle[];
  /** ISO time the vehicle list was last successfully refreshed. */
  updatedAt: string | null;
  /** Age of `updatedAt` in ms (Infinity before the first success). */
  ageMs: number;
  /** True when the data is older than the staleness threshold. */
  stale: boolean;
  /** True before the poller has ever succeeded. */
  warmingUp: boolean;
  /** Last upstream error message, if the most recent poll failed. */
  lastError: string | null;
}
