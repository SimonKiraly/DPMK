import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { RouteBadge } from '@/components/ui/RouteBadge';
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
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <RouteBadge shortName={vehicle.routeShortName} mode={vehicle.mode} size="lg" />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="extrabold" numberOfLines={1}>
          {vehicle.headsign}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }} numberOfLines={1}>
          Blíži sa k {vehicle.nextStopName}
        </Text>
        <View style={{ marginTop: 7 }}>
          <OccupancyDots occupancy={vehicle.occupancy} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="sectionTitle">{formatRelativeMinutes(vehicle.etaNextStopMinutes)}</Text>
        <Text
          variant="caption"
          weight="bold"
          color={vehicle.delay.onTime ? colors.success : colors.error}
        >
          {vehicle.delay.label}
        </Text>
      </View>
    </Card>
  );
}
