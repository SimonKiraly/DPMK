import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { TransportStatusBanner } from '@/components/ui/TransportStatusBanner';
import { OccupancyDots } from '@/components/transport/OccupancyDots';
import { TransitMap } from '@/components/map/TransitMap';
import { colors, shadows } from '@/constants/theme';
import { useLiveVehicles } from '@/hooks/useLiveVehicles';
import { useNearbyStops } from '@/hooks/useNearbyStops';
import { stopLabel } from '@/data/stops';
import { useRootNavigation } from '@/navigation/hooks';
import type { TransportMode } from '@/types';
import { formatRelativeMinutes } from '@/utils/format';

const FILTERS: { value: TransportMode | 'all'; label: string }[] = [
  { value: 'all', label: 'Všetko' },
  { value: 'bus', label: 'Autobus' },
  { value: 'tram', label: 'Električka' },
  { value: 'night', label: 'Nočné' },
  { value: 'rail', label: 'Vlak' },
];

export function LiveMapScreen() {
  const navigation = useRootNavigation();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<TransportMode | 'all'>('all');
  const vehicles = useLiveVehicles({ mode });
  const { stops, origin, usingFallback } = useNearbyStops({ limit: 4 });

  const visibleCount = vehicles.length;
  const nearbyPreview = useMemo(() => stops.slice(0, 3), [stops]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.mapLand }}>
      <TransitMap
        vehicles={vehicles}
        modeFilter={mode}
        userLocation={usingFallback ? null : origin}
        onSelectVehicle={(v) => navigation.navigate('VehicleDetail', { vehicleId: v.id })}
        onSelectStop={(stopId) => navigation.navigate('StopDetail', { stopId })}
      />

      {/* top controls */}
      <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8 }}>
        <SearchField
          placeholder="Hľadať linku, zastávku alebo miesto"
          onPress={() => navigation.navigate('LiveTracking')}
          elevated
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: 10 }}
        >
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} selected={mode === f.value} onPress={() => setMode(f.value)} />
          ))}
        </ScrollView>
        <TransportStatusBanner style={{ marginTop: 8 }} />
      </View>

      {/* bottom sheet */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 12,
          ...shadows.float,
        }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDE3EB', alignSelf: 'center', marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text variant="sectionTitle">Vo vašom okolí</Text>
          <Pressable onPress={() => navigation.navigate('NearbyStops')} hitSlop={8}>
            <Text variant="caption" weight="bold" color={colors.primary}>
              Zoznam
            </Text>
          </Pressable>
        </View>
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
          {visibleCount} vozidiel naživo
        </Text>

        <View style={{ marginTop: 10, gap: 8 }}>
          {nearbyPreview.map((n) => (
            <Pressable
              key={n.stop.id}
              onPress={() => navigation.navigate('StopDetail', { stopId: n.stop.id })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: colors.primaryTint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="location" size={15} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" weight="extrabold" numberOfLines={1}>
                  {stopLabel(n.stop)}
                </Text>
                <Text variant="overline" color={colors.textTertiary}>
                  {n.stop.lines.slice(0, 5).join(' · ')}
                </Text>
              </View>
              {n.departures[0] ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <RouteBadge shortName={n.departures[0].routeShortName} mode={n.departures[0].mode} size="sm" />
                  <Text variant="caption" weight="extrabold">
                    {formatRelativeMinutes(n.departures[0].inMinutes)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
