import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { storageKeys } from '@/constants/config';
import { lostFoundService, type LostFoundInput } from '@/services/lostFoundService';
import type { LostFoundReport } from '@/types';
import { zustandStorage } from '@/store/persist';

interface LostFoundState {
  reports: LostFoundReport[];
  hydrated: boolean;
  submitting: boolean;

  submit: (input: LostFoundInput) => Promise<LostFoundReport>;
  removeReport: (id: string) => void;
  reset: () => void;
}

export const useLostFoundStore = create<LostFoundState>()(
  persist(
    (set) => ({
      reports: [],
      hydrated: false,
      submitting: false,

      async submit(input) {
        set({ submitting: true });
        try {
          const report = await lostFoundService.submitReport(input);
          set((s) => ({ reports: [report, ...s.reports] }));
          return report;
        } finally {
          set({ submitting: false });
        }
      },

      removeReport(id) {
        set((s) => ({ reports: s.reports.filter((r) => r.id !== id) }));
      },

      reset() {
        set({ reports: [] });
      },
    }),
    {
      name: storageKeys.lostFound,
      storage: zustandStorage,
      partialize: (s) => ({ reports: s.reports }),
      onRehydrateStorage: () => () => {
        useLostFoundStore.setState({ hydrated: true });
      },
    },
  ),
);
