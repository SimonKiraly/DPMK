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

const byRelevance = (a: ServiceAlert, b: ServiceAlert): number =>
  SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

/** Active alerts, most severe first. */
export const useActiveAlerts = (): ServiceAlert[] =>
  useAlertsStore(
    useShallow((s) => s.alerts.filter((a) => a.status === 'active').sort(byRelevance)),
  );

/** The single most relevant active alert for the Home banner, or `undefined`. */
export const useTopAlert = (): ServiceAlert | undefined =>
  useAlertsStore((s) =>
    s.alerts
      .filter((a) => a.status === 'active')
      .reduce<ServiceAlert | undefined>((best, a) => (!best || byRelevance(a, best) < 0 ? a : best), undefined),
  );

/** All non-ended alerts (active + upcoming), most relevant first. */
export const useVisibleAlerts = (): ServiceAlert[] =>
  useAlertsStore(
    useShallow((s) => s.alerts.filter((a) => a.status !== 'ended').sort(byRelevance)),
  );
