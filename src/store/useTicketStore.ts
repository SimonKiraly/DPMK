import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

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
        let changed = false;
        const next = get().tickets.map((t) => {
          const updated = withComputedStatus(t, now);
          if (updated !== t) {
            changed = true;
            if (t.status === 'valid' && updated.status === 'expired') newlyExpired.push(updated);
          }
          return updated;
        });
        // Only write (and notify subscribers) when a status actually flipped —
        // the 15s sweep is otherwise a no-op and must not trigger re-renders.
        if (changed) set({ tickets: next });
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

/** `.find` returns a stable element reference, so this selector is loop-safe as-is. */
export const selectActiveTicket = (s: TicketState): Ticket | undefined =>
  s.tickets.find((t) => t.status === 'valid');

export const selectInactiveTickets = (s: TicketState): Ticket[] =>
  s.tickets.filter((t) => t.status === 'inactive');

export const selectTicketHistory = (s: TicketState): Ticket[] =>
  s.tickets.filter((t) => t.status === 'expired');

/*
 * Zustand v5 compares selector output with `Object.is`. A selector that returns
 * a fresh array on every call (`.filter`) breaks React's useSyncExternalStore
 * cached-snapshot contract and causes "Maximum update depth exceeded".
 * These hooks wrap those selectors in `useShallow` so an unchanged result keeps
 * a stable reference.
 */
export const useInactiveTickets = (): Ticket[] =>
  useTicketStore(useShallow(selectInactiveTickets));

export const useTicketHistory = (): Ticket[] =>
  useTicketStore(useShallow(selectTicketHistory));
