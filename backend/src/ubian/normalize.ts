/**
 * Raw Ubian → app DTOs. Port of the `ubianService.ts` mappers
 * (`mapVehicle`, `mapStop`, `mapDeparture`, `mhdLineLabels`, `stopLocation`,
 * `stopMode`, `delayStatus`, the vehicle-detail timeline builder).
 *
 * The MHD filter (`toMhdMode`) is applied here, so nothing downstream ever sees
 * a non-MHD vehicle / departure. `mapVehicle` is pure — the caller passes the
 * previous position for the vehicle so bearing can be derived from the delta
 * (the feed has no heading field).
 */
import type {
  Departure,
  DelayStatus,
  LatLng,
  NearbyStop,
  Place,
  Stop,
  Vehicle,
  VehicleDetail,
  VehicleTimelineEntry,
} from '../types.js';
import { bearingDeg, haversineMeters } from '../lib/geo.js';
import { toMhdMode } from './mhdFilter.js';
import type {
  UbianAutocompleteResult,
  UbianDepartureRaw,
  UbianStop,
  UbianTripStop,
  UbianVehicleRaw,
} from './types.js';

export function delayStatus(minutes: number): DelayStatus {
  const m = Math.round(minutes);
  if (m <= 0) return { minutes: 0, label: 'Načas', onTime: true };
  return { minutes: m, label: `+${m} min`, onTime: false };
}

/**
 * MHD Košice line labels from an Ubian `ezLines` array — keeps only real MHD
 * codes (`1`–`99` + suffix, `N1`–`N9`, `R1`–`R9`, `RA1`–`RA9`, `s1`/`s2`, `X`,
 * `XR`), dropping the `"- "` placeholder, 6-digit regional codes and rail labels.
 */
export function mhdLineLabels(ezLines: string[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of ezLines ?? []) {
    const l = String(raw).trim();
    if (!/^(\d{1,2}[a-zč]?|N\d{1,2}|RA?\d{1,2}|s[12]|X\d?|XR)$/i.test(l)) continue;
    if (!out.includes(l)) out.push(l);
  }
  return out;
}

function stopLocation(s: UbianStop): LatLng {
  if (s.latitude != null && s.longitude != null) {
    return { latitude: s.latitude, longitude: s.longitude };
  }
  const pts = s.platforms.filter((p) => p.latitude != null && p.longitude != null);
  if (pts.length === 0) return { latitude: 0, longitude: 0 };
  return {
    latitude: pts.reduce((a, p) => a + (p.latitude as number), 0) / pts.length,
    longitude: pts.reduce((a, p) => a + (p.longitude as number), 0) / pts.length,
  };
}

function stopMode(s: UbianStop): 'tram' | 'bus' {
  const lineTypes = Object.values(s.passingLines ?? {})
    .flat()
    .map((x) => x.lineType);
  if (lineTypes.some((t) => t.includes('tram'))) return 'tram';
  return 'bus';
}

export function mapStop(s: UbianStop): Stop {
  return {
    id: `u${s.stopID}`,
    name: s.stopName.replace(/\s+/g, ' ').trim(),
    mode: stopMode(s),
    location: stopLocation(s),
    lines: mhdLineLabels(s.ezLines),
    zone: 1,
  };
}

export function mapDeparture(d: UbianDepartureRaw, now = Date.now()): Departure | null {
  const line = d.timeTableTrip.timeTableLine;
  const mode = toMhdMode(line);
  if (mode === null) return null; // non-MHD (regional / suburban / rail)
  const timeMs = d.plannedDepartureTimestamp * 1000 + d.delayMinutes * 60000;
  return {
    routeShortName: line.line,
    mode,
    headsign: d.timeTableTrip.destinationStopName,
    time: new Date(timeMs).toISOString(),
    inMinutes: Math.max(0, Math.round((timeMs - now) / 60000)),
    realtime: d.plannedOrRealVehicleID != null || d.delayMinutes !== 0,
    delay: delayStatus(d.delayMinutes),
  };
}

export function mapDepartures(list: UbianDepartureRaw[], limit: number, now = Date.now()): Departure[] {
  return list
    .map((d) => mapDeparture(d, now))
    .filter((d): d is Departure => d !== null)
    .sort((a, b) => a.inMinutes - b.inMinutes)
    .slice(0, limit);
}

/**
 * One raw vehicle → app `Vehicle`, or `null` when it is not Košice MHD or has no
 * usable position. `prev` is this vehicle from the previous poll (or undefined).
 *
 * Bearing: the feed has no heading field, so it is the great-circle heading of
 * the move since the previous poll. Ubian only refreshes positions in bursts
 * (~every 50 s), so most polls see an unchanged position — in that case the
 * previous bearing is **retained** (a standing bus still faces a direction);
 * it is only 0 for a vehicle that has never been seen to move.
 */
export function mapVehicle(v: UbianVehicleRaw, prev?: Vehicle): Vehicle | null {
  if (v.timeTableTrip?.canceled) return null;
  if (!v.latitude || !v.longitude) return null;

  const line = v.timeTableTrip.timeTableLine;
  const mode = toMhdMode(line);
  if (mode === null) return null; // non-MHD — never exposed

  const location: LatLng = { latitude: v.latitude, longitude: v.longitude };
  const moved =
    prev != null &&
    (prev.location.latitude !== location.latitude ||
      prev.location.longitude !== location.longitude);
  const bearing = moved ? bearingDeg(prev.location, location) : prev?.bearing ?? 0;

  return {
    id: `u_${v.vehicleID}`,
    routeShortName: line.line,
    routeId: `ubian_${line.lineID}`,
    mode,
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

export interface NormalizeVehiclesResult {
  vehicles: Vehicle[];
  /** Total raw entries received from Ubian (post JSON parse). */
  rawCount: number;
  /** Raw entries with a usable position and a non-canceled trip. */
  candidateCount: number;
  /** How many of the candidates were dropped as non-MHD. */
  droppedNonMhd: number;
  /** Duplicate `vehicleID` rows collapsed. */
  droppedDuplicate: number;
}

/**
 * Full fleet transform: filter → normalize → **dedupe by vehicleID** (keep first).
 * `prevById` maps `Vehicle.id` → the vehicle from the previous poll (position +
 * last bearing), used to derive/retain heading.
 */
export function normalizeVehicles(
  raw: UbianVehicleRaw[],
  prevById: Map<string, Vehicle> = new Map(),
): NormalizeVehiclesResult {
  const seen = new Set<string>();
  const vehicles: Vehicle[] = [];
  let candidateCount = 0;
  let droppedNonMhd = 0;
  let droppedDuplicate = 0;

  for (const v of raw) {
    const hasPosition = !v.timeTableTrip?.canceled && !!v.latitude && !!v.longitude;
    if (!hasPosition) continue;
    candidateCount += 1;

    const id = `u_${v.vehicleID}`;
    const mapped = mapVehicle(v, prevById.get(id));
    if (!mapped) {
      droppedNonMhd += 1;
      continue;
    }
    if (seen.has(mapped.id)) {
      droppedDuplicate += 1;
      continue;
    }
    seen.add(mapped.id);
    vehicles.push(mapped);
  }

  return {
    vehicles,
    rawCount: raw.length,
    candidateCount,
    droppedNonMhd,
    droppedDuplicate,
  };
}

/* ---------------------------------------------------------------- nearby stops */

export function normalizeNearbyStops(
  raw: UbianStop[],
  origin: LatLng,
  maxMeters: number,
  limit: number,
): { stop: Stop; rawId: number; distanceMeters: number; walkMinutes: number; departures: Departure[] }[] {
  return (raw ?? [])
    // Keep every DPMK-served stop; drop rail-only / regional-bus-only stops.
    .filter((s) => s.forUrbanPublicTransport)
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
}

export function stripRawId(
  n: { stop: Stop; distanceMeters: number; walkMinutes: number; departures: Departure[] },
): NearbyStop {
  return {
    stop: n.stop,
    distanceMeters: n.distanceMeters,
    walkMinutes: n.walkMinutes,
    departures: n.departures,
  };
}

/* -------------------------------------------------------------- vehicle detail */

export function buildTimeline(
  vehicle: Vehicle,
  tripStops: UbianTripStop[],
  now = Date.now(),
): VehicleDetail {
  if (tripStops.length === 0) return { ...vehicle, timeline: [] };

  const passedCount = tripStops.filter(
    (s) => s.stopOrder <= (vehicle.lastStopOrder ?? 0),
  ).length;

  const timeline: VehicleTimelineEntry[] = tripStops.map((s, i) => {
    let state: VehicleTimelineEntry['state'];
    if (i < passedCount - 1) state = 'passed';
    else if (i === passedCount - 1 || i === passedCount) {
      state = i === tripStops.length - 1 ? 'terminus' : 'current';
    } else if (i === tripStops.length - 1) state = 'terminus';
    else state = 'upcoming';
    return {
      stopId: `u${s.stopID}`,
      name: s.stopName,
      time: new Date(
        s.plannedDepartureTimestamp * 1000 + vehicle.delay.minutes * 60000,
      ).toISOString(),
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
}

/* -------------------------------------------------------------------- search */

export function mapSearchResults(raw: UbianAutocompleteResult[]): Place[] {
  return (raw ?? [])
    .filter(
      (r) =>
        r.type === 'stop' &&
        r.transportType !== 'train' &&
        (r.stopCity === 'Košice' || r.region === 'Košice'),
    )
    .slice(0, 8)
    .map((r) => ({
      id: `u${r.id}`,
      name: r.stopName,
      subtitle: `${r.stopCity} · MHD zastávka`,
      location: { latitude: 0, longitude: 0 },
      nearestStopId: `u${r.id}`,
      kind: 'stop' as const,
    }));
}

/** Numeric provider stop id from our prefixed id ("u123" -> 123). */
export function rawStopId(id: string): number {
  return Number(id.replace(/^u/, ''));
}
