import { View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/theme';

export interface IconCircleProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
  background?: string;
  dimension?: number;
  radius?: number;
  style?: ViewStyle;
}

/** Rounded-square icon tile used throughout list rows and quick actions. */
export function IconCircle({
  name,
  size = 18,
  color = colors.primary,
  background = colors.primaryTint,
  dimension = 38,
  radius = 12,
  style,
}: IconCircleProps) {
  return (
    <View
      style={[
        {
          width: dimension,
          height: dimension,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}
