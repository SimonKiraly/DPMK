import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { notificationService } from '@/services/notificationService';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useTicketStore } from '@/store/useTicketStore';
import { useUserStore } from '@/store/useUserStore';
import { useWalletStore } from '@/store/useWalletStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useLostFoundStore } from '@/store/useLostFoundStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useInterval } from '@/hooks/useInterval';

/**
 * App-level side effects: waits for every persisted store to rehydrate,
 * restores the session, and runs a periodic "expired ticket" sweep that moves
 * lapsed tickets into history and posts an in-app notice.
 */
export function useAppBootstrap(): { ready: boolean } {
  const ticketsHydrated = useTicketStore((s) => s.hydrated);
  const walletHydrated = useWalletStore((s) => s.hydrated);
  const userHydrated = useUserStore((s) => s.hydrated);
  const favoritesHydrated = useFavoritesStore((s) => s.hydrated);
  const notificationsHydrated = useNotificationStore((s) => s.hydrated);
  const lostFoundHydrated = useLostFoundStore((s) => s.hydrated);
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);

  const restore = useUserStore((s) => s.restore);
  const [restored, setRestored] = useState(false);

  const hydrated =
    ticketsHydrated &&
    walletHydrated &&
    userHydrated &&
    favoritesHydrated &&
    notificationsHydrated &&
    lostFoundHydrated &&
    onboardingHydrated;

  useEffect(() => {
    if (!hydrated || restored) return;
    restore().finally(() => setRestored(true));
  }, [hydrated, restored, restore]);

  const sweep = () => {
    const expired = useTicketStore.getState().sweepExpired();
    for (const ticket of expired) {
      useNotificationStore.getState().add(notificationService.buildExpiredNotice(ticket));
      const reminderId = useTicketStore.getState().reminderIds[ticket.id];
      notificationService.cancelScheduled(reminderId);
      useTicketStore.getState().setReminderId(ticket.id, null);
    }
  };

  // Sweep on mount, every 15s, and whenever the app returns to the foreground.
  useEffect(() => {
    if (!hydrated) return;
    sweep();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sweep();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useInterval(sweep, hydrated ? 15000 : null);

  return { ready: hydrated && restored };
}
