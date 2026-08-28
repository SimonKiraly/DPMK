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
