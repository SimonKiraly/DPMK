import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Runtime environment flags. Centralised so features that behave differently in
 * Expo Go vs a development / production build (notifications, digital wallet,
 * …) all read the same source of truth.
 */

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/** Running inside the Expo Go sandbox — no custom native modules available. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Running as an EAS / `expo run:*` development build. */
export const isDevelopmentBuild = Constants.executionEnvironment === ExecutionEnvironment.Bare;

/** Running as a submitted / standalone store build. */
export const isStandalone = Constants.executionEnvironment === ExecutionEnvironment.Standalone;

/** A native custom build (dev build or standalone) — not Expo Go, not web. */
export const isNativeBuild = (isDevelopmentBuild || isStandalone) && !isWeb;
