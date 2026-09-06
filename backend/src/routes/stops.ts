import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { cache } from '../lib/cache.js';
import { parseInput } from '../lib/validate.js';
import { ubianGet } from '../ubian/client.js';
import {
  mapDepartures,
  mapStop,
  normalizeNearbyStops,
  rawStopId,
  stripRawId,
} from '../ubian/normalize.js';
import type { UbianDepartureRaw, UbianEnvelope, UbianStop } from '../ubian/types.js';
import type { Departure, Stop } from '../types.js';

/* ------------------------------------------------- cached + single-flight Ubian */

async function fetchStopDepartures(stopId: number, limit: number): Promise<Departure[]> {
  const list = await cache.cached(
    `dep:${stopId}`,
    config.cacheTtlMs.departures,
    async () => {
      const json = await ubianGet<UbianEnvelope & { departures?: UbianDepartureRaw[] }>(
        '/navigation/stops/planned_departures',
        { stopID: stopId },
      );
      return json.departures ?? [];
    },
  );
  return mapDepartures(list, limit);
}

async function fetchStopById(stopId: number): Promise<Stop | null> {
  const raw = await cache.cached(
    `stop:${stopId}`,
    config.cacheTtlMs.stopDetail,
    async () => {
      const json = await ubianGet<UbianEnvelope & { stops?: UbianStop[] }>(
        '/navigation/stops/ids',
        { ids: [stopId] },
      );
      return json.stops?.[0] ?? null;
    },
  );
  return raw ? mapStop(raw) : null;
}

/* ------------------------------------------------------------------- endpoints */

const nearbyQuery = z.object({
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  radius: z.coerce.number().int().min(50).max(5000).optional(),
  limit: z.coerce.number().int().min(1).max(30).optional(),
  withDepartures: z.coerce.number().int().min(0).max(12).optional(),
});

const idParam = z.object({ id: z.string().min(1) });
const depQuery = z.object({ limit: z.coerce.number().int().min(1).max(30).optional() });

export const stopRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/stops?lat&lng&radius&limit&withDepartures  — nearby stops (proxied + cached)
  app.get('/api/stops', async (req) => {
    const q = parseInput(nearbyQuery, req.query);
    const origin = { latitude: q.lat, longitude: q.lng };
    const radius = q.radius ?? 2500;
    const limit = q.limit ?? 8;
    const withDepartures = q.withDepartures ?? 6;

    const raw = await cache.cached(
      `nearby:${q.lat.toFixed(4)},${q.lng.toFixed(4)}:${radius}`,
      config.cacheTtlMs.nearbyStops,
      async () => {
        const json = await ubianGet<UbianEnvelope & { stops?: UbianStop[] }>(
          '/navigation/stops/nearby',
          { lat: q.lat, lng: q.lng, radius },
        );
        return json.stops ?? [];
      },
    );

    const near = normalizeNearbyStops(raw, origin, radius, limit);
    await Promise.all(
      near.slice(0, withDepartures).map(async (n) => {
        try {
          n.departures = await fetchStopDepartures(n.rawId, 4);
        } catch {
          /* leave empty */
        }
      }),
    );

    return { stops: near.map(stripRawId), count: near.length };
  });

  // GET /api/stops/:id  — one stop + its next departures
  app.get('/api/stops/:id', async (req, reply) => {
    const { id } = parseInput(idParam, req.params);
    const stopId = rawStopId(id);
    if (!Number.isFinite(stopId)) return reply.code(400).send({ error: 'bad_stop_id', id });

    const [stop, departures] = await Promise.all([
      fetchStopById(stopId),
      fetchStopDepartures(stopId, 16).catch(() => [] as Departure[]),
    ]);
    if (!stop) return reply.code(404).send({ error: 'stop_not_found', id });
    return { stop, departures };
  });

  // GET /api/stops/:id/departures
  app.get('/api/stops/:id/departures', async (req, reply) => {
    const { id } = parseInput(idParam, req.params);
    const { limit } = parseInput(depQuery, req.query);
    const stopId = rawStopId(id);
    if (!Number.isFinite(stopId)) return reply.code(400).send({ error: 'bad_stop_id', id });

    const departures = await fetchStopDepartures(stopId, limit ?? 12);
    return { departures, count: departures.length };
  });
};
