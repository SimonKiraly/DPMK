import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { storageKeys } from '@/constants/config';
import { authService } from '@/services/authService';
import type { DiscountEntitlement, UserPreferences, UserProfile } from '@/types';
import { initialsFromName } from '@/utils/format';
import { zustandStorage } from '@/store/persist';

const DEFAULT_PREFERENCES: UserPreferences = {
  disruptionAlerts: true,
  autoActivateTickets: true,
  validationHaptics: true,
  lowFloorOnly: false,
  ticketExpiryReminders: true,
  largeText: false,
  highContrast: false,
  liveTransportData: false,
};

interface UserState {
  user: UserProfile | null;
  preferences: UserPreferences;
  status: 'signed_out' | 'signing_in' | 'signed_in';
  hydrated: boolean;
  restore: () => Promise<void>;
  signIn: (email: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  updateProfile: (patch: Partial<Pick<UserProfile, 'fullName' | 'email' | 'phone' | 'language'>>) => void;
  setDiscount: (discount: DiscountEntitlement) => void;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      preferences: DEFAULT_PREFERENCES,
      status: 'signed_out',
      hydrated: false,

      async restore() {
        if (get().user) {
          set({ status: 'signed_in' });
          return;
        }
        const session = await authService.restoreSession();
        if (session) set({ user: session.user, status: 'signed_in' });
      },

      async signIn(email, name) {
        set({ status: 'signing_in' });
        try {
          const session = await authService.signIn(email, name);
          set({ user: session.user, status: 'signed_in' });
        } catch (err) {
          set({ status: 'signed_out' });
          throw err;
        }
      },

      async signOut() {
        await authService.signOut();
        set({ user: null, status: 'signed_out' });
      },

      continueAsGuest() {
        set({ user: authService.demoUser, status: 'signed_in' });
      },

      updateProfile(patch) {
        set((s) => {
          if (!s.user) return s;
          const fullName = patch.fullName ?? s.user.fullName;
          return {
            user: { ...s.user, ...patch, fullName, initials: initialsFromName(fullName) },
          };
        });
      },

      setDiscount(discount) {
        set((s) => (s.user ? { user: { ...s.user, discount } } : s));
      },

      setPreference(key, value) {
        set((s) => ({ preferences: { ...s.preferences, [key]: value } }));
      },
    }),
    {
      name: storageKeys.user,
      storage: zustandStorage,
      partialize: (s) => ({ user: s.user, preferences: s.preferences }),
      onRehydrateStorage: () => () => {
        useUserStore.setState({ hydrated: true });
      },
    },
  ),
);

export const selectIsDiscounted = (s: UserState) => (s.user?.discount ?? 'none') !== 'none';
