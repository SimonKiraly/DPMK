import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  type PanGestureHandlerStateChangeEvent,
  type PinchGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { colors, modeColors, shadows } from '@/constants/theme';
import { getRouteShapes, getStops } from '@/services/transportService';
import type { LatLng, TransportMode, Vehicle } from '@/types';
import { WORLD_HEIGHT, WORLD_WIDTH, project } from '@/components/map/projection';

export interface TransitMapProps {
  vehicles: Vehicle[];
  userLocation?: LatLng | null;
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectStop?: (stopId: string) => void;
  modeFilter?: TransportMode | 'all';
  showStops?: boolean;
}

const MIN_SCALE = 0.55;
const MAX_SCALE = 3.2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Lightweight schematic transit map: pan + pinch + zoom controls over an
 * SVG-drawn network with live vehicle markers. No native map SDK / API key,
 * so it runs in Expo Go and on web. Swap for `react-native-maps` or MapLibre
 * later — `project()` already gives geo→screen coordinates.
 */
export function TransitMap({
  vehicles,
  userLocation,
  selectedVehicleId,
  onSelectVehicle,
  onSelectStop,
  modeFilter = 'all',
  showStops = true,
}: TransitMapProps) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const routeShapes = useMemo(() => getRouteShapes(), []);
  const stops = useMemo(() => getStops(), []);

  // --- gesture / transform state ---------------------------------------
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panOffset = useRef({ x: 0, y: 0 }).current;
  const baseScale = useRef(1);
  const pinch = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const panRef = useRef(null);
  const pinchRef = useRef(null);

  const fitScale = useMemo(() => {
    if (!viewport.width || !viewport.height) return 1;
    return clamp(
      Math.min(viewport.width / WORLD_WIDTH, viewport.height / WORLD_HEIGHT) * 0.92,
      MIN_SCALE,
      MAX_SCALE,
    );
  }, [viewport]);

  const initialised = useRef(false);

  const handleLayout = (width: number, height: number) => {
    // Guard against re-setting an identical size — a fresh {width,height}
    // object every layout pass would re-run dependent memos needlessly.
    setViewport((v) => (v.width === width && v.height === height ? v : { width, height }));
    if (initialised.current || width === 0) return;
    initialised.current = true;
    const fit = clamp(Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT) * 0.92, MIN_SCALE, MAX_SCALE);
    baseScale.current = fit;
    scale.setValue(fit);
    const cx = (width - WORLD_WIDTH) / 2;
    const cy = (height - WORLD_HEIGHT) / 2;
    panOffset.x = cx;
    panOffset.y = cy;
    pan.setOffset({ x: cx, y: cy });
    pan.setValue({ x: 0, y: 0 });
  };

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: pan.x, translationY: pan.y } }],
    { useNativeDriver: true },
  );

  const onPanStateChange = (e: PanGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      panOffset.x += e.nativeEvent.translationX;
      panOffset.y += e.nativeEvent.translationY;
      pan.setOffset({ x: panOffset.x, y: panOffset.y });
      pan.setValue({ x: 0, y: 0 });
    }
  };

  const onPinchEvent = Animated.event([{ nativeEvent: { scale: pinch } }], { useNativeDriver: true });

  const onPinchStateChange = (e: PinchGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      baseScale.current = clamp(baseScale.current * e.nativeEvent.scale, MIN_SCALE, MAX_SCALE);
      scale.setValue(baseScale.current);
      pinch.setValue(1);
    }
  };

  const zoomBy = (factor: number) => {
    baseScale.current = clamp(baseScale.current * factor, MIN_SCALE, MAX_SCALE);
    Animated.spring(scale, { toValue: baseScale.current, useNativeDriver: true, friction: 8 }).start();
    pinch.setValue(1);
  };

  const recenter = () => {
    const cx = (viewport.width - WORLD_WIDTH) / 2;
    const cy = (viewport.height - WORLD_HEIGHT) / 2;
    panOffset.x = cx;
    panOffset.y = cy;
    pan.setOffset({ x: cx, y: cy });
    pan.setValue({ x: 0, y: 0 });
    baseScale.current = fitScale;
    pinch.setValue(1);
    Animated.spring(scale, { toValue: fitScale, useNativeDriver: true, friction: 8 }).start();
  };

  const composedScale = Animated.multiply(scale, pinch);
  const visibleVehicles = vehicles.filter((v) => modeFilter === 'all' || v.mode === modeFilter);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.mapLand, overflow: 'hidden' }}
      onLayout={(e) => handleLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
    >
      <PinchGestureHandler
        ref={pinchRef}
        simultaneousHandlers={panRef}
        onGestureEvent={onPinchEvent}
        onHandlerStateChange={onPinchStateChange}
      >
        <Animated.View style={{ flex: 1 }}>
          <PanGestureHandler
            ref={panRef}
            simultaneousHandlers={pinchRef}
            minDist={2}
            onGestureEvent={onPanEvent}
            onHandlerStateChange={onPanStateChange}
          >
            <Animated.View style={{ flex: 1 }}>
              <Animated.View
                style={{
                  width: WORLD_WIDTH,
                  height: WORLD_HEIGHT,
                  transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: composedScale }],
                }}
              >
                <Svg width={WORLD_WIDTH} height={WORLD_HEIGHT}>
                  {/* schematic land / water shapes */}
                  <Rect x={0} y={0} width={WORLD_WIDTH} height={WORLD_HEIGHT} fill={colors.mapLand} />
                  <Rect
                    x={WORLD_WIDTH * 0.62}
                    y={-40}
                    width={90}
                    height={WORLD_HEIGHT + 80}
                    fill={colors.mapWater}
                    opacity={0.7}
                  />
                  <Rect
                    x={-40}
                    y={WORLD_HEIGHT * 0.44}
                    width={WORLD_WIDTH + 80}
                    height={70}
                    fill={colors.mapLandAlt}
                  />

                  {/* route polylines */}
                  {routeShapes
                    .filter((r) => modeFilter === 'all' || r.mode === modeFilter)
                    .map((shape) => {
                      const pts = shape.points
                        .map((p) => {
                          const { x, y } = project(p);
                          return `${x},${y}`;
                        })
                        .join(' ');
                      return (
                        <Polyline
                          key={shape.routeId}
                          points={pts}
                          fill="none"
                          stroke={shape.mode === 'tram' ? colors.accentDeep : colors.primary}
                          strokeOpacity={0.55}
                          strokeWidth={5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    })}

                  {/* stops */}
                  {showStops &&
                    stops.map((stop) => {
                      const { x, y } = project(stop.location);
                      return (
                        <Circle
                          key={stop.id}
                          cx={x}
                          cy={y}
                          r={5}
                          fill={colors.white}
                          stroke={colors.primary}
                          strokeWidth={3}
                          onPress={() => onSelectStop?.(stop.id)}
                        />
                      );
                    })}

                  {userLocation
                    ? (() => {
                        const { x, y } = project(userLocation);
                        return <Circle cx={x} cy={y} r={8} fill={colors.primary} stroke={colors.white} strokeWidth={4} />;
                      })()
                    : null}
                </Svg>

                {/* vehicle markers (Pressable overlay) */}
                {visibleVehicles.map((v) => {
                  const { x, y } = project(v.location);
                  const selected = v.id === selectedVehicleId;
                  const c = modeColors[v.mode];
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => onSelectVehicle?.(v)}
                      style={{
                        position: 'absolute',
                        left: x - 17,
                        top: y - 17,
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        backgroundColor: c.bg,
                        borderWidth: 3,
                        borderColor: selected ? colors.text : colors.white,
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...shadows.float,
                      }}
                    >
                      <Text variant="caption" weight="extrabold" color={c.fg}>
                        {v.routeShortName}
                      </Text>
                    </Pressable>
                  );
                })}
              </Animated.View>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>

      {/* zoom / recenter controls */}
      <View style={{ position: 'absolute', right: 14, bottom: 14, gap: 8 }}>
        <MapButton icon="add" onPress={() => zoomBy(1.4)} />
        <MapButton icon="remove" onPress={() => zoomBy(1 / 1.4)} />
        <MapButton icon="locate" onPress={recenter} />
      </View>
    </View>
  );
}

function MapButton({ icon, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.float,
      }}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
    </Pressable>
  );
}
