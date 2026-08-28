import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/constants/theme';
import { PLACES, PLACE_BY_ID, searchPlaces } from '@/data/places';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { selectHomePlace, selectWorkPlace, useFavoritesStore } from '@/store/useFavoritesStore';

const CURRENT_LOCATION = 'current';
const RECENT_IDS = ['pl-divadlo', 'pl-unlp', 'pl-letisko', 'pl-optima'];

export function PlannerScreen() {
  const navigation = useRootNavigation();
  const params = useRoute<RouteProp<RootStackParamList, 'Planner'>>().params;

  const home = useFavoritesStore(selectHomePlace);
  const work = useFavoritesStore(selectWorkPlace);

  const [from, setFrom] = useState<string>(params?.fromPlaceId ?? CURRENT_LOCATION);
  const [to, setTo] = useState<string | null>(params?.toPlaceId ?? null);
  const [active, setActive] = useState<'from' | 'to' | null>(to ? null : 'to');
  const [query, setQuery] = useState('');

  const results = useMemo(() => (active ? searchPlaces(query).slice(0, 8) : []), [active, query]);

  const labelFor = (id: string | null): string => {
    if (!id) return '';
    if (id === CURRENT_LOCATION) return 'Aktuálna poloha';
    return PLACE_BY_ID[id]?.name ?? id;
  };

  const pick = (id: string) => {
    if (active === 'from') setFrom(id);
    else if (active === 'to') setTo(id);
    setActive(null);
    setQuery('');
  };

  const swap = () => {
    if (from === CURRENT_LOCATION || !to) return;
    setFrom(to);
    setTo(from);
  };

  const search = () => {
    const fromId = from === CURRENT_LOCATION ? 'pl-hlavna' : from;
    if (!to) return;
    navigation.navigate('Results', { fromPlaceId: fromId, toPlaceId: to });
  };

  return (
    <Screen scroll padded={false}>
      <AppHeader title="Naplánovať cestu" />

      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Card>
          <Pressable
            onPress={() => {
              setActive('from');
              setQuery('');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: colors.primary }} />
            <Text variant="bodyStrong" weight="bold" color={active === 'from' ? colors.primary : colors.text} style={{ flex: 1 }}>
              {labelFor(from) || 'Odkiaľ'}
            </Text>
            {from === CURRENT_LOCATION ? (
              <View style={{ backgroundColor: colors.primaryTint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text variant="overline" color={colors.primary}>
                  GPS
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => {
              setActive('to');
              setQuery('');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
          >
            <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.accentDeep }} />
            <Text
              variant="bodyStrong"
              weight="bold"
              color={to ? (active === 'to' ? colors.primary : colors.text) : colors.textTertiary}
              style={{ flex: 1 }}
            >
              {labelFor(to) || 'Kam'}
            </Text>
            <Pressable onPress={swap} hitSlop={10}>
              <Ionicons name="swap-vertical" size={18} color={colors.textSecondary} />
            </Pressable>
          </Pressable>
        </Card>

        {active ? (
          <View style={{ gap: 8 }}>
            <TextField
              autoFocus
              placeholder="Zadajte zastávku, adresu alebo miesto"
              value={query}
              onChangeText={setQuery}
            />
            {active === 'from' ? (
              <Pressable
                onPress={() => pick(CURRENT_LOCATION)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
              >
                <Ionicons name="locate" size={18} color={colors.primary} />
                <Text variant="body" weight="bold" color={colors.primary}>
                  Použiť aktuálnu polohu
                </Text>
              </Pressable>
            ) : null}
            {results.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => pick(place.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                  padding: 13,
                }}
              >
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">
                    {place.name}
                  </Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    {place.subtitle}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <View style={{ gap: 10 }}>
              <SectionHeading title="Uložené miesta" overline />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <SavedPlaceButton
                  label="Domov"
                  sub={home?.placeName ?? 'Nastaviť v Obľúbených'}
                  onPress={() => (home ? navigation.navigate('Results', { fromPlaceId: 'pl-hlavna', toPlaceId: nearestPlaceId(home.nearestStopId) }) : navigation.navigate('Favorites'))}
                />
                <SavedPlaceButton
                  label="Práca"
                  sub={work?.placeName ?? 'Nastaviť v Obľúbených'}
                  onPress={() => (work ? navigation.navigate('Results', { fromPlaceId: 'pl-hlavna', toPlaceId: nearestPlaceId(work.nearestStopId) }) : navigation.navigate('Favorites'))}
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <SectionHeading title="Nedávne" overline />
              {RECENT_IDS.map((id) => {
                const place = PLACE_BY_ID[id];
                if (!place) return null;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      setTo(id);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 16,
                      padding: 13,
                    }}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight="bold">
                        {place.name}
                      </Text>
                      <Text variant="caption" color={colors.textTertiary}>
                        {place.subtitle}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Button label="Vyhľadať spojenie" variant="accent" size="lg" disabled={!to} onPress={search} />
          </>
        )}
      </View>
    </Screen>
  );
}

function nearestPlaceId(stopId: string): string {
  return PLACES.find((p) => p.nearestStopId === stopId)?.id ?? 'pl-hlavna';
}

function SavedPlaceButton({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 13,
      }}
    >
      <Text variant="body" weight="extrabold">
        {label}
      </Text>
      <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={{ marginTop: 2 }}>
        {sub}
      </Text>
    </Pressable>
  );
}
