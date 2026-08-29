import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows } from '@/constants/theme';
import { SheetHandle } from '@/components/ui/SheetHandle';

export interface BottomSheetHandle {
  /** Animate to a snap index (0 = most collapsed). */
  snapTo: (index: number) => void;
  expand: () => void;
  collapse: () => void;
}

export interface BottomSheetProps {
  /**
   * Snap heights as fractions of the window height, **ascending**. Pass a stable
   * array reference (module constant). Default: collapsed / half / expanded.
   */
  snapPoints?: number[];
  /** Snap index shown first (default: the middle one). */
  initialIndex?: number;
  /** Fired after the sheet settles on a snap point. */
  onSnap?: (index: number) => void;
  /** Pinned directly under the handle — always visible, part of the drag area. */
  header?: ReactNode;
  children?: ReactNode;
  /**
   * Content rendered in a floating layer that rides the sheet's top edge (e.g.
   * map zoom controls). Right-aligned, grows upward, fades out near expanded,
   * and taps pass through the gaps.
   */
  floating?: ReactNode;
  background?: string;
  /** Extra style for the sheet surface. */
  style?: ViewStyle;
}

const SPRING = {
  damping: 20,
  stiffness: 210,
  mass: 0.5,
  overshootClamping: false,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 2,
} as const;

const DEFAULT_SNAPS = [0.24, 0.55, 0.9];

/**
 * A reusable draggable bottom sheet. Grab the handle (or the header) and drag;
 * on release it springs to the nearest snap point, taking the fling velocity
 * into account. Heights are fractions of the screen so it adapts to every
 * device, and the expanded state respects the top safe-area inset.
 */
function BottomSheetInner(
  {
    snapPoints = DEFAULT_SNAPS,
    initialIndex,
    onSnap,
    header,
    children,
    floating,
    background = colors.surface,
    style,
  }: BottomSheetProps,
  ref: React.Ref<BottomSheetHandle>,
) {
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Geometry --------------------------------------------------------------
  const { sheetH, offsets, maxOffset, startIndex } = useMemo(() => {
    const points = [...snapPoints].sort((a, b) => a - b);
    const ceiling = winH - insets.top - 8; // never cover the status bar
    const heights = points.map((p) => Math.min(Math.max(p, 0.12) * winH, ceiling));
    const h = heights[heights.length - 1];
    // translateY offset per snap: 0 = fully expanded, larger = more collapsed
    const offs = heights.map((hi) => h - hi);
    const start = Math.min(
      Math.max(initialIndex ?? Math.floor(points.length / 2), 0),
      points.length - 1,
    );
    return { sheetH: h, offsets: offs, maxOffset: offs[0], startIndex: start };
  }, [snapPoints, initialIndex, winH, insets.top]);

  const translateY = useSharedValue(offsets[startIndex]);
  const dragStart = useSharedValue(0);
  const [index, setIndex] = useState(startIndex);

  const settle = useCallback(
    (i: number) => {
      setIndex(i);
      onSnap?.(i);
    },
    [onSnap],
  );

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.min(Math.max(i, 0), offsets.length - 1);
      translateY.value = withSpring(offsets[clamped], SPRING);
      settle(clamped);
    },
    [offsets, settle, translateY],
  );

  // Re-seat if the geometry changes after mount (rotation / font scaling).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    translateY.value = withSpring(offsets[Math.min(index, offsets.length - 1)], SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetH, maxOffset]);

  useImperativeHandle(
    ref,
    () => ({
      snapTo: (i) => goTo(i),
      expand: () => goTo(offsets.length - 1),
      collapse: () => goTo(0),
    }),
    [goTo, offsets.length],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          dragStart.value = translateY.value;
        })
        .onUpdate((e) => {
          const next = dragStart.value + e.translationY;
          // light rubber-band past the fully-expanded edge
          translateY.value = next < 0 ? next * 0.25 : Math.min(next, maxOffset);
        })
        .onEnd((e) => {
          const projected = translateY.value + e.velocityY * 0.1;
          let best = 0;
          let bestDist = Infinity;
          for (let i = 0; i < offsets.length; i += 1) {
            const d = Math.abs(offsets[i] - projected);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          }
          translateY.value = withSpring(offsets[best], { ...SPRING, velocity: e.velocityY });
          runOnJS(settle)(best);
        }),
    [offsets, maxOffset, dragStart, translateY, settle],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(
      translateY.value,
      [0, Math.max(maxOffset * 0.35, 1)],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <>
      {floating != null ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            { position: 'absolute', left: 0, right: 0, bottom: sheetH, alignItems: 'flex-end' },
            floatStyle,
          ]}
        >
          <View pointerEvents="box-none" style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
            {floating}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: sheetH,
            backgroundColor: background,
            borderTopLeftRadius: radii.sheet,
            borderTopRightRadius: radii.sheet,
            ...shadows.float,
          },
          sheetStyle,
          style,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View>
            <SheetHandle />
            {header != null ? <View style={{ paddingHorizontal: 20 }}>{header}</View> : null}
          </View>
        </GestureDetector>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: insets.bottom + 12 }}>
          {children}
        </View>
      </Animated.View>
    </>
  );
}

export const BottomSheet = forwardRef(BottomSheetInner);
