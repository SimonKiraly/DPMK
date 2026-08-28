import { dataSource, simulation } from '@/constants/config';
import { PLACE_BY_ID } from '@/data/places';
import {
  ROUTES,
  ROUTE_BY_SHORT_NAME,
  getRoute,
  headwayMinutes,
} from '@/data/routes';
import { STOPS, STOP_BY_ID, getStop, stopLabel } from '@/data/stops';
import { VEHICLE_SEEDS, type VehicleSeed } from '@/data/vehicles';
import type {
  Departure,
  DelayStatus,
  Journey,
  JourneyLeg,
  JourneyPreference,
  LatLng,
  NearbyStop,
  Stop,
  TransitRoute,
  TransportMode,
  Vehicle,
  VehicleDetail,
  VehicleTimelineEntry,
} from '@/types';
import { haversineMeters, pointAlongPolyline } from '@/utils/geo';

/**
 * Transport data + live-vehicle simulation.
 *
 * This is the seam between the app and a real MHD Košice / IDS Východ feed.
 * Every public function returns the same shape a networked implementation
 * would; swap the bodies (guarded by `dataSource.useMockTransport`) for HTTP
 * calls and nothing in the UI changes.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------- deterministic rng */

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable 0..1 value for a given key. */
function seeded(key: string): number {
  return hashString(key) / 0xffffffff;
}

/* --------------------------------------------------------------------- helpers */

function delayStatus(minutes: number): DelayStatus {
  const rounded = Math.round(minutes);
  if (rounded <= 0) return { minutes: 0, label: 'Načas', onTime: true };
  return { minutes: rounded, label: `+${rounded} min`, onTime: false };
}

/** Stops of a route in travel order for the given direction. */
function routeStops(route: TransitRoute, direction: 0 | 1): Stop[] {
  const ids = direction === 0 ? route.stopIds : [...route.stopIds].reverse();
  return ids.map((id) => STOP_BY_ID[id]).filter(Boolean);
}

function routePolyline(route: TransitRoute, direction: 0 | 1): LatLng[] {
  return routeStops(route, direction).map((s) => s.location);
}

/* ----------------------------------------------------------------- static data */

export function getStops(): Stop[] {
  return STOPS;
}

export function getRoutes(): TransitRoute[] {
  return ROUTES;
}

export function getRouteByShortName(shortName: string): TransitRoute | undefined {
  return getRoute(shortName);
}

/** Route shapes for the map layer. */
export function getRouteShapes(): { routeId: string; shortName: string; mode: TransportMode; points: LatLng[] }[] {
  return ROUTES.filter((r) => r.stopIds.length > 1).map((r) => ({
    routeId: r.id,
    shortName: r.shortName,
    mode: r.mode,
    points: routePolyline(r, 0),
  }));
}

/* ----------------------------------------------------------------- departures */

/** Next departures for every line calling at a stop. */
export function getStopDepartures(stopId: string, limit = 6, from = new Date()): Departure[] {
  const stop = getStop(stopId);
  if (!stop) return [];
  const out: Departure[] = [];
  const baseMs = from.getTime();

  for (const shortName of stop.lines) {
    const route = getRoute(shortName);
    if (!route) continue;
    const headway = headwayMinutes(shortName);
    const idx = route.stopIds.indexOf(stopId);
    const reverseIdx = [...route.stopIds].reverse().indexOf(stopId);

    const directions: { direction: 0 | 1; index: number }[] = [];
    if (idx >= 0 && idx < route.stopIds.length - 1) directions.push({ direction: 0, index: idx });
    if (reverseIdx >= 0 && reverseIdx < route.stopIds.length - 1) directions.push({ direction: 1, index: reverseIdx });
    if (directions.length === 0 && idx >= 0) directions.push({ direction: 0, index: idx });

    for (const { direction } of directions) {
      const phase = seeded(`${shortName}:${stopId}:${direction}`) * headway;
      const liveDelay = activeDelayForRoute(shortName);
      for (let n = 0; n < 2; n += 1) {
        const minutesFromNow = phase + n * headway + liveDelay;
        const time = new Date(baseMs + minutesFromNow * 60000);
        out.push({
          routeShortName: shortName,
          mode: route.mode,
          headsign: route.headsigns[direction],
          time: time.toISOString(),
          inMinutes: Math.max(0, Math.round(minutesFromNow)),
          realtime: liveDelay > 0 || seeded(`rt:${shortName}:${stopId}`) > 0.4,
          delay: delayStatus(liveDelay),
        });
      }
    }
  }

  return out.sort((a, b) => a.inMinutes - b.inMinutes).slice(0, limit);
}

/* ------------------------------------------------------------------ nearby */

export async function getNearbyStops(
  origin: LatLng,
  opts: { limit?: number; maxMeters?: number; mode?: TransportMode | 'all' } = {},
): Promise<NearbyStop[]> {
  const { limit = 6, maxMeters = 2500, mode = 'all' } = opts;
  if (dataSource.useMockTransport) await delay(140);

  return STOPS.map((stop) => {
    const distanceMeters = haversineMeters(origin, stop.location);
    return {
      stop,
      distanceMeters,
      walkMinutes: Math.max(1, Math.round(distanceMeters / simulation.walkingMetersPerMinute)),
      departures: getStopDepartures(stop.id, 3),
    };
  })
    .filter((n) => n.distanceMeters <= maxMeters)
    .filter((n) => (mode === 'all' ? true : n.stop.mode === mode || n.stop.lines.some((l) => getRoute(l)?.mode === mode)))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

export async function getStopDetail(stopId: string): Promise<{ stop: Stop; departures: Departure[] } | null> {
  const stop = getStop(stopId);
  if (!stop) return null;
  if (dataSource.useMockTransport) await delay(120);
  return { stop, departures: getStopDepartures(stopId, 12) };
}

/* ------------------------------------------------------------- journey planner */

export interface PlanEndpoint {
  name: string;
  location: LatLng;
  stopId: string;
}

export interface PlanOptions {
  departAt?: string;
  preference?: JourneyPreference;
}

const RIDE_MIN_PER_SEGMENT = simulation.interStopSeconds / 60;
const CITY_FARE = 1.1;

function walkMinutes(a: LatLng, b: LatLng): number {
  return Math.max(1, Math.round(haversineMeters(a, b) / simulation.walkingMetersPerMinute));
}

function nextDeparture(routeShortName: string, stopId: string, direction: 0 | 1, after: number): number {
  const headway = headwayMinutes(routeShortName);
  const phase = seeded(`${routeShortName}:${stopId}:${direction}`) * headway;
  let t = phase;
  const afterMinutes = after / 60000;
  while (t < afterMinutes) t += headway;
  return t * 60000;
}

interface RidePlan {
  route: TransitRoute;
  direction: 0 | 1;
  fromIdx: number;
  toIdx: number;
}

/** Every (route, direction) that serves `fromId` then `toId`. */
function ridesBetween(fromId: string, toId: string): RidePlan[] {
  const plans: RidePlan[] = [];
  for (const route of ROUTES) {
    for (const direction of [0, 1] as const) {
      const ids = direction === 0 ? route.stopIds : [...route.stopIds].reverse();
      const fromIdx = ids.indexOf(fromId);
      const toIdx = ids.indexOf(toId);
      if (fromIdx >= 0 && toIdx > fromIdx) {
        plans.push({ route, direction, fromIdx, toIdx });
      }
    }
  }
  return plans;
}

function orderedStopIds(route: TransitRoute, direction: 0 | 1): string[] {
  return direction === 0 ? route.stopIds : [...route.stopIds].reverse();
}

function buildRideLeg(plan: RidePlan, boardAtMs: number): JourneyLeg {
  const ids = orderedStopIds(plan.route, plan.direction);
  const fromStop = STOP_BY_ID[ids[plan.fromIdx]];
  const toStop = STOP_BY_ID[ids[plan.toIdx]];
  const segments = plan.toIdx - plan.fromIdx;
  const rideMinutes = Math.max(2, Math.round(segments * RIDE_MIN_PER_SEGMENT));
  const arrival = boardAtMs + rideMinutes * 60000;
  return {
    kind: 'ride',
    mode: plan.route.mode,
    routeShortName: plan.route.shortName,
    fromName: stopLabel(fromStop),
    toName: stopLabel(toStop),
    departure: new Date(boardAtMs).toISOString(),
    arrival: new Date(arrival).toISOString(),
    durationMinutes: rideMinutes,
    stopCount: segments,
    headsign: plan.route.headsigns[plan.direction],
  };
}

function assembleJourney(
  from: PlanEndpoint,
  to: PlanEndpoint,
  legs: JourneyLeg[],
  transfers: number,
): Journey {
  const first = legs[0];
  const last = legs[legs.length - 1];
  const departure = first.departure;
  const arrival = last.arrival;
  const durationMinutes = Math.round(
    (new Date(arrival).getTime() - new Date(departure).getTime()) / 60000,
  );
  const walkTotal = legs.filter((l) => l.kind === 'walk').reduce((s, l) => s + l.durationMinutes, 0);
  const rideLegs = legs.filter((l) => l.kind === 'ride');
  const delayMin = Math.round(
    Math.max(0, ...rideLegs.map((l) => activeDelayForRoute(l.routeShortName ?? ''))),
  );
  return {
    id: `j_${from.stopId}_${to.stopId}_${legs.map((l) => l.routeShortName ?? 'w').join('-')}`,
    fromName: from.name,
    toName: to.name,
    departure,
    arrival,
    durationMinutes,
    walkMinutes: walkTotal,
    transfers,
    legs,
    fareEuros: CITY_FARE,
    delay: delayStatus(delayMin),
    fastest: false,
    accessible: rideLegs.every((l) => l.mode !== 'rail' && l.mode !== 'night'),
  };
}

export async function planJourneys(
  from: PlanEndpoint,
  to: PlanEndpoint,
  opts: PlanOptions = {},
): Promise<Journey[]> {
  if (dataSource.useMockTransport) await delay(260);

  const base = opts.departAt ? new Date(opts.departAt) : new Date();
  const startMs = Math.ceil(base.getTime() / 60000) * 60000;

  if (from.stopId === to.stopId) {
    const w = walkMinutes(from.location, to.location);
    return [
      assembleJourney(
        from,
        to,
        [
          {
            kind: 'walk',
            fromName: from.name,
            toName: to.name,
            departure: new Date(startMs).toISOString(),
            arrival: new Date(startMs + w * 60000).toISOString(),
            durationMinutes: w,
          },
        ],
        0,
      ),
    ];
  }

  const journeys: Journey[] = [];
  const accessWalkFrom = walkMinutes(from.location, STOP_BY_ID[from.stopId]?.location ?? from.location);
  const accessWalkTo = walkMinutes(STOP_BY_ID[to.stopId]?.location ?? to.location, to.location);

  const makeAccessLegs = (boardMs: number, alightMs: number, ride: JourneyLeg[]): JourneyLeg[] => {
    const legs: JourneyLeg[] = [];
    if (accessWalkFrom > 0) {
      legs.push({
        kind: 'walk',
        fromName: from.name,
        toName: ride[0].fromName,
        departure: new Date(boardMs - accessWalkFrom * 60000).toISOString(),
        arrival: new Date(boardMs).toISOString(),
        durationMinutes: accessWalkFrom,
      });
    }
    legs.push(...ride);
    if (accessWalkTo > 0) {
      legs.push({
        kind: 'walk',
        fromName: ride[ride.length - 1].toName,
        toName: to.name,
        departure: new Date(alightMs).toISOString(),
        arrival: new Date(alightMs + accessWalkTo * 60000).toISOString(),
        durationMinutes: accessWalkTo,
      });
    }
    return legs;
  };

  // --- direct rides -------------------------------------------------------
  for (const plan of ridesBetween(from.stopId, to.stopId)) {
    const walkArrivalAtStop = startMs + accessWalkFrom * 60000;
    const boardMs = nextDeparture(plan.route.shortName, from.stopId, plan.direction, walkArrivalAtStop);
    const ride = buildRideLeg(plan, boardMs);
    const legs = makeAccessLegs(boardMs, new Date(ride.arrival).getTime(), [ride]);
    journeys.push(assembleJourney(from, to, legs, 0));
  }

  // --- one-transfer itineraries -----------------------------------------
  const transferHubs = new Set(
    STOPS.filter((s) => s.lines.length >= 3).map((s) => s.id),
  );
  const seen = new Set(journeys.map((j) => j.id));

  for (const legA of ROUTES.flatMap((route) =>
    ([0, 1] as const).map((direction) => ({ route, direction, ids: orderedStopIds(route, direction) })),
  )) {
    const fromIdx = legA.ids.indexOf(from.stopId);
    if (fromIdx < 0 || fromIdx === legA.ids.length - 1) continue;

    for (let hubIdx = fromIdx + 1; hubIdx < legA.ids.length; hubIdx += 1) {
      const hubId = legA.ids[hubIdx];
      if (hubId === to.stopId || !transferHubs.has(hubId)) continue;

      for (const legB of ridesBetween(hubId, to.stopId)) {
        if (legB.route.shortName === legA.route.shortName) continue;

        const walkArrivalAtStop = startMs + accessWalkFrom * 60000;
        const boardA = nextDeparture(legA.route.shortName, from.stopId, legA.direction, walkArrivalAtStop);
        const rideA = buildRideLeg(
          { route: legA.route, direction: legA.direction, fromIdx, toIdx: hubIdx },
          boardA,
        );
        const transferReadyMs = new Date(rideA.arrival).getTime() + 2 * 60000; // 2 min transfer
        const boardB = nextDeparture(legB.route.shortName, hubId, legB.direction, transferReadyMs);
        const rideB = buildRideLeg(legB, boardB);

        const transferWalk: JourneyLeg = {
          kind: 'walk',
          fromName: rideA.toName,
          toName: rideB.fromName,
          departure: rideA.arrival,
          arrival: new Date(boardB).toISOString(),
          durationMinutes: Math.max(2, Math.round((boardB - new Date(rideA.arrival).getTime()) / 60000)),
        };

        const legs = makeAccessLegs(boardA, new Date(rideB.arrival).getTime(), [rideA, transferWalk, rideB]);
        const journey = assembleJourney(from, to, legs, 1);
        if (seen.has(journey.id)) continue;
        seen.add(journey.id);
        journeys.push(journey);
      }
    }
  }

  if (journeys.length === 0) {
    // Fallback: single walking itinerary so the UI always has a result.
    const w = walkMinutes(from.location, to.location);
    journeys.push(
      assembleJourney(
        from,
        to,
        [
          {
            kind: 'walk',
            fromName: from.name,
            toName: to.name,
            departure: new Date(startMs).toISOString(),
            arrival: new Date(startMs + w * 60000).toISOString(),
            durationMinutes: w,
          },
        ],
        0,
      ),
    );
  }

  const ranked = rankJourneys(journeys, opts.preference ?? 'fastest');
  const top = ranked.slice(0, 5);
  const fastestId = [...top].sort((a, b) => a.durationMinutes - b.durationMinutes)[0]?.id;
  return top.map((j) => ({ ...j, fastest: j.id === fastestId }));
}

function rankJourneys(journeys: Journey[], preference: JourneyPreference): Journey[] {
  const unique = new Map<string, Journey>();
  for (const j of journeys) if (!unique.has(j.id)) unique.set(j.id, j);
  const list = [...unique.values()];
  switch (preference) {
    case 'fewest_transfers':
      return list.sort((a, b) => a.transfers - b.transfers || a.durationMinutes - b.durationMinutes);
    case 'least_walking':
      return list.sort((a, b) => a.walkMinutes - b.walkMinutes || a.durationMinutes - b.durationMinutes);
    case 'accessible':
      return list.sort(
        (a, b) => Number(b.accessible) - Number(a.accessible) || a.durationMinutes - b.durationMinutes,
      );
    default:
      return list.sort((a, b) => a.durationMinutes - b.durationMinutes);
  }
}

export async function planJourneysBetweenPlaces(
  fromPlaceId: string,
  toPlaceId: string,
  opts: PlanOptions = {},
): Promise<Journey[]> {
  const from = PLACE_BY_ID[fromPlaceId];
  const to = PLACE_BY_ID[toPlaceId];
  if (!from || !to) return [];
  return planJourneys(
    { name: from.name, location: from.location, stopId: from.nearestStopId },
    { name: to.name, location: to.location, stopId: to.nearestStopId },
    opts,
  );
}

/* ----------------------------------------------------------- live vehicles */

type VehicleListener = (vehicles: Vehicle[]) => void;

const seeds: VehicleSeed[] = VEHICLE_SEEDS.map((s) => ({ ...s }));
const listeners = new Set<VehicleListener>();
let vehicles: Vehicle[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let lastTick = Date.now();

function activeDelayForRoute(shortName: string): number {
  const v = vehicles.find((x) => x.routeShortName === shortName && x.delay.minutes > 0);
  if (v) return v.delay.minutes;
  const seed = seeds.find((s) => s.routeShortName === shortName);
  return seed ? Math.max(0, seed.delayMinutes) : 0;
}

function buildVehicle(seed: VehicleSeed): Vehicle | null {
  const route = getRoute(seed.routeShortName);
  if (!route || route.stopIds.length < 2) return null;
  const stops = routeStops(route, seed.direction);
  const polyline = stops.map((s) => s.location);
  const { point, bearing } = pointAlongPolyline(polyline, seed.progress);

  const n = stops.length;
  const segIndex = Math.min(n - 2, Math.floor(seed.progress * (n - 1)));
  const fractionPerSegment = 1 / (n - 1);
  const localT = (seed.progress - segIndex * fractionPerSegment) / fractionPerSegment;
  const nextStop = stops[Math.min(segIndex + 1, n - 1)];
  const etaSeconds = (1 - localT) * simulation.interStopSeconds + seed.delayMinutes * 60;

  return {
    id: seed.id,
    routeShortName: seed.routeShortName,
    routeId: route.id,
    mode: route.mode,
    headsign: route.headsigns[seed.direction],
    direction: seed.direction,
    location: point,
    bearing,
    progress: seed.progress,
    nextStopId: nextStop.id,
    nextStopName: stopLabel(nextStop),
    etaNextStopMinutes: Math.max(1, Math.round(etaSeconds / 60)),
    occupancy: seed.occupancy,
    delay: delayStatus(seed.delayMinutes),
    lowFloor: seed.lowFloor,
    plate: seed.plate,
  };
}

function tick(): void {
  const now = Date.now();
  const dt = Math.min(10, (now - lastTick) / 1000);
  lastTick = now;

  for (const seed of seeds) {
    seed.progress += seed.speed * dt;
    if (seed.progress >= 1) {
      seed.progress -= 1;
      seed.direction = seed.direction === 0 ? 1 : 0;
      // small re-roll so the sim stays lively but bounded
      const roll = seeded(`${seed.id}:${Math.floor(now / 60000)}`);
      seed.delayMinutes = roll > 0.75 ? Math.round(roll * 4) : 0;
      seed.occupancy = roll > 0.66 ? 'busy' : roll > 0.85 ? 'full' : 'quiet';
    }
  }

  vehicles = seeds.map(buildVehicle).filter((v): v is Vehicle => v !== null);
  listeners.forEach((l) => l(vehicles));
}

function ensureRunning(): void {
  if (timer) return;
  lastTick = Date.now();
  tick();
  timer = setInterval(tick, simulation.vehicleTickMs);
}

function stopIfIdle(): void {
  if (listeners.size === 0 && timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function subscribeVehicles(listener: VehicleListener): () => void {
  listeners.add(listener);
  ensureRunning();
  listener(vehicles);
  return () => {
    listeners.delete(listener);
    stopIfIdle();
  };
}

export function getVehicles(filter?: { mode?: TransportMode | 'all'; query?: string }): Vehicle[] {
  if (vehicles.length === 0) tick();
  let list = vehicles;
  if (filter?.mode && filter.mode !== 'all') {
    list = list.filter((v) => v.mode === filter.mode);
  }
  if (filter?.query) {
    const q = filter.query.trim().toLowerCase();
    list = list.filter(
      (v) => v.routeShortName.toLowerCase().includes(q) || v.headsign.toLowerCase().includes(q),
    );
  }
  return list;
}

export function getVehiclesForRoute(shortName: string): Vehicle[] {
  return getVehicles().filter((v) => v.routeShortName === shortName);
}

export function getVehicle(id: string): Vehicle | undefined {
  return getVehicles().find((v) => v.id === id);
}

export function getVehicleDetail(id: string): VehicleDetail | undefined {
  const vehicle = getVehicle(id);
  if (!vehicle) return undefined;
  const route = getRoute(vehicle.routeShortName);
  if (!route) return undefined;

  const stops = routeStops(route, vehicle.direction);
  const n = stops.length;
  const segIndex = Math.min(n - 2, Math.floor(vehicle.progress * (n - 1)));
  const now = Date.now();
  let cursor = now + vehicle.etaNextStopMinutes * 60000;

  const timeline: VehicleTimelineEntry[] = stops.map((stop, i) => {
    let state: VehicleTimelineEntry['state'];
    if (i <= segIndex) state = 'passed';
    else if (i === segIndex + 1) state = 'current';
    else if (i === n - 1) state = 'terminus';
    else state = 'upcoming';

    let time: number;
    if (i <= segIndex) {
      time = now - (segIndex - i + 1) * simulation.interStopSeconds * 1000;
    } else if (i === segIndex + 1) {
      time = cursor;
    } else {
      cursor += simulation.interStopSeconds * 1000;
      time = cursor;
    }

    return {
      stopId: stop.id,
      name: stop.name,
      platform: stop.platform,
      time: new Date(time).toISOString(),
      state,
    };
  });

  return { ...vehicle, timeline };
}
