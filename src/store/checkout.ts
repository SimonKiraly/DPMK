import { getTicketProduct } from '@/data/tickets';
import { notificationService } from '@/services/notificationService';
import { ticketService, type PurchaseInput } from '@/services/ticketService';
import type { FareClass, PaymentResult, Ticket } from '@/types';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useTicketStore } from '@/store/useTicketStore';
import { useUserStore } from '@/store/useUserStore';
import { useWalletStore } from '@/store/useWalletStore';

export interface CheckoutRequest {
  productId: string;
  fareClass: FareClass;
  methodId: string;
  activateNow: boolean;
}

export interface CheckoutResult {
  payment: PaymentResult;
  ticket?: Ticket;
}

/**
 * End-to-end purchase: pay -> mint ticket -> record wallet transaction ->
 * schedule expiry reminder -> drop an in-app confirmation. One call the
 * Payment screen awaits; all cross-store effects happen here.
 */
export async function checkoutTicket(req: CheckoutRequest): Promise<CheckoutResult> {
  const wallet = useWalletStore.getState();
  const method = wallet.methods().find((m) => m.id === req.methodId);
  if (!method) {
    return {
      payment: {
        status: 'failed',
        intentId: 'n/a',
        reference: 'ERR-NO-METHOD',
        processedAt: new Date().toISOString(),
        errorMessage: 'Vyberte platný spôsob platby.',
      },
    };
  }

  const product = getTicketProduct(req.productId);
  const amount = product?.price[req.fareClass] ?? 0;

  // Wallet payments are settled locally against the stored balance.
  if (method.kind === 'wallet') {
    const ok = wallet.chargeWallet(amount, product?.name ?? 'Lístok MHD');
    if (!ok) {
      return {
        payment: {
          status: 'failed',
          intentId: 'wallet',
          reference: 'ERR-BALANCE',
          processedAt: new Date().toISOString(),
          errorMessage: 'Nedostatočný zostatok v peňaženke. Dobite si kredit alebo zvoľte inú platbu.',
        },
      };
    }
  }

  const input: PurchaseInput = {
    productId: req.productId,
    fareClass: req.fareClass,
    method,
    activateNow: req.activateNow,
  };

  const outcome = await ticketService.purchase(input);

  if (outcome.paymentResult.status === 'failed') {
    // Refund the wallet if we debited it before the (mock) processor failed.
    if (method.kind === 'wallet') {
      useWalletStore.getState().topUp(amount, 'Vrátenie · zlyhaná platba');
    }
    return { payment: outcome.paymentResult };
  }

  const ticket = outcome.ticket!;
  useTicketStore.getState().addTicket(ticket);

  // Record the wallet transaction (non-wallet methods only; wallet already logged).
  if (method.kind !== 'wallet' && outcome.transaction) {
    useWalletStore.getState().addTransaction(outcome.transaction);
  }

  // In-app confirmation.
  useNotificationStore.getState().add(notificationService.buildPurchaseConfirmation(ticket));

  // Best-effort OS reminder before expiry.
  if (ticket.status === 'valid' && useUserStore.getState().preferences.ticketExpiryReminders) {
    const reminderId = await notificationService.scheduleTicketExpiryReminder(ticket);
    if (reminderId) useTicketStore.getState().setReminderId(ticket.id, reminderId);
  }

  return { payment: outcome.paymentResult, ticket };
}

/** Activate a stored (inactive) ticket and wire up its expiry reminder. */
export async function activateStoredTicket(ticketId: string): Promise<Ticket | undefined> {
  const activated = useTicketStore.getState().activateTicket(ticketId);
  if (!activated) return undefined;
  if (useUserStore.getState().preferences.ticketExpiryReminders) {
    const reminderId = await notificationService.scheduleTicketExpiryReminder(activated);
    if (reminderId) useTicketStore.getState().setReminderId(activated.id, reminderId);
  }
  return activated;
}
