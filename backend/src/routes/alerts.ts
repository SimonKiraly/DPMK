import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { parseInput } from '../lib/validate.js';
import { ensureWarm } from '../alerts/poller.js';
import { alerts } from '../alerts/store.js';
import type { AlertStatus, AlertType } from '../types.js';

const listQuery = z.object({
  status: z.enum(['active', 'upcoming', 'ended', 'all']).optional(),
  type: z.enum(['connection_cancelled', 'delays', 'planned', 'other']).optional(),
});

/**
 * `GET /api/alerts`      — normalised DPMK service alerts from the RSS pipeline.
 * `GET /api/alerts/:id`  — one alert (id = the RSS `<guid>` number).
 *
 * Read-only from the in-memory store; the poller is the only thing that fetches
 * `dpmk.sk`. Defaults to non-ended alerts; `?status=all` includes ended ones.
 */
export const alertRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/alerts', async (req) => {
    await ensureWarm();
    const { status, type } = parseInput(listQuery, req.query);
    const snap = alerts.read();

    let list = snap.alerts;
    if (!status || status !== 'all') {
      const want: AlertStatus = status ?? 'active';
      list =
        status === undefined
          ? list.filter((a) => a.status !== 'ended') // default: hide ended
          : list.filter((a) => a.status === want);
    }
    if (type) list = list.filter((a) => a.type === (type as AlertType));

    return {
      alerts: list,
      count: list.length,
      updatedAt: snap.updatedAt,
      ageMs: Number.isFinite(snap.ageMs) ? snap.ageMs : null,
      stale: snap.stale,
      warmingUp: snap.warmingUp,
      source: 'dpmk-rss',
    };
  });

  app.get('/api/alerts/:id', async (req, reply) => {
    await ensureWarm();
    const { id } = parseInput(z.object({ id: z.string().min(1).max(64) }), req.params);
    const alert = alerts.find(id);
    if (!alert) return reply.code(404).send({ error: 'alert_not_found', id });
    return { alert, updatedAt: alerts.read().updatedAt };
  });
};
