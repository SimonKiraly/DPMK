import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RouteBadge } from '@/components/ui/RouteBadge';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/StateViews';
import { colors } from '@/constants/theme';
import type { LatLng, TransportMode, Vehicle } from '@/types';
import { formatRelativeMinutes } from '@/utils/format';

/**
 * Web build of `TransitMap`.
 *
 * `react-native-maps` has no browser implementation (its own `MapView.web.ts`
 * resolves to an "unimplemented view" stub, and `Marker`/`Polyline`/`Callout`
 * have none at all) — so this file replaces the whole component for the web
 * platform rather than letting Metro reach into that package. Same props/ref
 * shape as the native `TransitMap`, so `LiveMapScreen` needs no changes.
 *
 * Real functionality, not a fake map: the live MHD fleet is still shown, as a
 * list a visitor can scroll and tap through to `VehicleDetail` — the useful
 * part of the map screen (which vehicles are running, right now) survives on
 * web; only the geographic rendering does not.
 */
export interface TransitMapHandle {
  focusOn: (coordinate: LatLng, tight?: boolean) => void;
  focusUser: () => void;
  focusCity: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
}

export interface TransitMapProps {
  vehicles: Vehicle[];
  userLocation?: LatLng | null;
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectStop?: (stopId: string) => void;
  modeFilter?: TransportMode | 'all';
  showStops?: boolean;
  bottomInset?: number;
  onRequestLocation?: () => void;
}

function TransitMapWebInner(
  { vehicles, selectedVehicleId, onSelectVehicle, modeFilter = 'all', bottomInset = 0, onRequestLocation }: TransitMapProps,
  ref: React.Ref<TransitMapHandle>,
) {
  // No canvas to pan/zoom on web — "recenter" is the one action that still
  // means something (re-ask for location); the rest are no-ops, not crashes.
  useImperativeHandle(
    ref,
    () => ({
      focusOn: () => {},
      focusUser: () => {},
      focusCity: () => {},
      zoomIn: () => {},
      zoomOut: () => {},
      recenter: () => onRequestLocation?.(),
    }),
    [onRequestLocation],
  );

  const visible = useMemo(
    () => (modeFilter === 'all' ? vehicles : vehicles.filter((v) => v.mode === modeFilter)),
    [vehicles, modeFilter],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.mapLand }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 140, paddingBottom: bottomInset + 24, gap: 10 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            padding: 14,
          }}
        >
          <Ionicons name="map-outline" size={20} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
            Interaktívna mapa je dostupná v mobilnej aplikácii. Vo webovej verzii nižšie nájdete
            zoznam vozidiel naživo.
          </Text>
        </View>

        {visible.length === 0 ? (
          <EmptyState
            title="Žiadne vozidlá naživo"
            description="Skúste zmeniť filter alebo to skúste znova o chvíľu."
            icon="bus-outline"
          />
        ) : (
          visible.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => onSelectVehicle?.(v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.surface,
                borderWidth: v.id === selectedVehicleId ? 2 : 1,
                borderColor: v.id === selectedVehicleId ? colors.primary : colors.border,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <RouteBadge shortName={v.routeShortName} mode={v.mode} size="md" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  → {v.headsign}
                </Text>
                {v.nextStopName ? (
                  <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    Najbližšia zastávka: {v.nextStopName}
                  </Text>
                ) : null}
              </View>
              {v.etaNextStopMinutes > 0 ? (
                <Text variant="bodyStrong" color={v.delay.onTime ? colors.text : colors.warning}>
                  {formatRelativeMinutes(v.etaNextStopMinutes)}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export const TransitMap = forwardRef(TransitMapWebInner);
