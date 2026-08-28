import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radii } from '@/constants/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  multiline?: boolean;
}

/** Labelled text input with error / hint states. */
export function TextField({ label, error, hint, multiline, ...rest }: TextFieldProps) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="caption" weight="extrabold" color="#4A5B72">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        {...rest}
        style={{
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: error ? '#F3C9C6' : colors.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 13,
          minHeight: multiline ? 92 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 14,
          color: colors.text,
        }}
      />
      {error ? (
        <Text variant="caption" weight="bold" color={colors.errorText}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={colors.textTertiary}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
