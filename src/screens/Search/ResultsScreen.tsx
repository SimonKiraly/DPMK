import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { AppHeader } from '@/components/ui/AppHeader';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { RouteResultCard } from '@/components/transport/RouteResultCard';
import { PLACE_BY_ID } from '@/data/places';
import { planJourneysBetweenPlaces } from '@/services/transportService';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import type { Journey, JourneyPreference } from '@/types';
import { formatClock } from '@/utils/format';

const PREFERENCES: { value: JourneyPreference; label: string }[] = [
  { value: 'fastest', label: 'Najrýchlejšie' },
  { value: 'fewest_transfers', label: 'Najmenej prestupov' },
  { value: 'least_walking', label: 'Najmenej chôdze' },
  { value: 'accessible', label: 'Bezbariérové' },
];

export function ResultsScreen() {
  const navigation = useRootNavigation();
  const { fromPlaceId, toPlaceId, departAt } = useRoute<RouteProp<RootStackParamList, 'Results'>>().params;

  const from = PLACE_BY_ID[fromPlaceId];
  const to = PLACE_BY_ID[toPlaceId];

  const [preference, setPreference] = useState<JourneyPreference>('fastest');
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    planJourneysBetweenPlaces(fromPlaceId, toPlaceId, { preference, departAt })
      .then((result) => {
        if (cancelled) return;
        setJourneys(result);
        setState('ready');
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [fromPlaceId, toPlaceId, preference, departAt]);

  const subtitle = useMemo(() => {
    const time = departAt ? formatClock(departAt) : formatClock(new Date());
    return `Odchod ${time} · ${journeys.length} možností`;
  }, [departAt, journeys.length]);

  return (
    <Screen scroll padded={false} background="#FFFFFF">
      <AppHeader title={`${from?.name ?? '—'} → ${to?.name ?? '—'}`} subtitle={subtitle} background="#FFFFFF" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingBottom: 14 }}
      >
        {PREFERENCES.map((p) => (
          <Chip key={p.value} label={p.label} selected={preference === p.value} onPress={() => setPreference(p.value)} />
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 6, gap: 10, backgroundColor: '#F4F6F9', flex: 1, paddingBottom: 24 }}>
        {state === 'loading' ? <LoadingState label="Hľadám spojenia…" /> : null}
        {state === 'error' ? <ErrorState message="Spojenia sa nepodarilo načítať." onRetry={() => setPreference((p) => p)} /> : null}
        {state === 'ready' && journeys.length === 0 ? (
          <EmptyState title="Žiadne spojenie" description="Skúste iné miesto alebo čas odchodu." />
        ) : null}
        {state === 'ready'
          ? journeys.map((journey) => (
              <RouteResultCard
                key={journey.id}
                journey={journey}
                onPress={() => navigation.navigate('JourneyDetail', { journey })}
              />
            ))
          : null}
      </View>
    </Screen>
  );
}
