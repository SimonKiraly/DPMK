import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import type { ServiceAlert } from '@/types';
import {
  ALERT_TYPE_LABEL,
  alertStopsText,
  alertVisual,
  alertWhenText,
  routeMode,
  SEVERITY_LABEL,
} from '@/utils/alerts';

export interface AlertCardProps {
  alert: ServiceAlert;
  onPress?: () => void;
}

/**
 * Reusable disruption card — severity indicator, type, title, affected route
 * badges, affected stop(s), validity and a short description. Never dumps
 * `rawText`. Tap opens `AlertDetail`.
 */
export function AlertCard({ alert, onPress }: AlertCardProps) {
  const v = alertVisual(alert);
  const when = alertWhenText(alert);
  const stops = alertStopsText(alert);

  return (
    <Card onPress={onPress} padded={false} style={{ overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: v.accent }} />
        <View style={{ flex: 1, padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 9,
                backgroundColor: v.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={v.icon} size={15} color={colors.white} />
            </View>
            <Text variant="overline" color={colors.textTertiary} style={{ flex: 1 }} numberOfLines={1}>
              {ALERT_TYPE_LABEL[alert.type]}
            </Text>
            <StatusBadge label={SEVERITY_LABEL[alert.severity]} tone={v.tone} />
          </View>

          <Text variant="bodyStrong" numberOfLines={2}>
            {alert.title}
          </Text>

          {alert.affectedRoutes.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {alert.affectedRoutes.map((r) => (
                <RouteBadge key={r} shortName={r} mode={routeMode(r)} size="sm" />
              ))}
            </View>
          ) : null}

          {stops ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
              <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
                {stops}
              </Text>
            </View>
          ) : null}

          {when ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {when}
              </Text>
            </View>
          ) : null}

          {alert.description ? (
            <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {alert.description}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
