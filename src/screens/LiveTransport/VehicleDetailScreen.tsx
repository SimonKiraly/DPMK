import { useEffect, useState } from 'react';
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
import { EmptyState } from '@/components/ui/StateViews';
import { OccupancyDots } from '@/components/transport/OccupancyDots';
import { StopTimeline } from '@/components/transport/StopTimeline';
import { colors } from '@/constants/theme';
import { getRoute } from '@/data/routes';
import { useInterval } from '@/hooks/useInterval';
import { getVehicleDetail } from '@/services/transportService';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import type { RootStackParamList } from '@/navigation/types';
import type { VehicleDetail } from '@/types';
import { formatRelativeMinutes } from '@/utils/format';

export function VehicleDetailScreen() {
  const { vehicleId } = useRoute<RouteProp<RootStackParamList, 'VehicleDetail'>>().params;
  const [detail, setDetail] = useState<VehicleDetail | undefined>(() => getVehicleDetail(vehicleId));

  useInterval(() => setDetail(getVehicleDetail(vehicleId)), 2000);
  useEffect(() => setDetail(getVehicleDetail(vehicleId)), [vehicleId]);

  const route = detail ? getRoute(detail.routeShortName) : undefined;
  const toggleRoute = useFavoritesStore((s) => s.toggleRoute);
  const isSaved = useFavoritesStore((s) => (route ? s.isRouteSaved(route.id) : false));

  if (!detail) {
    return (
      <Screen>
        <AppHeader title="Detail vozidla" />
        <EmptyState title="Vozidlo už nie je v prevádzke" description="Vráťte sa na zoznam a vyberte iné." />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <Button
          label={isSaved ? 'Linka uložená v obľúbených' : 'Uložiť linku'}
          variant={isSaved ? 'secondary' : 'primary'}
          left={<Ionicons name={isSaved ? 'star' : 'star-outline'} size={16} color={isSaved ? colors.primary : colors.white} />}
          onPress={() => route && toggleRoute(route.shortName, detail.headsign)}
        />
      }
    >
      <AppHeader
        title={`Linka ${detail.routeShortName}`}
        subtitle={`Vozidlo ${detail.plate}`}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
            <Text variant="overline" color={colors.success}>
              LIVE
            </Text>
          </View>
        }
      />

      <Card style={{ marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <RouteBadge shortName={detail.routeShortName} mode={detail.mode} size="lg" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              → {detail.headsign}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {detail.lowFloor ? 'Nízkopodlažné · klimatizácia' : 'Štandardné vozidlo'}
            </Text>
          </View>
          <StatusBadge
            label={detail.delay.onTime ? 'Načas' : detail.delay.label}
            tone={detail.delay.onTime ? 'success' : 'warning'}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 12 }}>
            <Text variant="overline" color={colors.textTertiary}>
              Najbližšia zastávka
            </Text>
            <Text variant="body" weight="extrabold" style={{ marginTop: 3 }} numberOfLines={1}>
              {detail.nextStopName}
            </Text>
          </View>
          <View style={{ width: 104, backgroundColor: colors.warningTint, borderRadius: 16, padding: 12 }}>
            <Text variant="overline" color={colors.warning}>
              Príchod
            </Text>
            <Text variant="sectionTitle" style={{ marginTop: 3 }}>
              {formatRelativeMinutes(detail.etaNextStopMinutes)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <OccupancyDots occupancy={detail.occupancy} />
        </View>
      </Card>

      <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 22, marginBottom: 12 }}>
        Zastávky na trase
      </Text>
      <StopTimeline entries={detail.timeline} />
    </Screen>
  );
}
