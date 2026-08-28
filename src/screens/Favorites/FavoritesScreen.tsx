import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState } from '@/components/ui/StateViews';
import { colors } from '@/constants/theme';
import { PLACES } from '@/data/places';
import { getRoute } from '@/data/routes';
import { getStop, stopLabel } from '@/data/stops';
import { getStopDepartures } from '@/services/transportService';
import { useRootNavigation } from '@/navigation/hooks';
import {
  useFavoritePlaces,
  useFavoriteRoutes,
  useFavoriteStops,
  useFavoritesStore,
} from '@/store/useFavoritesStore';
import { formatRelativeMinutes } from '@/utils/format';

type Tab = 'places' | 'stops' | 'routes';

export function FavoritesScreen() {
  const navigation = useRootNavigation();
  const [tab, setTab] = useState<Tab>('places');
  const [picker, setPicker] = useState<'home' | 'work' | null>(null);

  const places = useFavoritePlaces();
  const stops = useFavoriteStops();
  const routes = useFavoriteRoutes();
  const setPlaceFromPlaceId = useFavoritesStore((s) => s.setPlaceFromPlaceId);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const toggleStop = useFavoritesStore((s) => s.toggleStop);
  const toggleRoute = useFavoritesStore((s) => s.toggleRoute);
  const toggleRouteAlerts = useFavoritesStore((s) => s.toggleRouteAlerts);

  const home = places.find((p) => p.slot === 'home');
  const work = places.find((p) => p.slot === 'work');

  return (
    <Screen scroll bottomInset={24}>
      <AppHeader title="Obľúbené" />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'places', label: 'Miesta' },
          { value: 'stops', label: 'Zastávky' },
          { value: 'routes', label: 'Linky' },
        ]}
      />

      <View style={{ marginTop: 16, gap: 10 }}>
        {tab === 'places' ? (
          <>
            <PlaceSlot label="Domov" icon="home" place={home?.placeName} onSet={() => setPicker('home')} />
            <PlaceSlot label="Práca" icon="briefcase" place={work?.placeName} onSet={() => setPicker('work')} />
            {places
              .filter((p) => p.slot === 'custom')
              .map((p) => (
                <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="bookmark" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="extrabold">
                      {p.label}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      {p.placeName}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeFavorite(p.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                  </Pressable>
                </Card>
              ))}
          </>
        ) : null}

        {tab === 'stops' ? (
          stops.length === 0 ? (
            <EmptyState
              title="Žiadne uložené zastávky"
              description="Ťuknite na hviezdičku pri ktorejkoľvek zastávke."
              actionLabel="Nájsť zastávky"
              onAction={() => navigation.navigate('NearbyStops')}
            />
          ) : (
            stops.map((f) => {
              const stop = getStop(f.stopId);
              const next = getStopDepartures(f.stopId, 3);
              return (
                <Card key={f.id} onPress={() => navigation.navigate('StopDetail', { stopId: f.stopId })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight="extrabold">
                        {stop ? stopLabel(stop) : f.name}
                      </Text>
                      <Text variant="caption" color={colors.textTertiary}>
                        {f.lines.slice(0, 6).join(' · ')}
                      </Text>
                    </View>
                    <Pressable onPress={() => toggleStop(f.stopId)} hitSlop={8}>
                      <Ionicons name="star" size={18} color={colors.accentDeep} />
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                    {next.map((d, i) => (
                      <View
                        key={i}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }}
                      >
                        <Text variant="caption" weight="extrabold" color={colors.primary}>
                          {d.routeShortName}
                        </Text>
                        <Text variant="caption" weight="bold">
                          {formatRelativeMinutes(d.inMinutes)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })
          )
        ) : null}

        {tab === 'routes' ? (
          routes.length === 0 ? (
            <EmptyState
              title="Žiadne uložené linky"
              description="Uložte linku z detailu vozidla alebo spojenia a majte odchody po ruke."
              actionLabel="Živé sledovanie"
              onAction={() => navigation.navigate('LiveTracking')}
            />
          ) : (
            routes.map((f) => (
              <Card key={f.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <RouteBadge shortName={f.shortName} mode={f.mode} size="md" />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="extrabold" numberOfLines={1}>
                      {f.headsign}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      {getRoute(f.shortName)?.headsigns.join(' ↔ ')}
                    </Text>
                  </View>
                  <Pressable onPress={() => toggleRoute(f.shortName, f.headsign)} hitSlop={8}>
                    <Ionicons name="star" size={18} color={colors.accentDeep} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
                    Upozornenia na výluky a meškania
                  </Text>
                  <Toggle value={f.alertsEnabled} onValueChange={() => toggleRouteAlerts(f.id)} />
                </View>
              </Card>
            ))
          )
        ) : null}
      </View>

      <Modal transparent visible={picker !== null} animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setPicker(null)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 40, gap: 8 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDE3EB', alignSelf: 'center', marginBottom: 8 }} />
          <Text variant="sectionTitle">Vyberte miesto</Text>
          {PLACES.slice(0, 8).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                if (picker) setPlaceFromPlaceId(picker, p.id);
                setPicker(null);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
            >
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold">
                  {p.name}
                </Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {p.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Modal>
    </Screen>
  );
}

function PlaceSlot({
  label,
  icon,
  place,
  onSet,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  place?: string;
  onSet: () => void;
}) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="extrabold">
          {label}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          {place ?? 'Nenastavené'}
        </Text>
      </View>
      <Button label={place ? 'Zmeniť' : 'Nastaviť'} size="sm" fullWidth={false} variant="secondary" onPress={onSet} />
    </Card>
  );
}
