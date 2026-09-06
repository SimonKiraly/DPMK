import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NETWORK_PAYLOAD, routeDetail } from '../network/adapters.js';
import { parseInput } from '../lib/validate.js';

/**
 * The static DPMK network (routes / stops / map shapes), served from the backend
 * so a timetable update ships without an app release. Immutable per deploy —
 * `@fastify/etag` handles conditional GETs; we also set a long `Cache-Control`.
 * The source data (`network/dpmkNetwork.ts`) is a verbatim copy and is not altered.
 */
export const networkRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/network', async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=86400');
    return NETWORK_PAYLOAD;
  });

  app.get('/api/routes/:shortName', async (req, reply) => {
    const { shortName } = parseInput(z.object({ shortName: z.string().min(1) }), req.params);
    const detail = routeDetail(shortName);
    if (!detail) return reply.code(404).send({ error: 'route_not_found', shortName });
    reply.header('Cache-Control', 'public, max-age=86400');
    return detail;
  });
};
