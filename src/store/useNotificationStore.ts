import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { storageKeys } from '@/constants/config';
import { seedNotifications } from '@/data/notifications';
import type { AppNotification, NotificationKind } from '@/types';
import { zustandStorage } from '@/store/persist';

interface NotificationState {
  notifications: AppNotification[];
  hydrated: boolean;
  seeded: boolean;

  add: (notification: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
  ensureSeeded: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      hydrated: false,
      seeded: false,

      add(notification) {
        set((s) => ({ notifications: [notification, ...s.notifications] }));
      },

      markRead(id) {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllRead() {
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
      },

      remove(id) {
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
      },

      clearAll() {
        set({ notifications: [] });
      },

      ensureSeeded() {
        if (get().seeded) return;
        set({ notifications: [...seedNotifications(), ...get().notifications], seeded: true });
      },
    }),
    {
      name: storageKeys.notifications,
      storage: zustandStorage,
      partialize: (s) => ({ notifications: s.notifications, seeded: s.seeded }),
      onRehydrateStorage: () => () => {
        useNotificationStore.setState({ hydrated: true });
        useNotificationStore.getState().ensureSeeded();
      },
    },
  ),
);

export const selectUnreadCount = (s: NotificationState) =>
  s.notifications.filter((n) => !n.read).length;

/** Notifications of a given kind, reference-stable via `useShallow`. */
export const useNotificationsByKind = (kind: NotificationKind): AppNotification[] =>
  useNotificationStore(useShallow((s) => s.notifications.filter((n) => n.kind === kind)));
