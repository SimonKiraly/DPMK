import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { storageKeys } from '@/constants/config';
import { zustandStorage } from '@/store/persist';

interface OnboardingState {
  completed: boolean;
  hydrated: boolean;
  complete: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      hydrated: false,
      complete: () => set({ completed: true }),
      reset: () => set({ completed: false }),
    }),
    {
      name: storageKeys.onboarding,
      storage: zustandStorage,
      partialize: (s) => ({ completed: s.completed }),
      onRehydrateStorage: () => () => {
        useOnboardingStore.setState({ hydrated: true });
      },
    },
  ),
);
