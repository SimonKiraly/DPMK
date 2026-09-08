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

/* -------------------------------------------------------------- service alerts */

/**
 * DPMK service-disruption alert, normalised from the official RSS feed
 * (`https://www.dpmk.sk/aktuality/rss`). Phase 0: Shape A ("MHD Aktuálne" short
 * operational notices) is fully parsed; planned notices are classified only.
 * Missing information is `null` / `[]` — never invented.
 */
export type AlertType =
  | 'connection_cancelled' // "VÝPADOK SPOJA 15"
  | 'delays' // "UPOZORNENIE NA MEŠKANIE SPOJOV"
  | 'planned' // route/stop changes, výluky, rekonštrukcie, events
  | 'other'; // classified but low confidence

export type AlertSeverity = 'info' | 'minor' | 'major' | 'severe';

export type AlertStatus = 'active' | 'upcoming' | 'ended';

export interface AlertStopRef {
  /** Resolved DPMK stop id (`s-…`). */
  id: string;
  /** Canonical DPMK stop name. */
  name: string;
  /** How the notice text matched: exact name/alias vs a fuzzy hit. */
  confidence: 'exact' | 'fuzzy';
}

/** One cancelled departure from a `VÝPADOK SPOJA` notice (`MIESTO:` / `ČAS:`). */
export interface CancelledDeparture {
  /** Line numbers from `DOTKNUTÉ LINKY:`, resolved to canonical short names. */
  routeShortNames: string[];
  /** Stop name exactly as written in the notice. */
  stopName: string;
  /** Resolved DPMK stop id, or `null` when no confident match. */
  stopId: string | null;
  /** Direction terminus from `… smer X`, verbatim, or `null`. */
  direction: string | null;
  /** Departure clock time `HH:MM` (Košice local), or `null`. */
  time: string | null;
}

export interface ServiceAlert {
  /** Stable id — the RSS `<guid>` (`"119534 at https://www.dpmk.sk"` → `119534`). */
  id: string;
  source: 'dpmk-rss';
  sourceUrl: string;
  /** RSS `<pubDate>` as ISO. */
  publishedAt: string;
  /** When the backend last (re)parsed this item. */
  updatedAt: string;
  /** First time the backend saw this guid. */
  firstSeenAt: string;
  /** Last poll in which this guid was present in the feed. */
  lastSeenInFeedAt: string;

  title: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;

  /** ISO start — for operational notices this is `publishedAt`; else `null`. */
  validFrom: string | null;
  /** ISO end when the notice states one (`PREDPOKLAD… HH:MM`); else `null`. */
  validTo: string | null;

  /** Canonical route short names, resolved against the 71-route network. */
  affectedRoutes: string[];
  /** Resolved stops, high-confidence only. */
  affectedStops: AlertStopRef[];

  /** Human-readable Slovak summary (rebuilt from parsed fields or cleaned prose). */
  description: string;
  /** `DÔVOD:` value, or `null`. */
  reason: string | null;
  /** Parsed cancelled departures (Shape A only). */
  cancelledDepartures: CancelledDeparture[];

  /** Original decoded feed text — always kept. */
  rawText: string;
  /** True when parsing/resolution was incomplete or low-confidence. */
  needsReview: boolean;
}

/** `GET /api/alerts` payload — mirrors `FleetSnapshot` freshness fields. */
export interface AlertsSnapshot {
  alerts: ServiceAlert[];
  count: number;
  updatedAt: string | null;
  ageMs: number;
  stale: boolean;
  warmingUp: boolean;
  lastError: string | null;
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
