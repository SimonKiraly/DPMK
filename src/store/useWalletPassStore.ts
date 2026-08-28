import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { storageKeys } from '@/constants/config';
import type { WalletPassRecord } from '@/types/wallet';
import { zustandStorage } from '@/store/persist';

/**
 * Per-ticket digital-wallet pass records. Only tickets that actually got a
 * signed pass appear here — an "unavailable" / "failed" attempt is surfaced to
 * the user and NOT stored, so the app never shows a pass as added when it isn't.
 */
interface WalletPassStoreState {
  passes: Record<string, WalletPassRecord>;
  hydrated: boolean;

  setPass: (record: WalletPassRecord) => void;
  removePass: (ticketId: string) => void;
  reset: () => void;
}

export const useWalletPassStore = create<WalletPassStoreState>()(
  persist(
    (set) => ({
      passes: {},
      hydrated: false,

      setPass(record) {
        set((s) => ({ passes: { ...s.passes, [record.ticketId]: record } }));
      },

      removePass(ticketId) {
        set((s) => {
          if (!s.passes[ticketId]) return s;
          const next = { ...s.passes };
          delete next[ticketId];
          return { passes: next };
        });
      },

      reset() {
        set({ passes: {} });
      },
    }),
    {
      name: storageKeys.walletPasses,
      storage: zustandStorage,
      partialize: (s) => ({ passes: s.passes }),
      onRehydrateStorage: () => () => {
        useWalletPassStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Stable selector — returns the record object (or undefined) by reference. */
export const selectWalletPass =
  (ticketId: string | undefined) =>
  (s: WalletPassStoreState): WalletPassRecord | undefined =>
    ticketId ? s.passes[ticketId] : undefined;
