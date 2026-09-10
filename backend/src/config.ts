/**
 * Environment configuration, validated with Zod.
 *
 * Every field has a default so the backend boots with an empty environment
 * (useful for `npm run dev` and CI). On Railway the Variables tab overrides.
 * Nothing here is a secret today — see `.env.example`.
 */
import { z } from 'zod';

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? def : /^(1|true|yes|on)$/i.test(v)));

const int = (def: number, min = 0) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v.trim() === '' ? def : Number(v)))
    .pipe(z.number().int().min(min));

const float = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v.trim() === '' ? def : Number(v)))
    .pipe(z.number().finite());

const EnvSchema = z.object({
  PORT: int(8080, 1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  UBIAN_BASE_URL: z.string().url().default('https://dpmk-odchody.ubian.sk'),
  UBIAN_TIMEOUT_MS: int(9000, 500),

  FLEET_LAT: float(48.7204),
  FLEET_LNG: float(21.2577),
  FLEET_RADIUS_M: int(2600, 100),

  VEHICLE_POLL_MS: int(10000, 2000),
  POLLER_IDLE_STOP_MS: int(120000, 0),

  // Service alerts — DPMK "Aktuality" RSS (public, no key).
  DPMK_RSS_URL: z.string().url().default('https://www.dpmk.sk/aktuality/rss'),
  ALERTS_POLL_MS: int(180_000, 30_000),
  ALERTS_TIMEOUT_MS: int(10_000, 1_000),
  /** An operational notice this long past its last feed appearance → `ended`. */
  ALERTS_OPERATIONAL_GRACE_MS: int(2 * 60 * 60_000, 0),
  /**
   * A `connection_cancelled` notice whose every cancelled departure has an
   * explicit time is `ended` once the latest of those times is this long past.
   */
  ALERTS_DEPARTURE_GRACE_MS: int(30 * 60_000, 0),
  /** A planned/other notice gone from the feed this long → `ended`. */
  ALERTS_PLANNED_RETENTION_MS: int(30 * 24 * 60 * 60_000, 0),

  CORS_ORIGINS: z.string().default('*'),
  RATE_LIMIT_MAX: int(120, 1),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  // Reserved for later — NOT required, NOT logged. Present so the shape is known.
  API_ACCESS_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

function load() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`Invalid environment:\n${lines}`);
    process.exit(1);
  }
  const e = parsed.data;

  const corsOrigins =
    e.CORS_ORIGINS.trim() === '*'
      ? true
      : e.CORS_ORIGINS.split(',')
          .map((s) => s.trim())
          .filter(Boolean);

  return {
    port: e.PORT,
    nodeEnv: e.NODE_ENV,
    isProd: e.NODE_ENV === 'production',
    logLevel: e.LOG_LEVEL,

    ubian: {
      baseUrl: e.UBIAN_BASE_URL.replace(/\/+$/, ''),
      timeoutMs: e.UBIAN_TIMEOUT_MS,
    },

    fleet: {
      lat: e.FLEET_LAT,
      lng: e.FLEET_LNG,
      radiusM: e.FLEET_RADIUS_M,
    },

    poller: {
      intervalMs: e.VEHICLE_POLL_MS,
      idleStopMs: e.POLLER_IDLE_STOP_MS,
      /** Snapshot older than this is reported `stale: true`. */
      staleAfterMs: Math.max(30_000, e.VEHICLE_POLL_MS * 3),
    },

    alerts: {
      rssUrl: e.DPMK_RSS_URL.replace(/\/+$/, ''),
      pollMs: e.ALERTS_POLL_MS,
      timeoutMs: e.ALERTS_TIMEOUT_MS,
      staleAfterMs: Math.max(10 * 60_000, e.ALERTS_POLL_MS * 3),
      operationalGraceMs: e.ALERTS_OPERATIONAL_GRACE_MS,
      departureGraceMs: e.ALERTS_DEPARTURE_GRACE_MS,
      plannedRetentionMs: e.ALERTS_PLANNED_RETENTION_MS,
    },

    cors: { origin: corsOrigins as true | string[] },
    rateLimit: { max: e.RATE_LIMIT_MAX, window: e.RATE_LIMIT_WINDOW },

    /** Short-TTL caches for the proxied (non-snapshot) endpoints, ms. */
    cacheTtlMs: {
      nearbyStops: 60_000,
      stopDetail: 20_000,
      departures: 20_000,
      tripStops: 5 * 60_000,
      search: 5 * 60_000,
    },
  } as const;
}

export type Config = ReturnType<typeof load>;
export const config: Config = load();
