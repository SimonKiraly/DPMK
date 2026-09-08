import type { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import { fleet } from '../fleet/snapshot.js';
import { alerts } from '../alerts/store.js';
import { cache } from '../lib/cache.js';

const APP_VERSION = '1.0.0';

/**
 * `GET /api/health` — Railway health check + a quick status peek.
 * Always 200 (the process is alive); Ubian state is reported in the body.
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async () => {
    const h = fleet.health();
    const a = alerts.health();
    return {
      ok: true,
      version: APP_VERSION,
      nodeEnv: config.nodeEnv,
      uptimeSec: Math.round(process.uptime()),
      ubian: {
        baseUrl: config.ubian.baseUrl,
        lastOkAt: h.lastOkAt,
        lastError: h.lastError,
        ageMs: Number.isFinite(h.ageMs) ? h.ageMs : null,
      },
      fleetCount: h.fleetCount,
      alerts: {
        rssUrl: config.alerts.rssUrl,
        lastOkAt: a.lastOkAt,
        lastError: a.lastError,
        ageMs: Number.isFinite(a.ageMs) ? a.ageMs : null,
        count: a.alertCount,
      },
      proxyCacheEntries: cache.size,
    };
  });
};
