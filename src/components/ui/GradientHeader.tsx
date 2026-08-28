import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/theme';

export interface GradientHeaderProps {
  children: ReactNode;
  /** Extra bottom padding, e.g. when a card overlaps the header edge. */
  paddingBottom?: number;
  round?: boolean;
  style?: ViewStyle;
}

/** The blue hero block used on Home, Tickets, Wallet, Menu. */
export function GradientHeader({ children, paddingBottom = 24, round = true, style }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.primary, '#22507F']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[
        {
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom,
          borderBottomLeftRadius: round ? radii.sheet + 4 : 0,
          borderBottomRightRadius: round ? radii.sheet + 4 : 0,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 190,
          height: 190,
          borderRadius: 95,
          backgroundColor: 'rgba(255,213,56,0.12)',
        }}
      />
      {children}
    </LinearGradient>
  );
}
