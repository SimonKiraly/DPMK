import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import { getRoute } from '@/data/routes';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import type { JourneyLeg } from '@/types';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { formatClock, formatDuration, formatEuros } from '@/utils/format';

export function JourneyDetailScreen() {
  const navigation = useRootNavigation();
  const { journey } = useRoute<RouteProp<RootStackParamList, 'JourneyDetail'>>().params;

  const firstRide = journey.legs.find((l) => l.kind === 'ride' && l.routeShortName);
  const route = firstRide?.routeShortName ? getRoute(firstRide.routeShortName) : undefined;
  const toggleRoute = useFavoritesStore((s) => s.toggleRoute);
  const isRouteSaved = useFavoritesStore((s) => (route ? s.isRouteSaved(route.id) : false));

  return (
    <Screen
      scroll
      footer={
        <View style={{ gap: 10 }}>
          {route ? (
            <Button
              label={isRouteSaved ? 'Trasa uložená' : 'Uložiť trasu'}
              variant="secondary"
              left={<Ionicons name={isRouteSaved ? 'star' : 'star-outline'} size={16} color={colors.primary} />}
              onPress={() => toggleRoute(route.shortName, firstRide?.headsign ?? route.headsigns[0])}
            />
          ) : null}
          <Button
            label="Kúpiť lístok · €1,10"
            variant="accent"
            size="lg"
            onPress={() => navigation.navigate('Checkout', { productId: 't30min', fareClass: 'standard' })}
          />
        </View>
      }
    >
      <AppHeader title="Detail spojenia" subtitle={`${formatClock(journey.departure)} → ${formatClock(journey.arrival)}`} />

      <Card style={{ marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="screenTitle">{formatDuration(journey.durationMinutes)}</Text>
          <StatusBadge
            label={journey.delay.onTime ? 'Načas' : journey.delay.label}
            tone={journey.delay.onTime ? 'success' : 'error'}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
          <Meta label="Prestupy" value={journey.transfers === 0 ? 'Bez prestupu' : `${journey.transfers}×`} />
          <Meta label="Chôdza" value={`${journey.walkMinutes} min`} />
          <Meta label="Cestovné" value={formatEuros(journey.fareEuros)} />
          <Meta label="Bezbariérové" value={journey.accessible ? 'Áno' : 'Nie'} />
        </View>
      </Card>

      <View style={{ marginTop: 16 }}>
        {journey.legs.map((leg, i) => (
          <LegRow key={i} leg={leg} last={i === journey.legs.length - 1} />
        ))}
      </View>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="overline" color={colors.textTertiary}>
        {label}
      </Text>
      <Text variant="body" weight="extrabold" style={{ marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function LegRow({ leg, last }: { leg: JourneyLeg; last: boolean }) {
  const isWalk = leg.kind === 'walk';
  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      <View style={{ width: 44, alignItems: 'center' }}>
        {isWalk ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: '#F1F4F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="walk" size={18} color={colors.textSecondary} />
          </View>
        ) : (
          <RouteBadge shortName={leg.routeShortName ?? '?'} mode={leg.mode ?? 'bus'} size="md" />
        )}
        {!last ? <View style={{ flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 }} /> : null}
      </View>

      <View style={{ flex: 1, paddingBottom: last ? 0 : 22 }}>
        <Text variant="caption" weight="bold" color={colors.textSecondary}>
          {formatClock(leg.departure)} · {leg.fromName}
        </Text>
        <Text variant="body" weight="extrabold" style={{ marginTop: 4 }}>
          {isWalk
            ? `Chôdza ${leg.durationMinutes} min`
            : `${leg.mode === 'tram' ? 'Električka' : leg.mode === 'rail' ? 'Vlak' : 'Autobus'} ${leg.routeShortName} → ${leg.headsign ?? leg.toName}`}
        </Text>
        {!isWalk && leg.stopCount ? (
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
            {leg.stopCount} zastávok · {leg.durationMinutes} min
          </Text>
        ) : null}
        <Text variant="caption" weight="bold" color={colors.textSecondary} style={{ marginTop: 6 }}>
          {formatClock(leg.arrival)} · {leg.toName}
        </Text>
      </View>
    </View>
  );
}
