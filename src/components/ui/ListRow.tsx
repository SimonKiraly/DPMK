import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  onPress?: () => void;
  badge?: { label: string; tone?: BadgeTone };
  value?: string;
  chevron?: boolean;
  divider?: boolean;
}

/** Generic list row for menus and settings groups. */
export function ListRow({
  title,
  subtitle,
  left,
  onPress,
  badge,
  value,
  chevron = true,
  divider = true,
}: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 15,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: '#F2F5F9',
        backgroundColor: pressed && onPress ? colors.surfaceAlt : 'transparent',
      })}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="bold">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
      {value ? (
        <Text variant="caption" weight="bold" color={colors.textSecondary}>
          {value}
        </Text>
      ) : null}
      {chevron && onPress ? <Ionicons name="chevron-forward" size={16} color="#C2CBD8" /> : null}
    </Pressable>
  );
}
