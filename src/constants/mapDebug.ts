/**
 * TEMPORARY diagnostic switch for isolating a Map-screen crash.
 *
 * Every layer defaults to `true` (nothing is disabled). To bisect the crash,
 * flip flags to `false` from the top down, reload, and note which one stops the
 * crash — that layer (or its data) is the culprit. Remove this file and its
 * imports once the cause is found.
 *
 *   sheet    → the draggable <BottomSheet> overlay (reanimated + gesture-handler)
 *   routes   → route corridor <Polyline>s
 *   stops    → <StopMarker>s in the viewport
 *   vehicles → live/sim <VehicleMarker>s
 *   userDot  → the blue "you are here" dot (showsUserLocation)
 */
export const MAP_DEBUG = {
  sheet: true,
  routes: true,
  stops: true,
  vehicles: true,
  userDot: true,
} as const;
