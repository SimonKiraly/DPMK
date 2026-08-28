import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { storageKeys } from '@/constants/config';
import { ticketService } from '@/services/ticketService';
import type { Ticket } from '@/types';
import { zustandStorage } from '@/store/persist';

interface TicketState {
  tickets: Ticket[];
  hydrated: boolean;
  /** Reminder ids returned by the OS scheduler, keyed by ticket id. */
  reminderIds: Record<string, string>;

  addTicket: (ticket: Ticket) => void;
  activateTicket: (ticketId: string) => Ticket | undefined;
  setReminderId: (ticketId: string, reminderId: string | null) => void;
  /** Move any newly-expired valid tickets to `expired`. Returns those tickets. */
  sweepExpired: () => Ticket[];
  reset: () => void;
}

function withComputedStatus(ticket: Ticket, now = Date.now()): Ticket {
  const status = ticketService.computeStatus(ticket, now);
  return status === ticket.status ? ticket : { ...ticket, status };
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      hydrated: false,
      reminderIds: {},

      addTicket(ticket) {
        set((s) => ({ tickets: [ticket, ...s.tickets] }));
      },

      activateTicket(ticketId) {
        const current = get().tickets.find((t) => t.id === ticketId);
        if (!current) return undefined;
        const activated = ticketService.activate(current);
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === ticketId ? activated : t)),
        }));
        return activated;
      },

      setReminderId(ticketId, reminderId) {
        set((s) => {
          const next = { ...s.reminderIds };
          if (reminderId) next[ticketId] = reminderId;
          else delete next[ticketId];
          return { reminderIds: next };
        });
      },

      sweepExpired() {
        const now = Date.now();
        const newlyExpired: Ticket[] = [];
        set((s) => ({
          tickets: s.tickets.map((t) => {
            const updated = withComputedStatus(t, now);
            if (t.status === 'valid' && updated.status === 'expired') newlyExpired.push(updated);
            return updated;
          }),
        }));
        return newlyExpired;
      },

      reset() {
        set({ tickets: [], reminderIds: {} });
      },
    }),
    {
      name: storageKeys.tickets,
      storage: zustandStorage,
      partialize: (s) => ({ tickets: s.tickets, reminderIds: s.reminderIds }),
      onRehydrateStorage: () => (state) => {
        // Recompute statuses immediately on load so an app opened after a
        // ticket expired shows the correct state without waiting for a sweep.
        if (state) {
          state.tickets = state.tickets.map((t) => withComputedStatus(t));
        }
        useTicketStore.setState({ hydrated: true });
      },
    },
  ),
);

/* -------------------------------------------------------------- selectors */

export const selectActiveTicket = (s: TicketState): Ticket | undefined =>
  s.tickets.find((t) => t.status === 'valid');

export const selectInactiveTickets = (s: TicketState): Ticket[] =>
  s.tickets.filter((t) => t.status === 'inactive');

export const selectTicketHistory = (s: TicketState): Ticket[] =>
  s.tickets.filter((t) => t.status === 'expired');
