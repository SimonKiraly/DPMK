import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { apiClient } from '@/services/apiClient';
import type { AlertSeverity, ServiceAlert } from '@/types';

/**
 * DPMK service alerts from the backend (`GET /api/alerts`).
 *
 * Not persisted — a disruption board must be current or absent, never stale from
 * a previous session. `refresh()` is driven by `useAppBootstrap` (on launch,
 * every ~5 min, and on foreground). Any backend failure keeps the last good list
 * and flips `status` to `'error'`; the UI just shows fewer/no alerts and never
 * crashes.
 */

type AlertsStatus = 'loading' | 'ready' | 'error';

interface AlertsState {
  alerts: ServiceAlert[];
  status: AlertsStatus;
  lastFetchedAt: number | null;
  refresh: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  status: 'loading',
  lastFetchedAt: null,

  async refresh() {
    if (inFlight) return inFlight;
    if (!apiClient.enabled) {
      set({ status: 'ready', alerts: [], lastFetchedAt: Date.now() });
      return;
    }
    inFlight = (async () => {
      try {
        const alerts = await apiClient.fetchAlerts();
        set({ alerts, status: 'ready', lastFetchedAt: Date.now() });
      } catch {
        // keep whatever we had; surface the degraded state only
        set({ status: 'error', lastFetchedAt: get().lastFetchedAt });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
}));

/* ------------------------------------------------------------------ selectors */

const SEVERITY_RANK: Record<AlertSeverity, number> = { severe: 3, major: 2, minor: 1, info: 0 };

/** Most severe first, then most recently published. Exported for tests. */
export const byRelevance = (a: ServiceAlert, b: ServiceAlert): number =>
  SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

/*
 * Pure selector functions — the single source of truth for "which alerts belong
 * where". The hooks below are thin wrappers; `scripts/validateAlerts.ts`
 * exercises these directly (the app has no component test runner).
 */

export const selectActiveAlerts = (alerts: ServiceAlert[]): ServiceAlert[] =>
  alerts.filter((a) => a.status === 'active').sort(byRelevance);

export const selectPlannedAlerts = (alerts: ServiceAlert[]): ServiceAlert[] =>
  alerts.filter((a) => a.status === 'upcoming').sort(byRelevance);

export const selectVisibleAlerts = (alerts: ServiceAlert[]): ServiceAlert[] =>
  alerts.filter((a) => a.status !== 'ended').sort(byRelevance);

export const selectTopAlert = (alerts: ServiceAlert[]): ServiceAlert | undefined =>
  alerts
    .filter((a) => a.status === 'active')
    .reduce<ServiceAlert | undefined>(
      (best, a) => (!best || byRelevance(a, best) < 0 ? a : best),
      undefined,
    );

export const selectAlertById = (
  alerts: ServiceAlert[],
  id: string | undefined,
): ServiceAlert | undefined => (id ? alerts.find((a) => a.id === id) : undefined);

export const selectActiveStopAlerts = (
  alerts: ServiceAlert[],
  stopId: string | undefined,
): ServiceAlert[] =>
  stopId
    ? alerts
        .filter((a) => a.status === 'active' && a.affectedStops.some((s) => s.id === stopId))
        .sort(byRelevance)
    : [];

export const selectActiveRouteAlerts = (
  alerts: ServiceAlert[],
  shortName: string | undefined,
): ServiceAlert[] =>
  shortName
    ? alerts
        .filter((a) => a.status === 'active' && a.affectedRoutes.includes(shortName))
        .sort(byRelevance)
    : [];

/** Active alerts, most severe first. */
export const useActiveAlerts = (): ServiceAlert[] =>
  useAlertsStore(useShallow((s) => selectActiveAlerts(s.alerts)));

/** The single most relevant active alert for the Home banner, or `undefined`. */
export const useTopAlert = (): ServiceAlert | undefined =>
  useAlertsStore((s) => selectTopAlert(s.alerts));

/** All non-ended alerts (active + upcoming), most relevant first. */
export const useVisibleAlerts = (): ServiceAlert[] =>
  useAlertsStore(useShallow((s) => selectVisibleAlerts(s.alerts)));

/** Upcoming (planned, not yet started) alerts, most relevant first. */
export const usePlannedAlerts = (): ServiceAlert[] =>
  useAlertsStore(useShallow((s) => selectPlannedAlerts(s.alerts)));

/** A single alert by id from the current store, or `undefined`. */
export const useAlertById = (id: string | undefined): ServiceAlert | undefined =>
  useAlertsStore((s) => selectAlertById(s.alerts, id));

/**
 * Active alerts that name this stop as an affected stop (resolved id match).
 * Ended / upcoming alerts and alerts about other stops are excluded.
 */
export const useActiveStopAlerts = (stopId: string | undefined): ServiceAlert[] =>
  useAlertsStore(useShallow((s) => selectActiveStopAlerts(s.alerts, stopId)));

/** Active alerts that name this route (by canonical short name), most relevant first. */
export const useActiveRouteAlerts = (shortName: string | undefined): ServiceAlert[] =>
  useAlertsStore(useShallow((s) => selectActiveRouteAlerts(s.alerts, shortName)));
