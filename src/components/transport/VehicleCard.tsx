import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { OccupancyDots } from '@/components/transport/OccupancyDots';
import { colors } from '@/constants/theme';
import type { Vehicle } from '@/types';
import { formatRelativeMinutes } from '@/utils/format';

export interface VehicleCardProps {
  vehicle: Vehicle;
  onPress?: () => void;
}

/** Live vehicle summary row used in the tracking list. */
export function VehicleCard({ vehicle, onPress }: VehicleCardProps) {
  const hasNextStop = !!vehicle.nextStopName;
  const hasEta = vehicle.etaNextStopMinutes > 0;

  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <RouteBadge shortName={vehicle.routeShortName} mode={vehicle.mode} size="lg" />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="extrabold" numberOfLines={1}>
          {vehicle.headsign}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }} numberOfLines={1}>
          {hasNextStop
            ? `Blíži sa k ${vehicle.nextStopName}`
            : vehicle.atStop
              ? 'Stojí na zastávke'
              : `Linka ${vehicle.routeShortName}`}
        </Text>
        {vehicle.source !== 'live' ? (
          <View style={{ marginTop: 7 }}>
            <OccupancyDots occupancy={vehicle.occupancy} />
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        {hasEta ? (
          <Text variant="sectionTitle">{formatRelativeMinutes(vehicle.etaNextStopMinutes)}</Text>
        ) : (
          <StatusBadge
            label={vehicle.delay.onTime ? 'Načas' : vehicle.delay.label}
            tone={vehicle.delay.onTime ? 'success' : 'warning'}
          />
        )}
        {hasEta ? (
          <Text
            variant="caption"
            weight="bold"
            color={vehicle.delay.onTime ? colors.success : colors.error}
          >
            {vehicle.delay.label}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
