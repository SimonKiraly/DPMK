/**
 * Digital-wallet (Apple Wallet / Google Wallet) domain types.
 *
 * Passes are ALWAYS generated and signed by a backend — this app never holds
 * Apple certificates, Apple private keys, Google service-account credentials or
 * any signing secret. The app only:
 *   1. builds a `WalletPassPayload` from the purchased ticket,
 *   2. asks the backend to mint a signed pass,
 *   3. opens the returned `.pkpass` URL / "Save to Google Wallet" URL.
 */

export type WalletPlatform = 'apple' | 'google';

export type WalletPassState =
  | 'not_added' // no pass created for this ticket
  | 'added' // a signed pass exists and the add/save flow was opened
  | 'unavailable' // platform unsupported, or no backend (mock / Expo Go)
  | 'failed'; // backend / network error while creating the pass

/** Persisted per ticket once a wallet pass has been created. */
export interface WalletPassRecord {
  ticketId: string;
  platform: WalletPlatform;
  state: WalletPassState;
  /** Where to (re-)open the pass: `.pkpass` URL (Apple) or save URL (Google). */
  openUrl?: string;
  addedAt?: string;
  /** Human-readable reason when `state` is `unavailable` / `failed`. */
  message?: string;
}

/**
 * Everything the backend needs to render + sign a pass. Mirrors the visible
 * fields of the pass. `barcodeValue` is the ticket verification payload — a
 * future backend replaces the local signature with a server-signed one.
 */
export interface WalletPassPayload {
  ticketId: string; // raw ticket id, for backend correlation
  reference: string; // human-facing "DPMK-XXXXXXXX" shown on the pass
  organizationName: string; // "MHD Košice"
  description: string; // "MHD Košice — cestovný lístok"
  ticketName: string; // "365-dňový lístok"
  fareClassLabel: string; // "Štandardný" | "Zľavnený"
  category: string; // "Predplatný lístok"
  passengerName: string;
  zones: string; // "Všetky zóny"
  /** ISO timestamps derived from the actual purchased ticket. */
  validFrom: string;
  validUntil: string;
  city: string; // "Košice"
  country: string; // "Slovensko"
  provider: string; // "MHD Košice"
  operator: string; // "Dopravný podnik mesta Košice"
  barcodeValue: string;
  /** MHD Košice brand palette for the pass. */
  colors: {
    background: string; // #2B629E
    foreground: string; // #FFFFFF
    label: string; // #FFD538
  };
}

/* ---------------------------------------------------- backend response shapes */

/** `POST /wallet/apple/pass` */
export interface AppleWalletResponse {
  /** HTTPS URL that serves `application/vnd.apple.pkpass`. */
  passUrl: string;
  expiresAt?: string;
}

/** `POST /wallet/google/pass` */
export interface GoogleWalletResponse {
  /** `https://pay.google.com/gp/v/save/<signed-jwt>` */
  saveUrl: string;
  expiresAt?: string;
}

/** `GET /wallet/ticket/:ticketId/status` */
export interface WalletTicketStatusResponse {
  state: WalletPassState;
  platform?: WalletPlatform;
  openUrl?: string;
}

/** Result surfaced to the UI after an add attempt. */
export interface WalletAddResult {
  record?: WalletPassRecord; // present when a pass was created (persist this)
  ok: boolean;
  message?: string; // shown to the user when `ok` is false
}
