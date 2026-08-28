import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Thin persistence layer. Everything that needs to survive an app restart goes
 * through here so the storage backend can be swapped (e.g. MMKV, a synced
 * backend) in one place.
 *
 * - `AsyncStorage` for ordinary app data (used directly by the Zustand stores
 *   via `createJSONStorage`, and via the helpers below elsewhere).
 * - `SecureStore` for secrets (auth token). SecureStore is unavailable on web,
 *   so it degrades to AsyncStorage there.
 */

const isWeb = typeof document !== 'undefined';

export const storageService = {
  async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* best-effort */
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },

  async getJSON<T>(key: string, fallback: T): Promise<T> {
    const raw = await this.getString(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.setString(key, JSON.stringify(value));
  },

  /* ---------------------------------------------------------------- secure */

  async getSecret(key: string): Promise<string | null> {
    try {
      if (isWeb) return AsyncStorage.getItem(`secure:${key}`);
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setSecret(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        await AsyncStorage.setItem(`secure:${key}`, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* best-effort */
    }
  },

  async removeSecret(key: string): Promise<void> {
    try {
      if (isWeb) {
        await AsyncStorage.removeItem(`secure:${key}`);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* noop */
    }
  },
};

/** Zustand persist storage backend. */
export { default as asyncStorage } from '@react-native-async-storage/async-storage';
