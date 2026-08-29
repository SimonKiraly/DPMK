import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { SheetHandle } from '@/components/ui/SheetHandle';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max sheet height as a fraction of the window (default 0.7). */
  maxHeightFraction?: number;
  contentStyle?: ViewStyle;
}

const IN_SPRING = { damping: 22, stiffness: 240, mass: 0.6 } as const;
const CLOSE_DISTANCE = 0.28; // fraction of the sheet dragged before it dismisses
const CLOSE_VELOCITY = 900;

/**
 * A bottom sheet presented modally: a backdrop, a grab handle, a slide-in
 * animation and drag-down-to-dismiss. Replaces the hand-rolled `<Modal>` +
 * overlay + rounded panel used by the option pickers across the app.
 */
export function ModalSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightFraction = 0.7,
  contentStyle,
}: ModalSheetProps) {
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetH = Math.min(maxHeightFraction * winH, winH - insets.top - 40);

  const [rendered, setRendered] = useState(visible);
  const translateY = useSharedValue(sheetH);
  const dragStart = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      translateY.value = withSpring(0, IN_SPRING);
    } else if (rendered) {
      translateY.value = withTiming(sheetH, { duration: 200 }, (done) => {
        if (done) runOnJS(setRendered)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(0, dragStart.value + e.translationY);
    })
    .onEnd((e) => {
      if (translateY.value > sheetH * CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        translateY.value = withTiming(sheetH, { duration: 180 }, (done) => {
          if (done) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, IN_SPRING);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetH], [1, 0], Extrapolation.CLAMP),
  }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!rendered) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Modal content lives outside the app's root view, so it needs its own
          GestureHandlerRootView for the drag-to-dismiss gesture to work. */}
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }, backdropStyle]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Zavrieť" />
        </Animated.View>

        <Animated.View
          style={[
            {
              maxHeight: sheetH,
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.sheet,
              borderTopRightRadius: radii.sheet,
              paddingBottom: insets.bottom + 16,
              ...shadows.float,
            },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View>
              <SheetHandle />
              {title ? (
                <Text variant="sectionTitle" style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
                  {title}
                </Text>
              ) : null}
            </View>
          </GestureDetector>

          <View style={[{ paddingHorizontal: 20, flexShrink: 1, minHeight: 0 }, contentStyle]}>
            {children}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
