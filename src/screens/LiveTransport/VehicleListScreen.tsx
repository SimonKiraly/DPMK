import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { AppHeader } from '@/components/ui/AppHeader';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/StateViews';
import { VehicleCard } from '@/components/transport/VehicleCard';
import { colors } from '@/constants/theme';
import { useLiveVehicles } from '@/hooks/useLiveVehicles';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import type { TransportMode } from '@/types';

const FILTERS: { value: TransportMode | 'all'; label: string }[] = [
  { value: 'all', label: 'Všetko' },
  { value: 'bus', label: 'Autobus' },
  { value: 'tram', label: 'Električka' },
  { value: 'night', label: 'Nočné' },
];

export function VehicleListScreen() {
  const navigation = useRootNavigation();
  const params = useRoute<RouteProp<RootStackParamList, 'LiveTracking'>>().params;
  const [query, setQuery] = useState(params?.query ?? '');
  const [mode, setMode] = useState<TransportMode | 'all'>('all');

  const vehicles = useLiveVehicles({ mode, query });

  return (
    <Screen scroll padded={false} background="#FFFFFF">
      <AppHeader
        title="Živé sledovanie"
        background="#FFFFFF"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
            <Text variant="overline" color={colors.success}>
              LIVE
            </Text>
          </View>
        }
      />

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <SearchField
          placeholder="Zadajte číslo linky alebo smer"
          value={query}
          onChangeText={setQuery}
          elevated={false}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} selected={mode === f.value} onPress={() => setMode(f.value)} />
          ))}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 9, backgroundColor: colors.bg, flex: 1, paddingBottom: 24 }}>
        <SectionHeading title={`${vehicles.length} vozidiel naživo`} overline />
        {vehicles.length === 0 ? (
          <EmptyState title="Nič nenájdené" description="Skúste iné číslo linky alebo zmeňte filter." dashed />
        ) : (
          vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onPress={() => navigation.navigate('VehicleDetail', { vehicleId: v.id })} />
          ))
        )}
      </View>
    </Screen>
  );
}
