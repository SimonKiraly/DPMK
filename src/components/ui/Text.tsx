import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/constants/theme';

type Variant = keyof typeof typography;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  /** Convenience weight override without changing the variant. */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
}

const WEIGHT_FAMILY: Record<NonNullable<TextProps['weight']>, string> = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

/** Typed text primitive bound to the MHD Košice type scale. */
export function Text({ variant = 'body', color, center, weight, style, ...rest }: TextProps) {
  const base = typography[variant] as TextStyle;
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: color ?? colors.text },
        center && { textAlign: 'center' },
        weight && { fontFamily: WEIGHT_FAMILY[weight] },
        style,
      ]}
    />
  );
}
