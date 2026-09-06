/**
 * The single background poller.
 *
 * Ubian is polled ONCE per `VEHICLE_POLL_MS` regardless of how many phones are
 * connected. Each tick: fetch → filter to MHD → normalize → dedupe → store
 * snapshot. On failure the previous snapshot is kept and the error logged.
 *
 * Idle-stop: after `POLLER_IDLE_STOP_MS` with no `/api/vehicles` traffic the
 * interval is cleared to be courteous to Ubian; `ensureRunning()` (called by the
 * vehicles route) restarts it and triggers an immediate refresh.
 */
import type { FastifyBaseLogger } from 'fastify';
import { config } from '../config.js';
import { ubianGet } from '../ubian/client.js';
import { normalizeVehicles } from '../ubian/normalize.js';
import type { UbianEnvelope, UbianVehicleRaw } from '../ubian/types.js';
import { fleet } from './snapshot.js';

let timer: NodeJS.Timeout | null = null;
let ticking = false;
let log: FastifyBaseLogger | null = null;
let firstPoll: Promise<void> | null = null;

async function fetchRawFleet(): Promise<UbianVehicleRaw[]> {
  const json = await ubianGet<UbianEnvelope & { vehicles?: UbianVehicleRaw[] }>(
    '/navigation/vehicles/nearby',
    {
      lat: config.fleet.lat,
      lng: config.fleet.lng,
      radius: config.fleet.radiusM,
    },
  );
  return json.vehicles ?? [];
}

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  const startedAt = Date.now();
  try {
    const raw = await fetchRawFleet();
    const prev = fleet.snapshotById();
    const result = normalizeVehicles(raw, prev);
    fleet.setVehicles(result.vehicles);
    const withHeading = result.vehicles.filter((v) => v.bearing !== 0).length;

    // Safety net from the analysis: if Ubian sent vehicles but the MHD filter
    // removed *all* of them, `ezIsUrban` may have changed shape upstream.
    if (result.candidateCount > 0 && result.vehicles.length === 0) {
      log?.warn(
        { candidateCount: result.candidateCount, rawCount: result.rawCount },
        'fleet: 0 MHD vehicles from a non-empty Ubian feed — ezIsUrban may have changed; check ubian/mhdFilter',
      );
    }

    log?.debug(
      {
        raw: result.rawCount,
        candidates: result.candidateCount,
        mhd: result.vehicles.length,
        droppedNonMhd: result.droppedNonMhd,
        droppedDuplicate: result.droppedDuplicate,
        prevKnown: prev.size,
        withHeading,
        ms: Date.now() - startedAt,
      },
      'fleet: refreshed',
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    fleet.markError(message);
    log?.warn(
      { err: message, ageMs: fleet.ageMs(), keptVehicles: fleet.read().vehicles.length },
      'fleet: poll failed — serving last known snapshot',
    );
  } finally {
    ticking = false;
  }
}

function scheduleNext(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (fleet.msSinceDemand() > config.poller.idleStopMs && config.poller.idleStopMs > 0) {
      stop();
      log?.info('fleet: no /api/vehicles traffic — poller paused (resumes on next request)');
      return;
    }
    void tick();
  }, config.poller.intervalMs);
  timer.unref?.();
}

export function start(logger: FastifyBaseLogger): void {
  log = logger;
  if (!firstPoll) firstPoll = tick();
  scheduleNext();
}

export function stop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Called by `/api/vehicles`. Restarts the poller if it idle-stopped and returns
 * a promise that resolves once there is at least one snapshot (bounded by the
 * Ubian timeout) so the very first request doesn't get an empty list needlessly.
 */
export async function ensureRunning(): Promise<void> {
  fleet.touchDemand();
  if (!timer) {
    log?.info('fleet: /api/vehicles traffic resumed — poller restarted');
    firstPoll = tick();
    scheduleNext();
  }
  if (!fleet.hasData() && firstPoll) {
    await firstPoll.catch(() => {
      /* error already recorded on the snapshot */
    });
  }
}

/** Test helper. */
export function _stopForTest(): void {
  stop();
  ticking = false;
  firstPoll = null;
  log = null;
}
