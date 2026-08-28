import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radii, shadows } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  left?: React.ReactNode;
}

const HEIGHT: Record<ButtonSize, number> = { lg: 56, md: 52, sm: 44 };

/** Primary interactive control. `accent` is the yellow CTA from the design. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth = true,
  style,
  left,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string; shadow?: ViewStyle }> = {
    primary: { bg: colors.primary, fg: colors.white },
    accent: { bg: colors.accent, fg: colors.text, shadow: shadows.ticket },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.textSecondary },
    destructive: { bg: colors.surface, fg: colors.errorText, border: '#F3D4D2' },
  };
  const p = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          height: HEIGHT[size],
          borderRadius: size === 'sm' ? radii.chip : radii.button,
          backgroundColor: isDisabled ? '#EDF1F6' : p.bg,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? 16 : 22,
          opacity: pressed ? 0.9 : 1,
        },
        !isDisabled && variant === 'accent' && p.shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isDisabled ? colors.textTertiary : p.fg} />
      ) : (
        <>
          {left ? <View>{left}</View> : null}
          <Text
            variant={size === 'sm' ? 'body' : 'bodyStrong'}
            weight="extrabold"
            color={isDisabled ? '#A9B4C2' : p.fg}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
