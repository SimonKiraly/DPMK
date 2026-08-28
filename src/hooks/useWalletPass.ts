import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { ticketService } from '@/services/ticketService';
import { walletService } from '@/services/walletService';
import type { Ticket } from '@/types';
import type { WalletPassRecord, WalletPlatform } from '@/types/wallet';
import { selectWalletPass, useWalletPassStore } from '@/store/useWalletPassStore';
import { useUserStore } from '@/store/useUserStore';

export interface WalletPassView {
  /** 'apple' on iOS, 'google' on Android, null on web. */
  platform: WalletPlatform | null;
  platformLabel: string;
  /** Long-term (prepaid) ticket on a supported platform. */
  eligible: boolean;
  /** Eligible AND not expired — the "Pridať do Wallet" CTA should show. */
  canAdd: boolean;
  expired: boolean;
  isLongTerm: boolean;
  /** Persisted pass record, if one was created. */
  record: WalletPassRecord | undefined;
  /** A pass exists for this ticket. */
  added: boolean;
  busy: boolean;
  /** Kick off the add / save flow. Shows an alert if unavailable — never fakes success. */
  add: () => Promise<void>;
  /** Re-open an existing pass in the wallet app. */
  open: () => Promise<void>;
}

/**
 * Wallet state + actions for a single ticket. Keeps every platform / backend
 * decision in `walletService`; the component just renders `WalletPassView`.
 */
export function useWalletPass(ticket: Ticket | undefined): WalletPassView {
  const record = useWalletPassStore(selectWalletPass(ticket?.id));
  const setPass = useWalletPassStore((s) => s.setPass);
  const passengerName = useUserStore((s) => s.user?.fullName ?? 'Cestujúci');
  const [busy, setBusy] = useState(false);

  const platform = walletService.platform();
  const isLongTerm = !!ticket && walletService.isEligibleTicket(ticket);
  const expired = !!ticket && ticketService.computeStatus(ticket) === 'expired';
  const eligible = !!ticket && isLongTerm && platform !== null;
  const canAdd = eligible && !expired;
  const added = !!record && record.state === 'added';

  const add = useCallback(async () => {
    if (!ticket || busy) return;
    if (!eligible) {
      Alert.alert(
        'Digitálna peňaženka',
        walletService.platform() === null
          ? 'Digitálna peňaženka nie je na tomto zariadení podporovaná.'
          : 'Do peňaženky je možné pridať len dlhodobé (predplatné) lístky.',
      );
      return;
    }
    if (expired) {
      Alert.alert('Digitálna peňaženka', 'Platnosť lístka skončila.');
      return;
    }
    setBusy(true);
    try {
      const result = await walletService.add(ticket, passengerName);
      if (result.record) {
        setPass(result.record);
        if (!result.ok && result.message) Alert.alert('Digitálna peňaženka', result.message);
      } else {
        // Unavailable / failed — inform the user, do NOT persist as added.
        Alert.alert(
          walletService.platformLabel(),
          result.message ?? 'Pridanie do peňaženky momentálne nie je dostupné.',
        );
      }
    } finally {
      setBusy(false);
    }
  }, [ticket, busy, eligible, expired, passengerName, setPass]);

  const open = useCallback(async () => {
    if (!record) return;
    const ok = await walletService.openWallet(record);
    if (!ok) Alert.alert(walletService.platformLabel(), 'Nepodarilo sa otvoriť peňaženku.');
  }, [record]);

  return {
    platform,
    platformLabel: walletService.platformLabel(),
    eligible,
    canAdd,
    expired,
    isLongTerm,
    record,
    added,
    busy,
    add,
    open,
  };
}
