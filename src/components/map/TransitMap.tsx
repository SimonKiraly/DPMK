import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';

import { colors } from '@/constants/theme';
import { mapConfig } from '@/constants/config';
import { MAP_DEBUG } from '@/constants/mapDebug';
import { getRouteShapes, getStops } from '@/services/transportService';
import { hasValidCoordinates, isValidLatLng, sanitizePath } from '@/utils/coords';
import type { LatLng, TransportMode, Vehicle } from '@/types';
import { MapErrorBoundary, MapUnavailable } from '@/components/map/MapFallback';
import { StopMarker } from '@/components/map/StopMarker';
import { VehicleMarker } from '@/components/map/VehicleMarker';

export interface TransitMapHandle {
  /** Recentre on a coordinate (tight zoom by default). */
  focusOn: (coordinate: LatLng, tight?: boolean) => void;
  /** Recentre on the user (falls back to the city if no fix). */
  focusUser: () => void;
  /** Recentre on Košice at the default city-level zoom. */
  focusCity: () => void;
  /** Map controls — driven by the floating buttons on the map screen. */
  zoomIn: () => void;
  zoomOut: () => void;
  /** "Moja poloha" — go to the user, or request permission if there's no fix. */
  recenter: () => void;
}

export interface TransitMapProps {
  vehicles: Vehicle[];
  userLocation?: LatLng | null;
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectStop?: (stopId: string) => void;
  modeFilter?: TransportMode | 'all';
  showStops?: boolean;
  /** Bottom inset for the native map (keeps the provider attribution above an
   *  overlaying bottom sheet). */
  bottomInset?: number;
  /** Called by the "Moja poloha" button when no fix is available yet — should
   *  (re)request the OS location permission. */
  onRequestLocation?: () => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const HIDDEN_STROKE = 'rgba(0,0,0,0)';

function inRegion(p: LatLng, r: Region): boolean {
  return (
    Math.abs(p.latitude - r.latitude) <= r.latitudeDelta / 2 + 0.004 &&
    Math.abs(p.longitude - r.longitude) <= r.longitudeDelta / 2 + 0.004
  );
}

function strokeForMode(mode: TransportMode): string {
  if (mode === 'tram') return 'rgba(255,199,33,0.85)'; // accentDeep
  if (mode === 'night') return 'rgba(107,122,144,0.7)'; // textSecondary
  return 'rgba(43,98,158,0.55)'; // primary — bus
}

/**
 * Košice transit map. A real geographic base map (react-native-maps — Apple Maps
 * on iOS, Google Maps on Android; no API key needed for Apple Maps / Expo Go)
 * with the MHD overlay on top:
 *
 *   geographic map → route polylines → stop markers → live vehicles → user dot
 *
 * The static DPMK network (`getRouteShapes` / `getStops`) supplies real stop
 * coordinates and route corridors; live vehicles come from the Ubian feed via
 * the `vehicles` prop. If the native map fails to load, `MapErrorBoundary`
 * swaps in a fallback and the rest of the screen keeps working.
 */
function TransitMapInner(
  {
    vehicles,
    userLocation,
    selectedVehicleId,
    onSelectVehicle,
    onSelectStop,
    modeFilter = 'all',
    showStops = true,
    bottomInset = 0,
    onRequestLocation,
  }: TransitMapProps,
  ref: React.Ref<TransitMapHandle>,
) {
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(mapConfig.initialRegion);
  const [region, setRegion] = useState<Region>(mapConfig.initialRegion);

  // --- static overlay data (computed once) ------------------------------
  // Every route corridor is rendered once and kept mounted for the life of the
  // map; the mode filter only changes each Polyline's stroke, never the set of
  // children. react-native-maps (1.20 / New Architecture, as shipped in Expo Go
  // SDK 54) crashes when many overlays are added or removed in one commit —
  // which is exactly what happened when a filter dropped ~50 bus polylines.
  // Invalid transport data must never reach a native overlay: every point is
  // range-checked (finite, lat -90..90, lng -180..180) and null-island points
  // are dropped before a Polyline / Marker is built from it.
  const routeShapes = useMemo(
    () =>
      getRouteShapes()
        .map((s) => ({ ...s, points: sanitizePath(s.points) }))
        .filter((s) => s.points.length >= 2),
    [],
  );
  const allStops = useMemo(() => getStops().filter(hasValidCoordinates), []);

  // Stops within the current viewport, nearest-to-centre first, capped — bounded
  // and only churns a few markers at a time while panning.
  const visibleStops = useMemo(() => {
    if (!showStops || !MAP_DEBUG.stops) return [];
    if (region.latitudeDelta > mapConfig.stopVisibilityLatitudeDelta) return [];
    return allStops
      .filter((s) => inRegion(s.location, region))
      .map((s) => ({
        s,
        d:
          (s.location.latitude - region.latitude) ** 2 +
          (s.location.longitude - region.longitude) ** 2,
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, mapConfig.maxStopMarkers)
      .map((x) => x.s);
  }, [showStops, region, allStops]);

  // One marker per vehicle currently in the feed. The filter only hides markers
  // (opacity 0) — it never removes them — so a filter tap can't churn the set.
  const drawnVehicles = useMemo(
    () => (MAP_DEBUG.vehicles ? vehicles.filter(hasValidCoordinates) : []),
    [vehicles],
  );
  const matchesFilter = useCallback(
    (mode: TransportMode) => modeFilter === 'all' || mode === modeFilter,
    [modeFilter],
  );

  // --- imperative focus API -------------------------------------------
  const animateTo = useCallback((coordinate: LatLng, latitudeDelta: number) => {
    if (!isValidLatLng(coordinate)) return;
    mapRef.current?.animateToRegion(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta,
        longitudeDelta: latitudeDelta,
      },
      350,
    );
  }, []);

  // --- controls -------------------------------------------------------
  const zoomBy = useCallback((mult: number) => {
    const r = regionRef.current;
    const latitudeDelta = clamp(
      r.latitudeDelta * mult,
      mapConfig.minLatitudeDelta,
      mapConfig.maxLatitudeDelta,
    );
    const longitudeDelta = clamp(
      r.longitudeDelta * mult,
      mapConfig.minLatitudeDelta,
      mapConfig.maxLatitudeDelta,
    );
    mapRef.current?.animateToRegion(
      { latitude: r.latitude, longitude: r.longitude, latitudeDelta, longitudeDelta },
      220,
    );
  }, []);

  const locate = useCallback(() => {
    if (userLocation) {
      animateTo(userLocation, mapConfig.focusLatitudeDelta);
    } else {
      // No fix yet — ask for permission, and meanwhile sit on the city.
      onRequestLocation?.();
      mapRef.current?.animateToRegion(mapConfig.initialRegion, 350);
    }
  }, [animateTo, userLocation, onRequestLocation]);

  useImperativeHandle(
    ref,
    () => ({
      focusOn: (coordinate, tight = true) =>
        animateTo(coordinate, tight ? mapConfig.focusLatitudeDelta : mapConfig.initialRegion.latitudeDelta),
      focusUser: () =>
        userLocation
          ? animateTo(userLocation, mapConfig.focusLatitudeDelta)
          : mapRef.current?.animateToRegion(mapConfig.initialRegion, 350),
      focusCity: () => mapRef.current?.animateToRegion(mapConfig.initialRegion, 350),
      zoomIn: () => zoomBy(0.5),
      zoomOut: () => zoomBy(2),
      recenter: locate,
    }),
    [animateTo, userLocation, zoomBy, locate],
  );

  // --- marker handlers (stable) -------------------------------------
  const handleStop = useCallback((stopId: string) => onSelectStop?.(stopId), [onSelectStop]);
  const focusStop = useCallback(
    (s: { location: LatLng }) => animateTo(s.location, mapConfig.focusLatitudeDelta),
    [animateTo],
  );
  const handleVehicle = useCallback(
    (v: Vehicle) => {
      animateTo(v.location, mapConfig.focusLatitudeDelta);
      onSelectVehicle?.(v);
    },
    [animateTo, onSelectVehicle],
  );

  const onRegionChangeComplete = useCallback((r: Region) => {
    regionRef.current = r;
    // Skip a state update (and the stop-marker recompute) when the map barely
    // moved — keeps idle re-renders out of the tree.
    setRegion((prev) => {
      const moved =
        Math.abs(prev.latitude - r.latitude) > 0.0006 ||
        Math.abs(prev.longitude - r.longitude) > 0.0006 ||
        Math.abs(prev.latitudeDelta - r.latitudeDelta) > 0.0006;
      return moved ? r : prev;
    });
  }, []);

  return (
    <MapErrorBoundary fallback={<MapUnavailable />}>
      <View style={{ flex: 1, backgroundColor: colors.mapLand }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={mapConfig.initialRegion}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation={MAP_DEBUG.userDot && isValidLatLng(userLocation)}
          showsMyLocationButton={false}
          showsPointsOfInterests
          showsBuildings
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          pitchEnabled={false}
          rotateEnabled
          loadingEnabled
          loadingBackgroundColor={colors.mapLand}
          loadingIndicatorColor={colors.primary}
          mapPadding={{ top: 132, right: 8, bottom: Math.max(8, bottomInset), left: 8 }}
        >
          {MAP_DEBUG.routes &&
            routeShapes.map((s) => {
              const on = matchesFilter(s.mode);
              return (
                <Polyline
                  key={s.routeId}
                  coordinates={s.points}
                  strokeColor={on ? strokeForMode(s.mode) : HIDDEN_STROKE}
                  strokeWidth={on ? (s.mode === 'tram' ? 3 : 2.5) : 0.5}
                  lineCap="round"
                  lineJoin="round"
                  tappable={false}
                />
              );
            })}

          {visibleStops.map((s) => (
            <StopMarker key={s.id} stop={s} onOpen={handleStop} onFocus={focusStop} />
          ))}

          {drawnVehicles.map((v) => (
            <VehicleMarker
              key={v.id}
              vehicle={v}
              selected={v.id === selectedVehicleId}
              hidden={!matchesFilter(v.mode)}
              onPress={handleVehicle}
            />
          ))}
        </MapView>
      </View>
    </MapErrorBoundary>
  );
}

export const TransitMap = forwardRef(TransitMapInner);
