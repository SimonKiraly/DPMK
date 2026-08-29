/**
 * Dynamic Expo config.
 *
 * Base config lives in `app.json`. This file only injects a Google Maps API key
 * when `GOOGLE_MAPS_API_KEY` is set in the environment — needed **only** for a
 * production Android build (Play Store). iOS uses Apple Maps and needs no key;
 * Expo Go on Android uses Expo's shared development key. Never commit a real
 * key — set it in your shell or as an EAS secret. See `.env.example`.
 */
module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return config;

  return {
    ...config,
    ios: {
      ...config.ios,
      config: { ...config.ios?.config, googleMapsApiKey: apiKey },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { ...config.android?.config?.googleMaps, apiKey },
      },
    },
  };
};
