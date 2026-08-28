import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { AppNotification, Ticket } from '@/types';
import { formatClock } from '@/utils/format';
import { createId } from '@/utils/id';

/**
 * Notification helpers.
 *
 * The in-app notification centre is store-backed (`useNotificationStore`) and
 * always works. This service additionally builds notification objects for app
 * events and — where the platform supports it — schedules OS-level *local*
 * notifications.
 *
 * Expo Go (SDK 53+) dropped support for remote push and, on Android, for
 * scheduled local notifications. We detect that environment and fall back to
 * the in-app centre only, without touching the architecture — a development
 * build (`expo run:ios` / EAS) gets the real OS notifications, and remote push
 * (Expo Push / FCM / APNs) plugs in behind `registerForPush()` later.
 */

/** True when running inside the Expo Go sandbox (no custom native code). */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** OS-level local notifications are only reliable outside Expo Go. */
export const osNotificationsSupported = !isExpoGo;

let Notifications: typeof import('expo-notifications') | null = null;
if (osNotificationsSupported) {
  try {
    // Loaded lazily so a missing/limited native module can never break startup.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require('expo-notifications');
  } catch {
    Notifications = null;
  }
}

export const notificationService = {
  /** Whether OS-level scheduling is available (false in Expo Go). */
  supportsOsNotifications: osNotificationsSupported,

  async requestPermissions(): Promise<boolean> {
    if (!Notifications) return false;
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted) return true;
      const asked = await Notifications.requestPermissionsAsync();
      return asked.granted;
    } catch {
      return false;
    }
  },

  /**
   * Best-effort OS reminder ~10 min before a ticket expires. In Expo Go this is
   * a no-op (returns null) — the in-app expiry notice from the sweep still fires.
   */
  async scheduleTicketExpiryReminder(ticket: Ticket): Promise<string | null> {
    if (!Notifications || !ticket.expiresAt) return null;
    const fireAt = new Date(ticket.expiresAt).getTime() - 10 * 60 * 1000;
    if (fireAt <= Date.now()) return null;
    try {
      const granted = await this.requestPermissions();
      if (!granted) return null;
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lístok čoskoro vyprší',
          body: `${ticket.name} je platný do ${formatClock(ticket.expiresAt)}.`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
      });
    } catch {
      return null;
    }
  },

  async cancelScheduled(id: string | null | undefined): Promise<void> {
    if (!Notifications || !id) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* noop */
    }
  },

  /* ------------------------------------------------ in-app notification builders */

  buildPurchaseConfirmation(ticket: Ticket): AppNotification {
    return {
      id: createId('ntf'),
      kind: 'ticket',
      title: `${ticket.name} je pripravený`,
      body:
        ticket.status === 'valid' && ticket.expiresAt
          ? `Lístok ${ticket.id} je platný do ${formatClock(ticket.expiresAt)}.`
          : `Lístok ${ticket.id} je uložený v sekcii Moje lístky. Aktivujte ho pred nástupom.`,
      createdAt: new Date().toISOString(),
      read: false,
      cta: { label: 'Zobraziť lístok', target: { screen: 'Tickets' } },
    };
  },

  buildExpiryReminder(ticket: Ticket): AppNotification {
    return {
      id: createId('ntf'),
      kind: 'trip_update',
      title: 'Platnosť lístka sa končí',
      body: `${ticket.name} vyprší o 10 minút${ticket.expiresAt ? ` (${formatClock(ticket.expiresAt)})` : ''}.`,
      createdAt: new Date().toISOString(),
      read: false,
      cta: { label: 'Kúpiť ďalší lístok', target: { screen: 'Tickets' } },
    };
  },

  buildExpiredNotice(ticket: Ticket): AppNotification {
    return {
      id: createId('ntf'),
      kind: 'info',
      title: 'Lístok vypršal',
      body: `${ticket.name} (${ticket.id}) je neplatný a bol presunutý do histórie.`,
      createdAt: new Date().toISOString(),
      read: false,
    };
  },
};
