import { Pressable, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import type { ServiceAlert } from '@/types';
import { alertVisual, ALERT_TYPE_LABEL } from '@/utils/alerts';

export interface AlertStripProps {
  alerts: ServiceAlert[];
  onPress: (alert: ServiceAlert) => void;
  style?: ViewStyle;
}

/**
 * Compact disruption strip for context screens (StopDetail). Shows the single
 * most important active alert; a trailing "+N" when there are more. Renders
 * nothing when `alerts` is empty.
 */
export function AlertStrip({ alerts, onPress, style }: AlertStripProps) {
  if (alerts.length === 0) return null;
  const [top, ...rest] = alerts;
  const v = alertVisual(top);
  const routes = top.affectedRoutes.slice(0, 3).join(', ');

  return (
    <Pressable
      onPress={() => onPress(top)}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: v.tint,
          borderWidth: 1,
          borderColor: v.border,
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 12,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          backgroundColor: v.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={v.icon} size={14} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" weight="extrabold" color={v.body} numberOfLines={1}>
          {routes ? `${routes} · ${top.title}` : top.title}
        </Text>
        <Text variant="overline" color={colors.textTertiary} numberOfLines={1}>
          {ALERT_TYPE_LABEL[top.type]}
          {rest.length ? ` · +${rest.length} ďalšie` : ''}
        </Text>
      </View>
      <Text variant="caption" weight="bold" color={v.body}>
        Viac
      </Text>
      <Ionicons name="chevron-forward" size={16} color={v.body} />
    </Pressable>
  );
}
