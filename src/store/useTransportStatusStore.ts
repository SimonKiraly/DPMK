import { create } from 'zustand';

import { UNAVAILABLE_MESSAGE } from '@/constants/config';

/**
 * Health of the real-data path. Not persisted — it reflects the current
 * session only. `transportService` updates it; the `TransportStatusBanner`
 * renders it.
 */
interface TransportStatusState {
  /** Live data source is selected (mock off). */
  live: boolean;
  /** A live request failed and we fell back to mock/last-known data. */
  degraded: boolean;
  lastError: string | null;
  lastOkAt: number | null;

  setLive: (live: boolean) => void;
  markOk: () => void;
  markDegraded: (error?: string) => void;
}

export const useTransportStatusStore = create<TransportStatusState>((set) => ({
  live: false,
  degraded: false,
  lastError: null,
  lastOkAt: null,

  setLive: (live) => set({ live, degraded: live ? false : false }),
  markOk: () => set({ degraded: false, lastError: null, lastOkAt: Date.now() }),
  markDegraded: (error) => set({ degraded: true, lastError: error ?? UNAVAILABLE_MESSAGE }),
}));

/** Non-hook helpers for use inside services. */
export const transportStatus = {
  setLive: (live: boolean) => useTransportStatusStore.getState().setLive(live),
  ok: () => useTransportStatusStore.getState().markOk(),
  degraded: (error?: string) => useTransportStatusStore.getState().markDegraded(error),
};
