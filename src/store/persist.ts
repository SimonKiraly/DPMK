import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Shared Zustand persist storage backend (AsyncStorage / JSON). */
export const zustandStorage = createJSONStorage(() => AsyncStorage);
