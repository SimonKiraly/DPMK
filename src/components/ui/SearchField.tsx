import { Pressable, TextInput, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { colors, radii, shadows } from '@/constants/theme';

export interface SearchFieldProps {
  value?: string;
  placeholder: string;
  onChangeText?: (text: string) => void;
  /** When set, the field behaves as a button (navigates elsewhere). */
  onPress?: () => void;
  editable?: boolean;
  autoFocus?: boolean;
  trailingLabel?: string;
  style?: ViewStyle;
  elevated?: boolean;
}

/** Search bar — either an editable input or a pressable that opens a search screen. */
export function SearchField({
  value,
  placeholder,
  onChangeText,
  onPress,
  editable = true,
  autoFocus,
  trailingLabel,
  style,
  elevated = true,
}: SearchFieldProps) {
  const body = (
    <View
      style={[
        {
          height: 54,
          borderRadius: 18,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
        },
        elevated && shadows.card,
        style,
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      {onPress ? (
        <Text variant="bodyStrong" weight="semibold" color={colors.textTertiary} style={{ flex: 1 }}>
          {value || placeholder}
        </Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          editable={editable}
          autoFocus={autoFocus}
          style={{ flex: 1, fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: colors.text }}
        />
      )}
      {trailingLabel ? (
        <View style={{ backgroundColor: colors.primaryTint, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text variant="caption" weight="bold" color={colors.primary}>
            {trailingLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.95 } : undefined)}>
        {body}
      </Pressable>
    );
  }
  return body;
}
