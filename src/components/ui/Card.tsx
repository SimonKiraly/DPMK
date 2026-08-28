import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { colors, radii, shadows } from '@/constants/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
  selected?: boolean;
  dashed?: boolean;
}

/** Rounded white surface — the workhorse container across the app. */
export function Card({
  children,
  onPress,
  style,
  padded = true,
  elevated = true,
  selected = false,
  dashed = false,
}: CardProps) {
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: selected ? 2 : 1,
    borderColor: selected ? colors.primary : colors.border,
    borderStyle: dashed ? 'dashed' : 'solid',
    padding: padded ? 16 : 0,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, elevated && shadows.card, pressed && { opacity: 0.96 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, elevated && shadows.card, style]}>{children}</View>;
}
