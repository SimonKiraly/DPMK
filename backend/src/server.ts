/**
 * MHD Košice backend — Fastify bootstrap.
 *
 * Ubian ──(1 poll / 10s)──▶ backend snapshot ──▶ many mobile clients.
 * Listens on 0.0.0.0:$PORT for Railway.
 */
import { fileURLToPath } from 'node:url';
import cors from '@fastify/cors';
import etag from '@fastify/etag';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';

import { config } from './config.js';
import { HttpError } from './lib/validate.js';
import { UbianError } from './ubian/client.js';
import * as poller from './fleet/poller.js';
import * as alertPoller from './alerts/poller.js';
import { alertRoutes } from './routes/alerts.js';
import { healthRoutes } from './routes/health.js';
import { networkRoutes } from './routes/network.js';
import { searchRoutes } from './routes/search.js';
import { stopRoutes } from './routes/stops.js';
import { vehicleRoutes } from './routes/vehicles.js';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      // Pretty in dev, JSON in prod. Never log Authorization/cookie headers.
      transport:
        config.nodeEnv === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
    },
    trustProxy: true, // Railway terminates TLS in front of us
  });

  await app.register(cors, {
    origin: config.cors.origin,
    methods: ['GET', 'OPTIONS'],
    maxAge: 86400,
  });
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
  });
  await app.register(etag);

  // Handlers first — so the encapsulated route plugins inherit them.
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: 'not_found', method: req.method, url: req.url });
  });

  app.setErrorHandler((err, req, reply) => {
    // Our validation errors (from lib/validate.parseInput).
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({
        error: err.statusCode === 400 ? 'bad_request' : 'error',
        message: err.message,
        ...(err.payload && typeof err.payload === 'object' ? err.payload : {}),
      });
    }
    // Raw Zod (belt-and-suspenders — name check survives dual-package weirdness).
    if (err instanceof ZodError || (err as { name?: string }).name === 'ZodError') {
      return reply
        .code(400)
        .send({ error: 'bad_request', issues: (err as ZodError).issues });
    }
    // Fastify's own schema validation.
    if ((err as { validation?: unknown }).validation) {
      return reply.code(400).send({ error: 'bad_request', message: (err as Error).message });
    }
    if (err instanceof UbianError) {
      req.log.warn({ err: err.message }, 'upstream Ubian error');
      return reply.code(502).send({ error: 'upstream_unavailable', message: err.message });
    }
    if ((err as { statusCode?: number }).statusCode === 429) {
      return reply.code(429).send({ error: 'rate_limited' });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return reply.code(status).send({ error: 'bad_request', message: (err as Error).message });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ error: 'internal_error' });
  });

  await app.register(healthRoutes);
  await app.register(vehicleRoutes);
  await app.register(stopRoutes);
  await app.register(networkRoutes);
  await app.register(searchRoutes);
  await app.register(alertRoutes);

  return app;
}

async function main() {
  const app = await buildServer();

  poller.start(app.log);
  alertPoller.start(app.log);

  try {
    await app.listen({ host: '0.0.0.0', port: config.port });
    app.log.info(
      { port: config.port, ubian: config.ubian.baseUrl, pollMs: config.poller.intervalMs },
      'mhd-kosice-backend up',
    );
  } catch (err) {
    app.log.error({ err }, 'failed to start');
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    poller.stop();
    alertPoller.stop();
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

// Run only when executed directly (`node dist/server.js` / `tsx src/server.ts`),
// not when imported by a test.
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void main();
}
