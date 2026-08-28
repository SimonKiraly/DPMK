import { View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { UNAVAILABLE_MESSAGE } from '@/constants/config';
import { colors, radii } from '@/constants/theme';
import { useTransportStatusStore } from '@/store/useTransportStatusStore';

/**
 * Shown when the live DPMK / Ubian feed failed and the app fell back to sample
 * data. Silent (renders nothing) while data is flowing or in mock mode.
 */
export function TransportStatusBanner({ style }: { style?: ViewStyle }) {
  const degraded = useTransportStatusStore((s) => s.degraded);
  const live = useTransportStatusStore((s) => s.live);

  if (!live || !degraded) return null;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          backgroundColor: colors.warningTint,
          borderWidth: 1,
          borderColor: '#F2E4B4',
          borderRadius: radii.chip,
          paddingVertical: 10,
          paddingHorizontal: 12,
        },
        style,
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
      <Text variant="caption" weight="bold" color={colors.warning} style={{ flex: 1 }}>
        {UNAVAILABLE_MESSAGE}
      </Text>
    </View>
  );
}
