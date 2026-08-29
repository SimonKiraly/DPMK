import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { TransportStatusBanner } from '@/components/ui/TransportStatusBanner';
import { MapControls } from '@/components/map/MapControls';
import { MapErrorBoundary } from '@/components/map/MapFallback';
import { TransitMap, type TransitMapHandle } from '@/components/map/TransitMap';
import { colors } from '@/constants/theme';
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
];

/** collapsed / half / expanded — fractions of the screen height. */
const SHEET_SNAPS = [0.22, 0.5, 0.86];

export function LiveMapScreen() {
  const navigation = useRootNavigation();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const mapRef = useRef<TransitMapHandle>(null);
  const [mode, setMode] = useState<TransportMode | 'all'>('all');

  // The map gets the whole fleet and hides non-matching markers itself; the
  // sheet header shows the count that matches the current filter.
  const vehicles = useLiveVehicles();
  const { stops, origin, usingFallback, requestPermission } = useNearbyStops({ limit: 4 });

  const visibleCount = useMemo(
    () => (mode === 'all' ? vehicles.length : vehicles.filter((v) => v.mode === mode).length),
    [vehicles, mode],
  );
  const nearbyPreview = useMemo(() => stops.slice(0, 3), [stops]);

  const sheetHeader = (
    <>
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
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.mapLand }}>
      <MapErrorBoundary>
        <TransitMap
          ref={mapRef}
          vehicles={vehicles}
          modeFilter={mode}
          userLocation={usingFallback ? null : origin}
          onRequestLocation={requestPermission}
          bottomInset={Math.round(winH * SHEET_SNAPS[0]) + 8}
          onSelectVehicle={(v) => navigation.navigate('VehicleDetail', { vehicleId: v.id })}
          onSelectStop={(stopId) => navigation.navigate('StopDetail', { stopId })}
        />
      </MapErrorBoundary>

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

      <BottomSheet
        snapPoints={SHEET_SNAPS}
        initialIndex={1}
        header={sheetHeader}
        floating={
          <MapControls
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            onLocate={() => mapRef.current?.recenter()}
            locateActive={!usingFallback}
          />
        }
      >
        <View style={{ marginTop: 12, gap: 8 }}>
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
      </BottomSheet>
    </View>
  );
}
