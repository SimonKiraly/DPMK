import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, shadows } from '@/constants/theme';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  /** Distance from the bottom edge — set to clear the LiveMap bottom sheet. */
  bottom: number;
  /** Whether the "my location" button shows as active (permission granted). */
  locateActive?: boolean;
}

/** Minimal map control stack: zoom in / out / recenter — matches the app UI. */
export function MapControls({ onZoomIn, onZoomOut, onLocate, bottom, locateActive }: Props) {
  return (
    <View style={{ position: 'absolute', right: 14, bottom, gap: 8 }}>
      <View style={{ borderRadius: 14, overflow: 'hidden', ...shadows.float }}>
        <ControlButton icon="add" onPress={onZoomIn} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <ControlButton icon="remove" onPress={onZoomOut} />
      </View>
      <ControlButton
        icon="locate"
        onPress={onLocate}
        rounded
        tint={locateActive ? colors.primary : colors.textTertiary}
      />
    </View>
  );
}

function ControlButton({
  icon,
  onPress,
  rounded = false,
  tint = colors.primary,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  rounded?: boolean;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
        borderRadius: rounded ? 14 : 0,
        ...(rounded ? shadows.float : {}),
      })}
    >
      <Ionicons name={icon} size={20} color={tint} />
    </Pressable>
  );
}
