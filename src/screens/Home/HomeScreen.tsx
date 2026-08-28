import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { RouteBadge } from '@/components/ui/RouteBadge';
import { SearchField } from '@/components/ui/SearchField';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/StateViews';
import { ActiveTicketBanner } from '@/components/tickets/ActiveTicketBanner';
import { StopCard } from '@/components/transport/StopCard';
import { colors } from '@/constants/theme';
import { getStop, stopLabel } from '@/data/stops';
import { useNearbyStops } from '@/hooks/useNearbyStops';
import { getStopDepartures } from '@/services/transportService';
import { useRootNavigation } from '@/navigation/hooks';
import { useFavoriteStops } from '@/store/useFavoritesStore';
import { selectActiveTicket, useTicketStore } from '@/store/useTicketStore';
import { useNotificationsByKind } from '@/store/useNotificationStore';
import { useUserStore } from '@/store/useUserStore';
import { formatRelativeMinutes } from '@/utils/format';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return 'Dobré ráno';
  if (h < 18) return 'Dobrý deň';
  return 'Dobrý večer';
}

const QUICK_ACTIONS = [
  { key: 'plan', label: 'Nájsť spojenie', icon: 'navigate' as const },
  { key: 'live', label: 'Live MHD', icon: 'bus' as const },
  { key: 'ticket', label: 'Kúpiť lístok', icon: 'ticket' as const },
  { key: 'stops', label: 'Zastávky v okolí', icon: 'location' as const },
];

export function HomeScreen() {
  const navigation = useRootNavigation();
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);
  const activeTicket = useTicketStore(selectActiveTicket);
  const favoriteStops = useFavoriteStops();
  const alerts = useNotificationsByKind('disruption').slice(0, 1);

  const { stops: nearby, usingFallback } = useNearbyStops({ limit: 3 });

  const upcoming = useMemo(() => {
    // Prefer a saved favourite that is also in the nearby result (has live data),
    // otherwise the closest nearby stop.
    const favMatch = favoriteStops
      .map((f) => nearby.find((n) => n.stop.id === f.stopId))
      .find((n): n is NonNullable<typeof n> => !!n);
    const chosen = favMatch ?? nearby[0];
    if (chosen) return { stop: chosen.stop, departures: chosen.departures.slice(0, 3) };

    // Fallback: a mock stop (favourite not near, or no location yet).
    const source = favoriteStops[0]?.stopId;
    const stop = source ? getStop(source) : undefined;
    return stop ? { stop, departures: getStopDepartures(stop.id, 3) } : null;
  }, [favoriteStops, nearby]);

  const goQuick = (key: string) => {
    if (key === 'plan') navigation.navigate('Planner');
    else if (key === 'live') navigation.navigate('LiveTracking');
    else if (key === 'ticket') navigation.navigate('Main', { screen: 'TicketsTab' });
    else if (key === 'stops') navigation.navigate('NearbyStops');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        <GradientHeader paddingBottom={22}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location" size={13} color={colors.accent} />
                <Text variant="overline" color="rgba(255,255,255,0.7)">
                  {usingFallback ? 'Košice · Staré Mesto' : 'Vaša poloha'}
                </Text>
              </View>
              <Text variant="screenTitle" color={colors.white} style={{ marginTop: 6 }}>
                {greeting()}
                {user ? `, ${user.fullName.split(' ')[0]}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <HeaderButton icon="notifications-outline" onPress={() => navigation.navigate('Main', { screen: 'NotificationsTab' })} />
              <Pressable
                onPress={() => navigation.navigate('Profile')}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="bodyStrong" weight="extrabold" color={colors.text}>
                  {user?.initials ?? 'MHD'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 18 }}>
            <SearchField
              placeholder="Kam cestujete?"
              onPress={() => navigation.navigate('Planner')}
              trailingLabel="Naplánovať"
            />
          </View>
        </GradientHeader>

        {/* quick actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, gap: 10 }}
        >
          {QUICK_ACTIONS.map((qa) => (
            <Pressable
              key={qa.key}
              onPress={() => goQuick(qa.key)}
              style={{
                width: 92,
                borderRadius: 18,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 12,
                paddingHorizontal: 6,
                alignItems: 'center',
                gap: 8,
              }}
            >
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
                <Ionicons name={qa.icon} size={19} color={colors.primary} />
              </View>
              <Text variant="caption" weight="bold" center numberOfLines={2}>
                {qa.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 22 }}>
          {/* active ticket */}
          {activeTicket ? (
            <ActiveTicketBanner ticket={activeTicket} onPress={() => navigation.navigate('ActiveTicket', { ticketId: activeTicket.id })} />
          ) : (
            <EmptyState
              title="Žiadny aktívny lístok"
              description="Kúpte si 30 alebo 60-minútový prestupný lístok pred nástupom — dve ťuknutia, od €1,10."
              actionLabel="Kúpiť lístok"
              onAction={() => navigation.navigate('Main', { screen: 'TicketsTab' })}
            />
          )}

          {/* service alert */}
          {alerts.map((alert) => (
            <Pressable key={alert.id} onPress={() => navigation.navigate('Main', { screen: 'NotificationsTab' })}>
              <View
                style={{
                  backgroundColor: colors.errorTint,
                  borderWidth: 1,
                  borderColor: '#F6D6D3',
                  borderRadius: 18,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 11,
                }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 9,
                    backgroundColor: colors.error,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="warning" size={15} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="extrabold" color="#8E2F2C">
                    {alert.title}
                  </Text>
                  <Text variant="caption" color="#A4514E" style={{ marginTop: 3 }} numberOfLines={2}>
                    {alert.body}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}

          {/* upcoming departures */}
          {upcoming ? (
            <View style={{ gap: 10 }}>
              <SectionHeading
                title="Najbližšie odchody"
                actionLabel="Všetky"
                onAction={() => navigation.navigate('StopDetail', { stopId: upcoming.stop.id })}
              />
              <Card onPress={() => navigation.navigate('StopDetail', { stopId: upcoming.stop.id })}>
                <Text variant="body" weight="extrabold">
                  {stopLabel(upcoming.stop)}
                </Text>
                <View style={{ marginTop: 12, gap: 10 }}>
                  {upcoming.departures.map((d, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <RouteBadge shortName={d.routeShortName} mode={d.mode} size="sm" />
                      <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
                        {d.headsign}
                      </Text>
                      <Text variant="bodyStrong" color={d.delay.onTime ? colors.text : colors.warning}>
                        {formatRelativeMinutes(d.inMinutes)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          ) : null}

          {/* favourite / nearby stops */}
          <View style={{ gap: 10 }}>
            <SectionHeading
              title={favoriteStops.length ? 'Obľúbené zastávky' : 'Zastávky v okolí'}
              actionLabel="Mapa"
              onAction={() => navigation.navigate('Main', { screen: 'MapTab' })}
            />
            {(favoriteStops.length
              ? favoriteStops
                  .map((f) => nearby.find((n) => n.stop.id === f.stopId))
                  .filter((n): n is NonNullable<typeof n> => !!n)
              : nearby
            )
              .slice(0, 3)
              .map((n) => (
                <StopCard
                  key={n.stop.id}
                  nearby={n}
                  onPress={() => navigation.navigate('StopDetail', { stopId: n.stop.id })}
                />
              ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderButton({ icon, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={18} color={colors.white} />
    </Pressable>
  );
}
