import { Linking, Platform } from 'react-native';

import { OPERATOR, dataSource, endpoints } from '@/constants/config';
import { colors } from '@/constants/theme';
import { getTicketProduct } from '@/data/tickets';
import { ticketService } from '@/services/ticketService';
import type { Ticket } from '@/types';
import type {
  AppleWalletResponse,
  GoogleWalletResponse,
  WalletAddResult,
  WalletPassPayload,
  WalletPassRecord,
  WalletPlatform,
  WalletTicketStatusResponse,
} from '@/types/wallet';
import { isExpoGo } from '@/utils/environment';

/**
 * Digital-wallet client. Talks ONLY to a backend that owns the Apple / Google
 * signing material. In development (no backend) it returns a clear
 * "unavailable" result — it never fakes a successful install.
 *
 * Long-term tickets only (30 / 90 / 180 / 365-day prepaid). Short-term tickets
 * (30 min / 60 min / 24 h / 3 day) are never eligible.
 */

const MSG = {
  appleExpoGo: 'Pridanie do Apple Wallet bude dostupné v produkčnej verzii aplikácie.',
  googleExpoGo: 'Pridanie do Google Wallet bude dostupné v produkčnej verzii aplikácie.',
  appleNoBackend:
    'Apple Wallet integration requires the production wallet backend (POST /wallet/apple/pass).',
  googleNoBackend:
    'Google Wallet integration requires the production wallet backend (POST /wallet/google/pass).',
  unsupported: 'Digitálna peňaženka nie je na tomto zariadení podporovaná.',
  shortTerm: 'Do peňaženky je možné pridať len dlhodobé (predplatné) lístky.',
  expired: 'Platnosť lístka skončila — nie je možné ho pridať do peňaženky.',
} as const;

class WalletUnavailableError extends Error {}

/* ------------------------------------------------------------------ backend */

interface WalletBackend {
  requestApplePass(payload: WalletPassPayload): Promise<AppleWalletResponse>;
  requestGooglePass(payload: WalletPassPayload): Promise<GoogleWalletResponse>;
  getTicketStatus(ticketId: string): Promise<WalletTicketStatusResponse>;
}

/**
 * Development backend. Produces NO pass — surfaces a clear message instead so
 * the UI can explain that a production wallet backend is required. Never
 * reports a pass as added.
 */
class MockWalletBackend implements WalletBackend {
  async requestApplePass(): Promise<AppleWalletResponse> {
    throw new WalletUnavailableError(isExpoGo ? MSG.appleExpoGo : MSG.appleNoBackend);
  }

  async requestGooglePass(): Promise<GoogleWalletResponse> {
    throw new WalletUnavailableError(isExpoGo ? MSG.googleExpoGo : MSG.googleNoBackend);
  }

  async getTicketStatus(): Promise<WalletTicketStatusResponse> {
    return { state: 'not_added' };
  }
}

/** Production backend. Implement against `endpoints.wallet` when it exists. */
class HttpWalletBackend implements WalletBackend {
  private async post<T>(path: string, ticketId: string): Promise<T> {
    const res = await fetch(`${endpoints.wallet}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId }),
    });
    if (!res.ok) throw new WalletUnavailableError(`Wallet backend returned ${res.status}.`);
    return (await res.json()) as T;
  }

  requestApplePass(payload: WalletPassPayload): Promise<AppleWalletResponse> {
    return this.post<AppleWalletResponse>('/wallet/apple/pass', payload.ticketId);
  }

  requestGooglePass(payload: WalletPassPayload): Promise<GoogleWalletResponse> {
    return this.post<GoogleWalletResponse>('/wallet/google/pass', payload.ticketId);
  }

  async getTicketStatus(ticketId: string): Promise<WalletTicketStatusResponse> {
    const res = await fetch(`${endpoints.wallet}/wallet/ticket/${encodeURIComponent(ticketId)}/status`);
    if (!res.ok) throw new WalletUnavailableError(`Wallet backend returned ${res.status}.`);
    return (await res.json()) as WalletTicketStatusResponse;
  }
}

const backend: WalletBackend = dataSource.useMockWallet
  ? new MockWalletBackend()
  : new HttpWalletBackend();

/* -------------------------------------------------------------------- helpers */

function walletTicketName(ticket: Ticket): string {
  const product = getTicketProduct(ticket.productId);
  if (product?.category === 'prepaid') return `${product.shortLabel}-dňový lístok`;
  return ticket.name.replace(' predplatný lístok', '').replace(' lístok', ' lístok');
}

/** Human-facing pass reference, e.g. "DPMK-88421190". */
export function walletTicketReference(ticket: Ticket): string {
  return `DPMK-${ticket.id.replace(/-/g, '')}`;
}

/* ------------------------------------------------------------------- service */

export const walletService = {
  /** Wallet target for the current device, or null (web). */
  platform(): WalletPlatform | null {
    if (Platform.OS === 'ios') return 'apple';
    if (Platform.OS === 'android') return 'google';
    return null;
  },

  /** Human name for the current platform's wallet. */
  platformLabel(): string {
    return this.platform() === 'google' ? 'Google Wallet' : 'Apple Wallet';
  },

  /** Whether this device has a wallet target at all. */
  isWalletAvailable(): boolean {
    return this.platform() !== null;
  },

  /**
   * Whether a real pass-signing backend is wired. False in Expo Go and while
   * `dataSource.useMockWallet` is true — the add flow then only informs the user.
   */
  isBackendConfigured(): boolean {
    return !dataSource.useMockWallet;
  },

  /** Long-term (prepaid) tickets only. */
  isEligibleTicket(ticket: Ticket): boolean {
    return getTicketProduct(ticket.productId)?.category === 'prepaid';
  },

  /** Build the pass payload from the ACTUAL purchased ticket (dates not hardcoded). */
  buildPassPayload(ticket: Ticket, passengerName: string): WalletPassPayload {
    const product = getTicketProduct(ticket.productId);
    const validFrom = ticket.activatedAt ?? ticket.purchasedAt;
    const validUntil =
      ticket.expiresAt ??
      new Date(new Date(validFrom).getTime() + ticket.durationMs).toISOString();

    return {
      ticketId: ticket.id,
      reference: walletTicketReference(ticket),
      organizationName: 'MHD Košice',
      description: 'MHD Košice — cestovný lístok',
      ticketName: walletTicketName(ticket),
      fareClassLabel: ticket.fareClass === 'discounted' ? 'Zľavnený' : 'Štandardný',
      category: product?.category === 'prepaid' ? 'Predplatný lístok' : 'Základný lístok',
      passengerName,
      zones: ticket.zones,
      validFrom,
      validUntil,
      city: 'Košice',
      country: 'Slovensko',
      provider: 'MHD Košice',
      operator: OPERATOR,
      barcodeValue: ticketService.buildQrPayload(ticket),
      colors: { background: colors.primary, foreground: colors.white, label: colors.accent },
    };
  },

  async addToAppleWallet(ticket: Ticket, passengerName: string): Promise<WalletAddResult> {
    return this.createPass('apple', ticket, passengerName);
  },

  async addToGoogleWallet(ticket: Ticket, passengerName: string): Promise<WalletAddResult> {
    return this.createPass('google', ticket, passengerName);
  },

  /** Platform-dispatched add. Called by the UI. */
  async add(ticket: Ticket, passengerName: string): Promise<WalletAddResult> {
    const platform = this.platform();
    if (!platform) return { ok: false, message: MSG.unsupported };
    if (!this.isEligibleTicket(ticket)) return { ok: false, message: MSG.shortTerm };
    if (ticketService.computeStatus(ticket) === 'expired') return { ok: false, message: MSG.expired };
    return this.createPass(platform, ticket, passengerName);
  },

  async createPass(
    platform: WalletPlatform,
    ticket: Ticket,
    passengerName: string,
  ): Promise<WalletAddResult> {
    const payload = this.buildPassPayload(ticket, passengerName);
    try {
      const openUrl =
        platform === 'apple'
          ? (await backend.requestApplePass(payload)).passUrl
          : (await backend.requestGooglePass(payload)).saveUrl;

      const opened = await this.openUrl(openUrl);
      const record: WalletPassRecord = {
        ticketId: ticket.id,
        platform,
        state: 'added',
        openUrl,
        addedAt: new Date().toISOString(),
      };
      return { ok: opened, record, message: opened ? undefined : 'Nepodarilo sa otvoriť peňaženku.' };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : platform === 'apple'
            ? MSG.appleNoBackend
            : MSG.googleNoBackend;
      return { ok: false, message };
    }
  },

  /** Backend-reported status for a ticket (used to reconcile the local record). */
  async getWalletStatus(ticketId: string): Promise<WalletTicketStatusResponse> {
    try {
      return await backend.getTicketStatus(ticketId);
    } catch {
      return { state: 'not_added' };
    }
  },

  /** Re-open an existing pass in the wallet app. */
  async openWallet(record: WalletPassRecord): Promise<boolean> {
    return this.openUrl(record.openUrl);
  },

  async openUrl(url: string | undefined): Promise<boolean> {
    if (!url) return false;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) return false;
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  },
};
