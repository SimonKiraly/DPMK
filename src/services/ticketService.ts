import { getTicketProduct } from '@/data/tickets';
import { paymentService } from '@/services/paymentService';
import type {
  FareClass,
  PaymentMethod,
  PaymentResult,
  Ticket,
  TicketProduct,
  TicketStatus,
  Transaction,
} from '@/types';
import { createReference, createTicketId, signTicket } from '@/utils/id';

/**
 * Ticket domain logic: purchase orchestration, activation, validity maths and
 * the inspector QR payload. Stateless — the `useTicketStore` owns the ticket
 * list and persistence.
 */

export interface PurchaseInput {
  productId: string;
  fareClass: FareClass;
  method: PaymentMethod;
  activateNow: boolean;
}

export interface PurchaseOutcome {
  paymentResult: PaymentResult;
  ticket?: Ticket;
  transaction?: Transaction;
}

function makeTicket(product: TicketProduct, fareClass: FareClass, method: PaymentMethod, activateNow: boolean): Ticket {
  const id = createTicketId();
  const purchasedAt = new Date().toISOString();
  const activatedAt = activateNow ? purchasedAt : null;
  const expiresAt = activatedAt
    ? new Date(new Date(activatedAt).getTime() + product.durationMs).toISOString()
    : null;

  return {
    id,
    productId: product.id,
    name: product.name,
    fareClass,
    priceEuros: product.price[fareClass],
    zones: product.zones,
    status: activateNow ? 'valid' : 'inactive',
    purchasedAt,
    activatedAt,
    expiresAt,
    durationMs: product.durationMs,
    verificationCode: activatedAt ? signTicket(id, activatedAt) : signTicket(id, purchasedAt),
    paymentMethodId: method.id,
  };
}

function makeTransaction(ticket: Ticket, product: TicketProduct, method: PaymentMethod): Transaction {
  return {
    id: `tx_${ticket.id}`,
    kind: 'ticket',
    title: product.name,
    subtitle: ticket.fareClass === 'discounted' ? 'Zľavnený lístok' : 'Základný lístok',
    amountEuros: -ticket.priceEuros,
    createdAt: ticket.purchasedAt,
    methodLabel: method.label,
  };
}

export const ticketService = {
  /** Runs payment, then (on success) mints the ticket + wallet transaction. */
  async purchase(input: PurchaseInput): Promise<PurchaseOutcome> {
    const product = getTicketProduct(input.productId);
    if (!product) {
      return {
        paymentResult: {
          status: 'failed',
          intentId: 'n/a',
          reference: createReference('ERR'),
          processedAt: new Date().toISOString(),
          errorMessage: 'Neznámy typ lístka.',
        },
      };
    }

    const amount = product.price[input.fareClass];
    const intent = await paymentService.createIntent({
      amountEuros: amount,
      description: product.name,
      methodId: input.method.id,
    });
    const paymentResult = await paymentService.confirmPayment(intent);

    if (paymentResult.status === 'failed') {
      return { paymentResult };
    }

    const ticket = makeTicket(product, input.fareClass, input.method, input.activateNow);
    const transaction = makeTransaction(ticket, product, input.method);
    return { paymentResult, ticket, transaction };
  },

  activate(ticket: Ticket): Ticket {
    if (ticket.status !== 'inactive') return ticket;
    const activatedAt = new Date().toISOString();
    return {
      ...ticket,
      status: 'valid',
      activatedAt,
      expiresAt: new Date(new Date(activatedAt).getTime() + ticket.durationMs).toISOString(),
      verificationCode: signTicket(ticket.id, activatedAt),
    };
  },

  computeStatus(ticket: Ticket, now = Date.now()): TicketStatus {
    if (!ticket.activatedAt || !ticket.expiresAt) return 'inactive';
    return new Date(ticket.expiresAt).getTime() > now ? 'valid' : 'expired';
  },

  remainingMs(ticket: Ticket, now = Date.now()): number {
    if (!ticket.expiresAt) return ticket.durationMs;
    return Math.max(0, new Date(ticket.expiresAt).getTime() - now);
  },

  /** 0..1 elapsed fraction of the validity window. */
  elapsedFraction(ticket: Ticket, now = Date.now()): number {
    if (!ticket.activatedAt || !ticket.expiresAt) return 0;
    const start = new Date(ticket.activatedAt).getTime();
    const end = new Date(ticket.expiresAt).getTime();
    return Math.max(0, Math.min(1, (now - start) / (end - start)));
  },

  /** Payload encoded into the QR shown to inspectors / door validators. */
  buildQrPayload(ticket: Ticket): string {
    return [
      'MHDKE1',
      ticket.id,
      ticket.productId,
      ticket.fareClass === 'discounted' ? 'D' : 'S',
      ticket.activatedAt ?? ticket.purchasedAt,
      ticket.expiresAt ?? '',
      ticket.verificationCode,
    ].join('|');
  },
};
