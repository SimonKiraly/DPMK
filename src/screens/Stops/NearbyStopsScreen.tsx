import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { TransportStatusBanner } from '@/components/ui/TransportStatusBanner';
import { StopCard } from '@/components/transport/StopCard';
import { colors } from '@/constants/theme';
import { useNearbyStops } from '@/hooks/useNearbyStops';
import { useRootNavigation } from '@/navigation/hooks';
import { useFavoriteStops, useFavoritesStore } from '@/store/useFavoritesStore';
import type { TransportMode } from '@/types';

const FILTERS: { value: TransportMode | 'all'; label: string }[] = [
  { value: 'all', label: 'Všetko' },
  { value: 'bus', label: 'Autobus' },
  { value: 'tram', label: 'Električka' },
  { value: 'rail', label: 'Vlak' },
];

export function NearbyStopsScreen() {
  const navigation = useRootNavigation();
  const [mode, setMode] = useState<TransportMode | 'all'>('all');
  const { stops, loading, error, permission, usingFallback, refresh, requestPermission } = useNearbyStops({
    mode,
    limit: 12,
  });

  // Subscribe to the saved list so the star toggles re-render this screen.
  const savedStops = useFavoriteStops();
  const isStopSaved = (stopId: string) => savedStops.some((f) => f.stopId === stopId);
  const toggleStop = useFavoritesStore((s) => s.toggleStop);

  return (
    <Screen scroll padded={false} background="#FFFFFF" refreshing={loading} onRefresh={refresh}>
      <AppHeader title="Zastávky v okolí" background="#FFFFFF" />

      <View style={{ paddingHorizontal: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} selected={mode === f.value} onPress={() => setMode(f.value)} />
          ))}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 10, backgroundColor: colors.bg, flex: 1, paddingBottom: 24 }}>
        <TransportStatusBanner />
        {usingFallback && permission !== 'granted' ? (
          <View
            style={{
              backgroundColor: colors.primaryTint,
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" weight="bold" color={colors.primary}>
                Poloha nie je povolená
              </Text>
              <Text variant="overline" color={colors.textSecondary} style={{ marginTop: 2 }}>
                Zobrazujeme zastávky v centre Košíc.
              </Text>
            </View>
            <Button label="Povoliť" size="sm" fullWidth={false} onPress={requestPermission} />
          </View>
        ) : null}

        {loading && stops.length === 0 ? <LoadingState label="Hľadám zastávky…" /> : null}
        {error ? <ErrorState message={error} onRetry={refresh} /> : null}
        {!loading && stops.length === 0 && !error ? (
          <EmptyState title="Žiadne zastávky v okolí" description="Skúste zmeniť filter alebo obnoviť." />
        ) : null}

        {stops.map((n) => (
          <StopCard
            key={n.stop.id}
            nearby={n}
            saved={isStopSaved(n.stop.id)}
            onToggleSave={() => toggleStop(n.stop.id)}
            onPress={() => navigation.navigate('StopDetail', { stopId: n.stop.id })}
          />
        ))}
      </View>
    </Screen>
  );
}
