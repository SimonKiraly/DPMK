import { ubian } from '@/constants/config';
import type {
  Departure,
  DelayStatus,
  LatLng,
  NearbyStop,
  Place,
  Stop,
  TransportMode,
  Vehicle,
  VehicleDetail,
  VehicleTimelineEntry,
} from '@/types';
import { bearingDeg, haversineMeters } from '@/utils/geo';

/**
 * Provider-specific client for the Ubian departure-board API used by
 * https://dpmk-odchody.ubian.sk (DPMK Košice). Public, unauthenticated JSON.
 * Isolated here — the rest of the app only ever talks to `transportService`.
 *
 * See docs/TRANSPORT-DATA-SOURCE.md for endpoint documentation, licensing and
 * the required production architecture (backend proxy).
 */

/* -------------------------------------------------------------- raw responses */

interface UbianEnvelope {
  status: 'ok' | 'error';
  error_message?: string;
}

interface UbianLine {
  lineID: number;
  line: string;
  lineNumber: number;
  lineName: string;
  ezLineType: string; // "tram" | "bus" | "train" | "trolleybus" | …
  ezVehicleType: string; // "TRAM" | "BUS" | …
  firmaID: number;
  ezIsUrban?: boolean;
  ezIsTrain?: boolean;
}

interface UbianTrip {
  tripID: number;
  destinationStopName: string;
  destinationCityName?: string;
  ezTripDirection: 'there' | 'back' | string;
  lowFloor: boolean;
  canceled: boolean;
  messages?: string;
  operatorID?: number;
  operatorName?: string;
  timeTableLine: UbianLine;
}

interface UbianPlatform {
  platformNumber: number;
  latitude: number | null;
  longitude: number | null;
  platformName: string;
}

interface UbianStop {
  stopID: number;
  stopName: string;
  stopCity: string;
  latitude: number | null;
  longitude: number | null;
  forUrbanPublicTransport: boolean;
  forBusTransport: boolean;
  forRail: boolean;
  platforms: UbianPlatform[];
  ezLines: string[];
  passingLines?: Record<string, { lineType: string; lines: string[] }[]>;
}

interface UbianVehicleRaw {
  vehicleID: number;
  delayMinutes: number;
  latitude: number;
  longitude: number;
  lastStopOrder: number;
  isOnStop: boolean;
  tooltip: string;
  timeTableTrip: UbianTrip;
}

interface UbianDepartureRaw {
  timeTableTrip: UbianTrip;
  plannedDepartureTimestamp: number; // unix seconds
  delayMinutes: number;
  platformNumber: number;
  plannedOrRealVehicleID: number | null;
}

interface UbianTripStop {
  stopOrder: number;
  stopID: number;
  stopName: string;
  latitude: number;
  longitude: number;
  plannedDepartureTimestamp: number;
}

interface UbianAutocompleteResult {
  id: number;
  stopName: string;
  stopCity: string;
  type: string; // "stop" | "city" | "address" | …
  transportType: string; // "urban" | "bus" | "train"
  region?: string;
  slug?: string;
}

/* ------------------------------------------------------------------ http core */

class UbianError extends Error {}

function buildQuery(params: Record<string, string | number | (string | number)[]>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${encodeURIComponent(k)}[]=${encodeURIComponent(String(item))}`);
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

async function get<T extends UbianEnvelope>(
  path: string,
  params: Record<string, string | number | (string | number)[]> = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ubian.requestTimeoutMs);
  try {
    const res = await fetch(`${ubian.baseUrl}${path}${buildQuery(params)}`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      signal: controller.signal,
    });
    if (!res.ok) throw new UbianError(`HTTP ${res.status}`);
    const json = (await res.json()) as T;
    if (json.status !== 'ok') throw new UbianError(json.error_message ?? 'status != ok');
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- tiny cache */

const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/* ---------------------------------------------------------------- mappers */

function toMode(line: UbianLine): TransportMode {
  const t = (line.ezLineType || '').toLowerCase();
  const vt = (line.ezVehicleType || '').toLowerCase();
  if (t.includes('tram') || vt.includes('tram')) return 'tram';
  if (t.includes('trol') || vt.includes('trol')) return 'trolleybus';
  if (t.includes('train') || t.includes('rail') || line.ezIsTrain) return 'rail';
  if (/^n/i.test(line.line)) return 'night';
  return 'bus';
}

function delayStatus(minutes: number): DelayStatus {
  const m = Math.round(minutes);
  if (m <= 0) return { minutes: 0, label: 'Načas', onTime: true };
  return { minutes: m, label: `+${m} min`, onTime: false };
}

function stopLocation(s: UbianStop): LatLng {
  if (s.latitude != null && s.longitude != null) return { latitude: s.latitude, longitude: s.longitude };
  const pts = s.platforms.filter((p) => p.latitude != null && p.longitude != null);
  if (pts.length === 0) return { latitude: 0, longitude: 0 };
  return {
    latitude: pts.reduce((a, p) => a + (p.latitude as number), 0) / pts.length,
    longitude: pts.reduce((a, p) => a + (p.longitude as number), 0) / pts.length,
  };
}

function stopMode(s: UbianStop): TransportMode {
  if (s.forRail) return 'rail';
  const lineTypes = Object.values(s.passingLines ?? {}).flat().map((x) => x.lineType);
  if (lineTypes.some((t) => t.includes('tram'))) return 'tram';
  if (lineTypes.some((t) => t.includes('trol'))) return 'trolleybus';
  return 'bus';
}

function mapStop(s: UbianStop): Stop {
  return {
    id: `u${s.stopID}`,
    name: s.stopName.replace(/\s+/g, ' ').trim(),
    mode: stopMode(s),
    location: stopLocation(s),
    // Drop 6-digit regional-bus internal codes — keep MHD-style labels ("12", "N2", "R1").
    lines: (s.ezLines ?? []).filter((l) => l.length <= 4 && !/^\d{5,}$/.test(l)),
    zone: 1,
  };
}

function mapDeparture(d: UbianDepartureRaw): Departure {
  const line = d.timeTableTrip.timeTableLine;
  const timeMs = d.plannedDepartureTimestamp * 1000 + d.delayMinutes * 60000;
  return {
    routeShortName: line.line,
    mode: toMode(line),
    headsign: d.timeTableTrip.destinationStopName,
    time: new Date(timeMs).toISOString(),
    inMinutes: Math.max(0, Math.round((timeMs - Date.now()) / 60000)),
    realtime: d.plannedOrRealVehicleID != null || d.delayMinutes !== 0,
    delay: delayStatus(d.delayMinutes),
  };
}

/** Last known position per vehicle, to derive a heading. */
const lastPos = new Map<number, LatLng>();

function mapVehicle(v: UbianVehicleRaw): Vehicle {
  const line = v.timeTableTrip.timeTableLine;
  const location = { latitude: v.latitude, longitude: v.longitude };
  const prev = lastPos.get(v.vehicleID);
  const bearing =
    prev && (prev.latitude !== location.latitude || prev.longitude !== location.longitude)
      ? bearingDeg(prev, location)
      : 0;
  lastPos.set(v.vehicleID, location);

  return {
    id: `u_${v.vehicleID}`,
    routeShortName: line.line,
    routeId: `ubian_${line.lineID}`,
    mode: toMode(line),
    headsign: v.timeTableTrip.destinationStopName,
    direction: v.timeTableTrip.ezTripDirection === 'back' ? 1 : 0,
    location,
    bearing,
    progress: 0,
    nextStopId: '',
    nextStopName: '',
    etaNextStopMinutes: 0,
    occupancy: 'quiet', // not provided by the feed
    delay: delayStatus(v.delayMinutes),
    lowFloor: v.timeTableTrip.lowFloor,
    plate: String(v.vehicleID),
    source: 'live',
    tripId: String(v.timeTableTrip.tripID),
    operatorId: v.timeTableTrip.operatorID ?? line.firmaID,
    atStop: v.isOnStop,
    lastStopOrder: v.lastStopOrder,
  };
}

/* ---------------------------------------------------------------- public API */

export const ubianService = {
  async getNearbyStops(
    origin: LatLng,
    opts: { limit?: number; maxMeters?: number; withDepartures?: number } = {},
  ): Promise<NearbyStop[]> {
    const { limit = 8, maxMeters = 2500, withDepartures = 6 } = opts;
    const key = `nearby:${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}:${maxMeters}`;
    const json = await cached(key, ubian.cacheTtlMs.stops, () =>
      get<UbianEnvelope & { stops: UbianStop[] }>('/navigation/stops/nearby', {
        lat: origin.latitude,
        lng: origin.longitude,
        radius: maxMeters,
      }),
    );

    const stops = (json.stops ?? [])
      // MHD focus: urban transport + rail; skip pure regional-bus stops.
      .filter((s) => s.forUrbanPublicTransport || s.forRail)
      .map((s) => {
        const stop = mapStop(s);
        const distanceMeters = haversineMeters(origin, stop.location);
        return {
          stop,
          rawId: s.stopID,
          distanceMeters,
          walkMinutes: Math.max(1, Math.round(distanceMeters / 80)),
          departures: [] as Departure[],
        };
      })
      .filter((n) => n.distanceMeters <= maxMeters && n.stop.location.latitude !== 0)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, limit);

    await Promise.all(
      stops.slice(0, withDepartures).map(async (n) => {
        try {
          n.departures = await this.getStopDepartures(n.rawId, 4);
        } catch {
          /* leave empty */
        }
      }),
    );

    return stops.map(({ rawId: _rawId, ...n }) => n);
  },

  async getStopById(rawStopId: number): Promise<Stop | null> {
    const json = await cached(`stop:${rawStopId}`, ubian.cacheTtlMs.stopDetail, () =>
      get<UbianEnvelope & { stops: UbianStop[] }>('/navigation/stops/ids', { ids: [rawStopId] }),
    );
    const s = (json.stops ?? [])[0];
    return s ? mapStop(s) : null;
  },

  async getStopDepartures(rawStopId: number, limit = 12): Promise<Departure[]> {
    const json = await cached(`dep:${rawStopId}`, ubian.cacheTtlMs.departures, () =>
      get<UbianEnvelope & { departures: UbianDepartureRaw[] }>('/navigation/stops/planned_departures', {
        stopID: rawStopId,
      }),
    );
    return (json.departures ?? [])
      .map(mapDeparture)
      .sort((a, b) => a.inMinutes - b.inMinutes)
      .slice(0, limit);
  },

  async getStopDetail(rawStopId: number): Promise<{ stop: Stop; departures: Departure[] } | null> {
    const [stop, departures] = await Promise.all([
      this.getStopById(rawStopId),
      this.getStopDepartures(rawStopId, 16).catch(() => [] as Departure[]),
    ]);
    return stop ? { stop, departures } : null;
  },

  async getVehicles(center: LatLng, radiusMeters: number): Promise<Vehicle[]> {
    const json = await cached('vehicles', ubian.cacheTtlMs.vehicles, () =>
      get<UbianEnvelope & { vehicles: UbianVehicleRaw[] }>('/navigation/vehicles/nearby', {
        lat: center.latitude,
        lng: center.longitude,
        radius: radiusMeters,
      }),
    );
    return (json.vehicles ?? [])
      .filter((v) => !v.timeTableTrip?.canceled && v.latitude && v.longitude)
      .map(mapVehicle);
  },

  async getTripStops(rawTripId: number): Promise<UbianTripStop[]> {
    const json = await cached(`trip:${rawTripId}`, ubian.cacheTtlMs.tripStops, () =>
      get<UbianEnvelope & { tripStops: UbianTripStop[] }>('/navigation/vehicles/trip_stops', {
        tripID: rawTripId,
      }),
    );
    return json.tripStops ?? [];
  },

  /** Enrich a live vehicle with its stop timeline. */
  async getVehicleDetail(vehicle: Vehicle): Promise<VehicleDetail> {
    if (!vehicle.tripId) return { ...vehicle, timeline: [] };
    let tripStops: UbianTripStop[] = [];
    try {
      tripStops = await this.getTripStops(Number(vehicle.tripId));
    } catch {
      return { ...vehicle, timeline: [] };
    }

    const passedCount = tripStops.filter((s) => s.stopOrder <= (vehicle.lastStopOrder ?? 0)).length;
    const now = Date.now();

    const timeline: VehicleTimelineEntry[] = tripStops.map((s, i) => {
      let state: VehicleTimelineEntry['state'];
      if (i < passedCount - 1) state = 'passed';
      else if (i === passedCount - 1 || i === passedCount) state = i === tripStops.length - 1 ? 'terminus' : 'current';
      else if (i === tripStops.length - 1) state = 'terminus';
      else state = 'upcoming';
      return {
        stopId: `u${s.stopID}`,
        name: s.stopName,
        time: new Date(s.plannedDepartureTimestamp * 1000 + vehicle.delay.minutes * 60000).toISOString(),
        state,
      };
    });

    const nextStop = tripStops[passedCount] ?? tripStops[tripStops.length - 1];
    const etaMs = nextStop
      ? nextStop.plannedDepartureTimestamp * 1000 + vehicle.delay.minutes * 60000 - now
      : 0;

    return {
      ...vehicle,
      nextStopId: nextStop ? `u${nextStop.stopID}` : '',
      nextStopName: nextStop?.stopName ?? '',
      etaNextStopMinutes: Math.max(1, Math.round(etaMs / 60000)),
      timeline,
    };
  },

  async searchPlaces(query: string): Promise<Place[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const json = await cached(`ac:${q.toLowerCase()}`, ubian.cacheTtlMs.search, () =>
      get<UbianEnvelope & { results: UbianAutocompleteResult[] }>('/navigation/autocomplete', { query: q }),
    );
    return (json.results ?? [])
      .filter((r) => r.type === 'stop' && (r.stopCity === 'Košice' || r.region === 'Košice'))
      .slice(0, 8)
      .map((r) => ({
        id: `u${r.id}`,
        name: r.stopName,
        subtitle: `${r.stopCity} · MHD zastávka`,
        location: { latitude: 0, longitude: 0 }, // filled from getStopById when selected
        nearestStopId: `u${r.id}`,
        kind: 'stop' as const,
      }));
  },

  /** Numeric provider stop id from our prefixed id ("u123" -> 123). */
  rawStopId(id: string): number {
    return Number(id.replace(/^u/, ''));
  },
};
