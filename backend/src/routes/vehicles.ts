import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { ensureRunning } from '../fleet/poller.js';
import { fleet } from '../fleet/snapshot.js';
import { cache } from '../lib/cache.js';
import { parseInput } from '../lib/validate.js';
import { ubianGet } from '../ubian/client.js';
import { buildTimeline } from '../ubian/normalize.js';
import type { UbianEnvelope, UbianTripStop } from '../ubian/types.js';
import type { TransportMode } from '../types.js';

const listQuery = z.object({
  mode: z.enum(['all', 'bus', 'tram', 'night']).optional(),
});

async function fetchTripStops(tripId: number): Promise<UbianTripStop[]> {
  return cache.cached(`trip:${tripId}`, config.cacheTtlMs.tripStops, async () => {
    const json = await ubianGet<UbianEnvelope & { tripStops?: UbianTripStop[] }>(
      '/navigation/vehicles/trip_stops',
      { tripID: tripId },
    );
    return json.tripStops ?? [];
  });
}

/**
 * `GET /api/vehicles`        — the whole MHD fleet from the in-memory snapshot.
 * `GET /api/vehicles/:id`    — one vehicle + its stop timeline (proxied trip_stops).
 *
 * MHD-only: the snapshot is built by the poller through `normalizeVehicles`,
 * which drops every non-MHD line. A regional/ARRIVA/train vehicle can never be
 * in `snapshot.vehicles`, so it can never be listed or looked up here.
 */
export const vehicleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/vehicles', async (req) => {
    await ensureRunning();
    const { mode } = parseInput(listQuery, req.query);
    const snap = fleet.read();

    let vehicles = snap.vehicles;
    if (mode && mode !== 'all') {
      vehicles = vehicles.filter((v) => v.mode === (mode as TransportMode));
    }

    return {
      vehicles,
      count: vehicles.length,
      updatedAt: snap.updatedAt,
      ageMs: Number.isFinite(snap.ageMs) ? snap.ageMs : null,
      stale: snap.stale,
      warmingUp: snap.warmingUp,
      source: 'ubian',
    };
  });

  app.get('/api/vehicles/:id', async (req, reply) => {
    await ensureRunning();
    const { id } = parseInput(z.object({ id: z.string().min(1) }), req.params);

    const vehicle = fleet.findVehicle(id);
    if (!vehicle) {
      return reply.code(404).send({ error: 'vehicle_not_found', id });
    }
    if (!vehicle.tripId) {
      return { vehicle: { ...vehicle, timeline: [] }, updatedAt: fleet.read().updatedAt };
    }

    try {
      const tripStops = await fetchTripStops(Number(vehicle.tripId));
      return { vehicle: buildTimeline(vehicle, tripStops), updatedAt: fleet.read().updatedAt };
    } catch (err) {
      req.log.warn({ err: (err as Error).message, id }, 'vehicle detail: trip_stops failed');
      return { vehicle: { ...vehicle, timeline: [] }, updatedAt: fleet.read().updatedAt };
    }
  });
};
