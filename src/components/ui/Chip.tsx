import { Pressable } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radii } from '@/constants/theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** Filter chip — selected = solid blue, otherwise outlined. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height: 34,
        paddingHorizontal: 14,
        borderRadius: radii.chip,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text variant="caption" weight="extrabold" color={selected ? colors.white : colors.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}
