import { Pressable, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

export interface SectionHeadingProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  /** Small uppercase label style instead of the section title. */
  overline?: boolean;
}

export function SectionHeading({ title, actionLabel, onAction, style, overline }: SectionHeadingProps) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
        style,
      ]}
    >
      {overline ? (
        <Text variant="overline" color={colors.textTertiary}>
          {title}
        </Text>
      ) : (
        <Text variant="sectionTitle">{title}</Text>
      )}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="caption" weight="bold" color={colors.primary}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
