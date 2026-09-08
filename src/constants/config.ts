/**
 * App-wide configuration and feature flags.
 *
 * Every value that will eventually be backed by a real MHD Košice / DPMK
 * service is gated here so the swap from mock -> live is a one-line change
 * plus an implementation behind the matching service interface.
 */

export const APP_NAME = 'MHD Košice';
export const APP_VERSION = '1.0.0';
export const OPERATOR = 'Dopravný podnik mesta Košice';

/** Košice city centre — default map focus and "current location" fallback. */
export const KOSICE_CENTER = { latitude: 48.7204, longitude: 21.2577 };

/**
 * Geographic map (react-native-maps) defaults. iOS uses Apple Maps and needs no
 * API key; a production Android build needs a Google Maps key supplied via the
 * `GOOGLE_MAPS_API_KEY` env var (see app.config.js / .env.example).
 */
export const mapConfig = {
  /** City-level initial region — centred on Košice, not the user. */
  initialRegion: {
    latitude: 48.7164,
    longitude: 21.2611,
    latitudeDelta: 0.085,
    longitudeDelta: 0.075,
  },
  /** Zoom bounds for the +/- controls (region deltas). */
  minLatitudeDelta: 0.0025,
  maxLatitudeDelta: 0.4,
  /** Above this span the map is too wide to show individual stops usefully. */
  stopVisibilityLatitudeDelta: 0.16,
  /** Cap on stop markers rendered at once (viewport-clipped, nearest first). */
  maxStopMarkers: 80,
  /** Tight span used when focusing a single stop / vehicle / the user. */
  focusLatitudeDelta: 0.012,
} as const;

export const dataSource = {
  /** When false, services talk to real HTTP APIs (not implemented yet). */
  useMockTransport: true,
  useMockPayments: true,
  useMockAuth: true,
  useMockLostFound: true,
  /**
   * When false, `walletService` posts to the real pass-signing backend
   * (`endpoints.wallet`). Apple / Google certificates and keys NEVER live in
   * this app — the backend signs the pass and returns a `.pkpass` URL or a
   * "Save to Google Wallet" URL.
   */
  useMockWallet: true,
};

/** Base URLs for the eventual real integrations. */
export const endpoints = {
  transport: 'https://api.dpmk.sk/v1', // IDS Východ / DPMK live vehicle feed (placeholder)
  payments: 'https://payments.example.sk', // PSP (GoPay / Stripe / Adyen) (placeholder)
  auth: 'https://id.dpmk.sk', // customer identity (placeholder)
  /**
   * Wallet pass-signing backend (placeholder). Expected routes:
   *   POST /wallet/apple/pass          -> { passUrl }        (.pkpass download)
   *   POST /wallet/google/pass         -> { saveUrl }        (Save to Google Wallet)
   *   GET  /wallet/ticket/:id/status   -> { state, platform, openUrl }
   */
  wallet: 'https://api.dpmk.sk/wallet',
};

/** Live-simulation cadence for the mock transport layer. */
export const simulation = {
  vehicleTickMs: 2000,
  /** Average dwell + run time between two stops, seconds. */
  interStopSeconds: 95,
  walkingMetersPerMinute: 80,
};

/**
 * Operating windows for the mock departure board / journey planner, as
 * minute-of-day in **Košice local time** (`Europe/Bratislava`). `night` wraps
 * past midnight (start > end).
 *
 * These are a **class-level approximation, NOT an exact per-line timetable.**
 * `23:15–04:30` is DPMK's published **network-wide** night-service span
 * (https://www.dpmk.sk/cestovanie/nocna-doprava — "Premávajú medzi 23:15 –
 * 04:30"); `04:00–24:00` is the day span. Their only purpose is to stop a
 * service class from being offered outside the hours it runs.
 *
 * The repository has **no per-line timetable data** — `data/dpmkNetwork.ts` is
 * route topology only, and `headwayMinutes()` is heuristic. Exact per-line first
 * / last departure times would require Ubian timetable integration
 * (`/navigation/stops/line/time_table`) or ingesting a timetable feed (Open Data
 * Košice JDF). Until then, **do not invent per-line operating times** — adjust
 * only these network-wide spans if DPMK changes them.
 */
export const serviceHours = {
  /** Day lines (bus, tram) — day span 04:00 → 24:00. */
  day: { startMin: 4 * 60, endMin: 24 * 60 },
  /** Night lines (N1–N7) — DPMK published network-wide span 23:15 → 04:30. */
  night: { startMin: 23 * 60 + 15, endMin: 4 * 60 + 30 },
} as const;

/**
 * Real transport data — Ubian departure board for DPMK Košice.
 *
 * `dpmk-odchody.ubian.sk/navigation/*` is a public, unauthenticated JSON API
 * (see docs/TRANSPORT-DATA-SOURCE.md). It has NO published licence, so
 * production traffic must go through our own backend proxy; here it is used
 * directly only as an opt-in developer preview (`dataSource.useMockTransport`
 * is true by default). No CORS headers → works from native iOS/Android, not
 * from `expo start --web`.
 */
export const ubian = {
  baseUrl: 'https://dpmk-odchody.ubian.sk',
  /** Košice, from GET /navigation/urban_transport_cities. */
  cityId: 18024,
  /** Centre of the vehicle-fleet query (the whole fleet fits in ~1.5 km). */
  fleetCenter: KOSICE_CENTER,
  fleetRadiusMeters: 2600,
  requestTimeoutMs: 9000,
  poll: {
    vehiclesMs: 15000,
    departuresMs: 30000,
  },
  cacheTtlMs: {
    stops: 6 * 60 * 60 * 1000, // 6 h
    stopDetail: 60 * 1000,
    departures: 20 * 1000,
    vehicles: 8 * 1000,
    tripStops: 5 * 60 * 1000,
    search: 5 * 60 * 1000,
  },
  attribution: 'Dopravný podnik mesta Košice, a.s. · opendata.kosice.sk',
};

/**
 * MHD Košice backend (Railway) — the app's live vehicle source.
 *
 *   iPhone app ──HTTPS──▶ backend ──▶ Ubian
 *
 * The backend performs the authoritative MHD filter and normalisation, so the
 * app consumes `/api/vehicles` directly. `EXPO_PUBLIC_*` vars are inlined by
 * Metro at bundle time — this is only a public base URL, never a secret. The
 * defaults below are the production values, so `.env` is optional (see
 * `.env.example`).
 *
 * `enabled` is the feature flag: set `EXPO_PUBLIC_USE_BACKEND_API=false` to make
 * the app ignore the backend and use the direct Ubian / sample-data path only
 * (the pre-backend behaviour).
 */
export const backendApi = {
  baseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://dpmk-production.up.railway.app').replace(
    /\/+$/,
    '',
  ),
  enabled: process.env.EXPO_PUBLIC_USE_BACKEND_API !== 'false',
  /** Per-request abort; a little tighter than the direct-Ubian timeout. */
  requestTimeoutMs: 8000,
};

/** Official static timetable — Open Data Košice (CC BY 4.0). Backend ingest only. */
export const openDataKosice = {
  timetableZipUrl:
    'https://www.arcgis.com/sharing/rest/content/items/ba941d7bc56a462684a261d4f35ce17d/data',
  datasetPage: 'https://opendata.kosice.sk/datasets/ba941d7bc56a462684a261d4f35ce17d',
  licence: 'CC BY 4.0',
  format: 'JDF / CIS',
};

export const UNAVAILABLE_MESSAGE = 'Momentálne sa nepodarilo načítať aktuálne dáta.';

export const storageKeys = {
  tickets: 'mhdke.tickets.v1',
  favorites: 'mhdke.favorites.v1',
  wallet: 'mhdke.wallet.v1',
  walletPasses: 'mhdke.walletpasses.v1',
  user: 'mhdke.user.v1',
  notifications: 'mhdke.notifications.v1',
  lostFound: 'mhdke.lostfound.v1',
  onboarding: 'mhdke.onboarding.v1',
  authToken: 'mhdke.auth.token', // SecureStore
};
