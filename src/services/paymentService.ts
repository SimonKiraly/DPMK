import { dataSource, endpoints } from '@/constants/config';
import type { PaymentIntent, PaymentMethod, PaymentResult } from '@/types';
import { createId, createReference } from '@/utils/id';

/**
 * Payment abstraction. The app only ever talks to `paymentService`; the concrete
 * provider is chosen here. Today that is `MockPaymentProvider` (simulated
 * processing / success / failure). To go live, implement `PaymentProvider`
 * against GoPay / Stripe / Adyen and select it when `dataSource.useMockPayments`
 * is false — no screen or store changes required.
 */

export interface PaymentProvider {
  createIntent(input: Omit<PaymentIntent, 'id'>): Promise<PaymentIntent>;
  confirmPayment(intent: PaymentIntent): Promise<PaymentResult>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

class MockPaymentProvider implements PaymentProvider {
  /** Force the next confirmation result — used by the dev "simulate failure" toggle. */
  forceOutcome: 'succeeded' | 'failed' | null = null;

  async createIntent(input: Omit<PaymentIntent, 'id'>): Promise<PaymentIntent> {
    await delay(180);
    return { id: createId('pi'), ...input };
  }

  async confirmPayment(intent: PaymentIntent): Promise<PaymentResult> {
    // Simulate the PSP round-trip (authorise -> capture).
    await delay(1400 + Math.random() * 900);

    const outcome =
      this.forceOutcome ??
      (Math.random() < 0.12 ? 'failed' : 'succeeded');
    this.forceOutcome = null;

    if (outcome === 'failed') {
      return {
        status: 'failed',
        intentId: intent.id,
        reference: createReference('ERR'),
        processedAt: new Date().toISOString(),
        errorMessage: 'Platba bola zamietnutá bankou. Skúste iný spôsob platby.',
      };
    }

    return {
      status: 'succeeded',
      intentId: intent.id,
      reference: createReference('PAY'),
      processedAt: new Date().toISOString(),
    };
  }
}

class HttpPaymentProvider implements PaymentProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createIntent(_input: Omit<PaymentIntent, 'id'>): Promise<PaymentIntent> {
    throw new Error(`Live payments not configured. Point at ${endpoints.payments} and implement HttpPaymentProvider.`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async confirmPayment(_intent: PaymentIntent): Promise<PaymentResult> {
    throw new Error('Live payments not configured.');
  }
}

const mockProvider = new MockPaymentProvider();
const provider: PaymentProvider = dataSource.useMockPayments ? mockProvider : new HttpPaymentProvider();

/** Static list of methods; wallet balance is injected by the caller (wallet store). */
export function getBasePaymentMethods(): PaymentMethod[] {
  return [
    { id: 'pm_apple', kind: 'apple_pay', label: 'Apple Pay', detail: 'Face ID · okamžite', removable: false },
    { id: 'pm_google', kind: 'google_pay', label: 'Google Pay', detail: 'Prepojené s účtom', removable: false },
    { id: 'pm_card', kind: 'card', label: 'Visa •••• 4417', detail: 'Platnosť 04/29', removable: true },
    { id: 'pm_wallet', kind: 'wallet', label: 'MHD Peňaženka', detail: 'Zostatok v aplikácii', removable: false },
  ];
}

export const paymentService = {
  createIntent: (input: Omit<PaymentIntent, 'id'>) => provider.createIntent(input),
  confirmPayment: (intent: PaymentIntent) => provider.confirmPayment(intent),
  /** Dev helper surfaced in Settings — forces the next payment outcome. */
  setNextOutcome(outcome: 'succeeded' | 'failed' | null) {
    mockProvider.forceOutcome = outcome;
  },
  getBasePaymentMethods,
};
