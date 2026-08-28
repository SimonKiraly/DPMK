import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import type { Journey } from '@/types';
import { formatClock, formatDuration, formatEuros } from '@/utils/format';

export interface RouteResultCardProps {
  journey: Journey;
  onPress?: () => void;
}

/** Journey-planner result summary. */
export function RouteResultCard({ journey, onPress }: RouteResultCardProps) {
  const rideLegs = journey.legs.filter((l) => l.kind === 'ride');

  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {journey.fastest ? <StatusBadge label="Najrýchlejšie" tone="accent" /> : null}
          <Text variant="screenTitle">{formatDuration(journey.durationMinutes)}</Text>
        </View>
        <Text
          variant="body"
          weight="bold"
          color={journey.delay.onTime ? colors.success : colors.error}
        >
          {journey.delay.onTime ? 'Načas' : journey.delay.label}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {rideLegs.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="walk" size={16} color={colors.textSecondary} />
            <Text variant="caption" weight="bold" color={colors.textSecondary}>
              Pešo celú trasu
            </Text>
          </View>
        ) : (
          rideLegs.map((leg, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <RouteBadge shortName={leg.routeShortName ?? '?'} mode={leg.mode ?? 'bus'} size="sm" />
              {i < rideLegs.length - 1 ? (
                <Ionicons name="chevron-forward" size={12} color="#B4BFCC" />
              ) : null}
            </View>
          ))
        )}
        <Text variant="caption" weight="bold" color={colors.textSecondary} style={{ marginLeft: 4 }}>
          {journey.walkMinutes} min chôdze
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Text variant="caption" color={colors.textSecondary}>
          {formatClock(journey.departure)} → {formatClock(journey.arrival)}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {journey.transfers === 0 ? 'Bez prestupu' : `${journey.transfers}× prestup`} · {formatEuros(journey.fareEuros)}
        </Text>
      </View>
    </Card>
  );
}
