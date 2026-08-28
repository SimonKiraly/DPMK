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
