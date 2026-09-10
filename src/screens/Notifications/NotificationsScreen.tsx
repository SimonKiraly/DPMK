import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/StateViews';
import { colors, shadows } from '@/constants/theme';
import { openNotificationTarget } from '@/navigation/notificationTarget';
import { useRootNavigation } from '@/navigation/hooks';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useVisibleAlerts } from '@/store/useAlertsStore';
import type { AppNotification, NotificationKind, ServiceAlert } from '@/types';
import { formatTimeAgo } from '@/utils/format';

/** Render a live backend service alert with the existing notification card. */
function alertToNotification(a: ServiceAlert): AppNotification {
  const routes = a.affectedRoutes.length ? `${a.affectedRoutes.join(', ')} · ` : '';
  return {
    id: `alert-${a.id}`,
    kind: 'disruption',
    title: `${routes}${a.title}`,
    body: a.description,
    createdAt: a.publishedAt,
    read: true, // alerts have no per-user read state in Phase 0
  };
}

const KIND_STYLE: Record<NotificationKind, { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; card: string; border: string; tag: string }> = {
  disruption: { icon: 'warning', bg: colors.error, fg: colors.white, card: '#FEF7F6', border: '#F6D6D3', tag: 'VÝLUKA' },
  trip_update: { icon: 'time', bg: colors.accent, fg: colors.text, card: '#FFFDF4', border: '#F2E4B4', tag: 'AKTUALIZÁCIA CESTY' },
  info: { icon: 'information-circle', bg: colors.primaryTint, fg: colors.primary, card: colors.surface, border: colors.border, tag: 'INFORMÁCIA' },
  offer: { icon: 'pricetag', bg: colors.primaryTint, fg: colors.primary, card: colors.surface, border: colors.border, tag: 'PONUKA' },
  ticket: { icon: 'ticket', bg: colors.primaryTint, fg: colors.primary, card: colors.surface, border: colors.border, tag: 'LÍSTOK' },
};

type Filter = 'all' | 'unread' | 'trips' | 'offers';

export function NotificationsScreen() {
  const navigation = useRootNavigation();
  const insets = useSafeAreaInsets();
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const alerts = useVisibleAlerts();

  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const merged = [...alerts.map(alertToNotification), ...notifications];
    const sorted = merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filter === 'unread') return sorted.filter((n) => !n.read);
    if (filter === 'trips') return sorted.filter((n) => n.kind === 'disruption' || n.kind === 'trip_update');
    if (filter === 'offers') return sorted.filter((n) => n.kind === 'offer');
    return sorted;
  }, [notifications, alerts, filter]);

  const handlePress = (n: AppNotification) => {
    markRead(n.id);
    // Live DPMK alerts render with an `alert-<guid>` id — open the full detail.
    if (n.id.startsWith('alert-')) {
      navigation.navigate('AlertDetail', { alertId: n.id.slice('alert-'.length) });
      return;
    }
    if (n.cta) openNotificationTarget(navigation, n.cta.target);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text variant="screenTitle">Notifikácie</Text>
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text variant="caption" weight="bold" color={colors.primary}>
              Označiť všetko
            </Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 12 }}>
          {(['all', 'unread', 'trips', 'offers'] as Filter[]).map((f) => (
            <Chip
              key={f}
              label={{ all: 'Všetky', unread: 'Neprečítané', trips: 'Cesty', offers: 'Ponuky' }[f]}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 110, gap: 9 }}
      >
        {filtered.length === 0 ? (
          <EmptyState title="Žiadne notifikácie" description="Upozornenia na výluky, lístky a ponuky sa zobrazia tu." icon="notifications-off-outline" />
        ) : null}
        {filtered.map((n) => {
          const s = KIND_STYLE[n.kind];
          return (
            <Pressable
              key={n.id}
              onPress={() => handlePress(n)}
              style={{
                backgroundColor: s.card,
                borderWidth: 1,
                borderColor: s.border,
                borderRadius: 20,
                padding: 15,
                flexDirection: 'row',
                gap: 12,
                ...shadows.card,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  backgroundColor: s.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={s.icon} size={16} color={s.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text variant="overline" color={colors.textTertiary}>
                    {s.tag}
                  </Text>
                  {!n.read ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
                  <Text variant="overline" color={colors.textTertiary} style={{ marginLeft: 'auto' }}>
                    {formatTimeAgo(n.createdAt)}
                  </Text>
                </View>
                <Text variant="bodyStrong" style={{ marginTop: 5 }}>
                  {n.title}
                </Text>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>
                  {n.body}
                </Text>
                {n.cta ? (
                  <View style={{ alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.primaryTint, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 }}>
                    <Text variant="caption" weight="extrabold" color={colors.primary}>
                      {n.cta.label}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
