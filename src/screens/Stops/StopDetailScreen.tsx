import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { DepartureRow } from '@/components/transport/DepartureChip';
import { colors } from '@/constants/theme';
import { getRoute } from '@/data/routes';
import { getStop, stopLabel } from '@/data/stops';
import { useInterval } from '@/hooks/useInterval';
import { getStopDetail } from '@/services/transportService';
import { useRootNavigation } from '@/navigation/hooks';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import type { Departure } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

export function StopDetailScreen() {
  const navigation = useRootNavigation();
  const { stopId } = useRoute<RouteProp<RootStackParamList, 'StopDetail'>>().params;
  const stop = getStop(stopId);

  const [departures, setDepartures] = useState<Departure[] | null>(null);
  const isSaved = useFavoritesStore((s) => s.isStopSaved(stopId));
  const toggleStop = useFavoritesStore((s) => s.toggleStop);

  const reload = () => getStopDetail(stopId).then((r) => setDepartures(r?.departures ?? []));
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopId]);
  useInterval(reload, 5000);

  const lines = useMemo(() => (stop ? stop.lines.map((l) => ({ shortName: l, mode: getRoute(l)?.mode ?? 'bus' })) : []), [stop]);

  if (!stop) {
    return (
      <Screen>
        <AppHeader title="Zastávka" />
        <EmptyState title="Zastávka sa nenašla" />
      </Screen>
    );
  }

  return (
    <Screen scroll bottomInset={96}>
      <AppHeader
        title={stop.name}
        subtitle={stop.platform ? `${stop.platform} · Zóna ${stop.zone}` : `Zóna ${stop.zone}`}
        right={
          <Button
            label={isSaved ? 'Uložené' : 'Uložiť'}
            size="sm"
            fullWidth={false}
            variant={isSaved ? 'accent' : 'secondary'}
            onPress={() => toggleStop(stopId)}
          />
        }
      />

      <Card style={{ marginTop: 4 }}>
        <Text variant="overline" color={colors.textTertiary}>
          Linky na tejto zastávke
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {lines.map((l) => (
            <RouteBadge key={l.shortName} shortName={l.shortName} mode={l.mode} size="sm" />
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button
          label="Zobraziť na mape"
          variant="secondary"
          left={<Ionicons name="map-outline" size={16} color={colors.primary} />}
          onPress={() => navigation.navigate('Main', { screen: 'MapTab' })}
        />
        <Button
          label="Naplánovať"
          variant="secondary"
          left={<Ionicons name="navigate-outline" size={16} color={colors.primary} />}
          onPress={() => navigation.navigate('Planner')}
        />
      </View>

      <Text variant="sectionTitle" style={{ marginTop: 22, marginBottom: 10 }}>
        Najbližšie odchody
      </Text>

      {departures === null ? (
        <LoadingState />
      ) : departures.length === 0 ? (
        <EmptyState title="Žiadne odchody" description="V najbližšom čase nič nepremáva." />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: 15 }}>
          {departures.map((d, i) => (
            <DepartureRow key={`${d.routeShortName}-${d.time}-${i}`} departure={d} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
