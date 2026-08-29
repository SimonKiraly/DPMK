# Map — geographic base layer

The **Live MHD** map (`LiveMapScreen` → `components/map/TransitMap.tsx`) renders a
real, interactive geographic map of Košice with the MHD data drawn on top.

## Technology: `react-native-maps` (1.20.1)

| Why | |
|---|---|
| **Expo Go** | Works in Expo Go SDK 54 with **no dev build** — it is in `expo/bundledNativeModules.json` (pinned to 1.20.1, installed via `npx expo install`). |
| **API key** | **None** for iOS — the default provider is **Apple Maps**. Also none for development on Android (Expo Go uses Expo's shared key). |
| **Provider** | We do **not** pass `provider`, so it is Apple Maps on iOS and Google Maps on Android. Google Maps is not "introduced" — it is only the Android platform default. |
| Alternatives rejected | `expo-maps` — not in Expo Go, still alpha. A Leaflet/OSM WebView — heavier, worse gestures, no native user-location. |

### Production Android build

A production Google Play build needs a Google Maps API key. It is **not** in
source — `app.config.js` reads `GOOGLE_MAPS_API_KEY` from the environment (see
`.env.example`) and injects it into `android.config.googleMaps.apiKey` /
`ios.config.googleMapsApiKey`. Prefer an EAS secret:

```
eas secret:create --name GOOGLE_MAPS_API_KEY --value <key>
```

iOS release builds keep using Apple Maps and need nothing.

## Layers (bottom → top)

```
Apple / Google base map   ← real streets, buildings, parks, Hornád, landmarks
  └ route corridors        ← <Polyline> per DPMK direction, coloured by mode
     └ stop markers        ← <StopMarker>, viewport-clipped + capped, callout → Stop Detail
        └ live vehicles    ← <VehicleMarker> from the Ubian feed, route-number badge
           └ user location ← native blue dot (showsUserLocation)
```

- **Initial region** — centred on Košice (`mapConfig.initialRegion`,
  48.7164 / 21.2611, city-level span). Never centred on the user.
- **Route geometry** — DPMK / Open Data Košice / Ubian provide stop coordinates
  only, not street-level shapes. Polylines connect a direction's ordered,
  verified stop coordinates (the "best possible representation"). No geometry is
  invented.
- **Filters** (`Všetko / Autobus / Električka / Nočné`) filter both the vehicle
  markers and the route polylines by `TransportMode`.

## Performance (up to ~100 live vehicles, 15 s poll)

- `VehicleMarker` / `StopMarker` are `React.memo` with explicit comparators —
  a poll only re-renders markers whose position actually changed.
- `tracksViewChanges` is enabled only briefly after mount / a visual change,
  then frozen, so markers are not re-rasterised on every parent render. Moving a
  vehicle only updates the native `coordinate`.
- Stop markers are clipped to the viewport, nearest-first, capped at
  `mapConfig.maxStopMarkers`. Route polylines are clipped to the viewport by
  bounding box.
- `onRegionChangeComplete` state updates are guarded against no-op moves.

## Failure handling

`MapErrorBoundary` wraps the `MapView`. If the native map module is missing
(e.g. an outdated Expo Go) or the provider throws, it swaps in `MapUnavailable`
("Mapu sa nepodarilo načítať") and the rest of the screen — the bottom sheet,
nearby stops, live counts, and every other screen — keeps working on the
existing transport data.
