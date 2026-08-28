import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import type { Occupancy } from '@/types';

const CONFIG: Record<Occupancy, { label: string; filled: number; color: string }> = {
  quiet: { label: 'Voľno', filled: 1, color: colors.success },
  busy: { label: 'Obsadené', filled: 2, color: colors.accentDeep },
  full: { label: 'Plné', filled: 3, color: colors.error },
};

export function OccupancyDots({ occupancy }: { occupancy: Occupancy }) {
  const c = CONFIG[occupancy];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 14,
              height: 5,
              borderRadius: 3,
              backgroundColor: i < c.filled ? c.color : '#E2E8F0',
            }}
          />
        ))}
      </View>
      <Text variant="overline" color={colors.textTertiary}>
        {c.label}
      </Text>
    </View>
  );
}
