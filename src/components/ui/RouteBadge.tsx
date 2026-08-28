import { View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { modeColors } from '@/constants/theme';
import type { TransportMode } from '@/types';

export interface RouteBadgeProps {
  shortName: string;
  mode: TransportMode;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const DIMS = {
  sm: { minWidth: 30, height: 26, radius: 8, variant: 'caption' as const },
  md: { minWidth: 40, height: 40, radius: 12, variant: 'bodyStrong' as const },
  lg: { minWidth: 50, height: 50, radius: 15, variant: 'sectionTitle' as const },
};

/** Line-number badge, colour-coded by transport mode. */
export function RouteBadge({ shortName, mode, size = 'md', style }: RouteBadgeProps) {
  const d = DIMS[size];
  const c = modeColors[mode];
  return (
    <View
      style={[
        {
          minWidth: d.minWidth,
          height: d.height,
          paddingHorizontal: 6,
          borderRadius: d.radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.bg,
        },
        style,
      ]}
    >
      <Text variant={d.variant} weight="extrabold" color={c.fg}>
        {shortName}
      </Text>
    </View>
  );
}
