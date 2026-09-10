import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AlertCard } from '@/components/alerts/AlertCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { colors } from '@/constants/theme';
import { useRootNavigation } from '@/navigation/hooks';
import { useActiveAlerts, useAlertsStore, usePlannedAlerts } from '@/store/useAlertsStore';

type Tab = 'active' | 'upcoming';

const TABS = [
  { value: 'active' as const, label: 'Aktívne' },
  { value: 'upcoming' as const, label: 'Plánované' },
];

const EMPTY: Record<Tab, { title: string; icon: 'checkmark-circle-outline' | 'calendar-outline' }> = {
  active: {
    title: 'Momentálne neevidujeme žiadne aktívne výluky.',
    icon: 'checkmark-circle-outline',
  },
  upcoming: {
    title: 'Momentálne neevidujeme žiadne plánované výluky.',
    icon: 'calendar-outline',
  },
};

/** "Výluky a informácie" — the dedicated DPMK disruption board. */
export function AlertsScreen() {
  const navigation = useRootNavigation();
  const status = useAlertsStore((s) => s.status);
  const lastFetchedAt = useAlertsStore((s) => s.lastFetchedAt);
  const refresh = useAlertsStore((s) => s.refresh);
  const active = useActiveAlerts();
  const planned = usePlannedAlerts();

  const [tab, setTab] = useState<Tab>('active');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const list = tab === 'active' ? active : planned;
  const total = active.length + planned.length;

  // Backend never reachable this session and nothing cached → full error state.
  const firstLoad = status === 'loading' && lastFetchedAt === null && total === 0;
  const hardError = status === 'error' && lastFetchedAt === null && total === 0;
  // Had data before, latest refresh failed → keep showing it, note the staleness.
  const staleAfterError = status === 'error' && total > 0;

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh} bottomInset={24}>
      <AppHeader title="Výluky a informácie" subtitle="Zdroj: DPMK" />

      {firstLoad ? (
        <LoadingState label="Načítavam výluky…" />
      ) : hardError ? (
        <ErrorState
          message="Informácie o výlukach sa nepodarilo načítať. Skúste to znova."
          onRetry={onRefresh}
        />
      ) : (
        <View style={{ gap: 12 }}>
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />

          {staleAfterError ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cloud-offline-outline" size={13} color={colors.textTertiary} />
              <Text variant="caption" color={colors.textTertiary}>
                Zobrazujeme naposledy načítané údaje.
              </Text>
            </View>
          ) : null}

          {list.length === 0 ? (
            <EmptyState title={EMPTY[tab].title} icon={EMPTY[tab].icon} />
          ) : (
            <View style={{ gap: 10 }}>
              {list.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onPress={() => navigation.navigate('AlertDetail', { alertId: a.id })}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
