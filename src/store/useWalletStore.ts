import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { storageKeys } from '@/constants/config';
import { getBasePaymentMethods } from '@/services/paymentService';
import type { PaymentMethod, Transaction } from '@/types';
import { createId } from '@/utils/id';
import { zustandStorage } from '@/store/persist';

/** Pure composition of the payment-method list. Shared by the store method and the hook. */
export function composePaymentMethods(balanceEuros: number, extraMethods: PaymentMethod[]): PaymentMethod[] {
  const base = getBasePaymentMethods().map((m) =>
    m.kind === 'wallet'
      ? { ...m, detail: `Zostatok €${balanceEuros.toFixed(2).replace('.', ',')}` }
      : m,
  );
  return [...base, ...extraMethods];
}

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_seed_topup',
    kind: 'topup',
    title: 'Dobitie · Visa 4417',
    subtitle: 'Manuálne dobitie',
    amountEuros: 20,
    createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    methodLabel: 'Visa •••• 4417',
  },
  {
    id: 'tx_seed_24h',
    kind: 'ticket',
    title: '24-hodinový lístok',
    subtitle: 'Základný lístok',
    amountEuros: -3.8,
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    methodLabel: 'MHD Peňaženka',
  },
];

interface WalletState {
  balanceEuros: number;
  transactions: Transaction[];
  /** User-added methods on top of the base list (e.g. extra cards). */
  extraMethods: PaymentMethod[];
  hydrated: boolean;

  methods: () => PaymentMethod[];
  addTransaction: (tx: Transaction) => void;
  topUp: (amountEuros: number, methodLabel: string) => Transaction;
  /** Returns false if the wallet balance can't cover the amount. */
  chargeWallet: (amountEuros: number, description: string) => boolean;
  addCard: (label: string, detail: string) => void;
  removeMethod: (id: string) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balanceEuros: 24.6,
      transactions: SEED_TRANSACTIONS,
      extraMethods: [],
      hydrated: false,

      methods() {
        return composePaymentMethods(get().balanceEuros, get().extraMethods);
      },

      addTransaction(tx) {
        set((s) => ({
          transactions: [tx, ...s.transactions],
          balanceEuros:
            tx.kind === 'topup' || tx.kind === 'refund'
              ? s.balanceEuros + Math.abs(tx.amountEuros)
              : s.balanceEuros,
        }));
      },

      topUp(amountEuros, methodLabel) {
        const tx: Transaction = {
          id: createId('tx'),
          kind: 'topup',
          title: `Dobitie · ${methodLabel}`,
          subtitle: 'Manuálne dobitie',
          amountEuros,
          createdAt: new Date().toISOString(),
          methodLabel,
        };
        set((s) => ({
          transactions: [tx, ...s.transactions],
          balanceEuros: s.balanceEuros + amountEuros,
        }));
        return tx;
      },

      chargeWallet(amountEuros, description) {
        if (get().balanceEuros < amountEuros) return false;
        const tx: Transaction = {
          id: createId('tx'),
          kind: 'ticket',
          title: description,
          subtitle: 'Platba z peňaženky',
          amountEuros: -amountEuros,
          createdAt: new Date().toISOString(),
          methodLabel: 'MHD Peňaženka',
        };
        set((s) => ({
          transactions: [tx, ...s.transactions],
          balanceEuros: s.balanceEuros - amountEuros,
        }));
        return true;
      },

      addCard(label, detail) {
        set((s) => ({
          extraMethods: [
            ...s.extraMethods,
            { id: createId('pm'), kind: 'card', label, detail, removable: true },
          ],
        }));
      },

      removeMethod(id) {
        set((s) => ({ extraMethods: s.extraMethods.filter((m) => m.id !== id) }));
      },

      reset() {
        set({ balanceEuros: 24.6, transactions: SEED_TRANSACTIONS, extraMethods: [] });
      },
    }),
    {
      name: storageKeys.wallet,
      storage: zustandStorage,
      partialize: (s) => ({
        balanceEuros: s.balanceEuros,
        transactions: s.transactions,
        extraMethods: s.extraMethods,
      }),
      onRehydrateStorage: () => () => {
        useWalletStore.setState({ hydrated: true });
      },
    },
  ),
);

/**
 * Payment methods for components. Subscribes only to the primitive `balanceEuros`
 * and the (shallow-compared) `extraMethods`, then derives the list with `useMemo`
 * — so it never returns a fresh array while the underlying data is unchanged
 * (which would loop under Zustand v5 / useSyncExternalStore).
 */
export function useWalletMethods(): PaymentMethod[] {
  const balanceEuros = useWalletStore((s) => s.balanceEuros);
  const extraMethods = useWalletStore(useShallow((s) => s.extraMethods));
  return useMemo(() => composePaymentMethods(balanceEuros, extraMethods), [balanceEuros, extraMethods]);
}
