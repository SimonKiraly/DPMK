import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Linking, Pressable, View } from 'react-native';
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
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { colors } from '@/constants/theme';
import { getStop } from '@/data/stops';
import { useRootNavigation } from '@/navigation/hooks';
import { apiClient } from '@/services/apiClient';
import { useAlertById } from '@/store/useAlertsStore';
import type { AlertStopRef, CancelledDeparture, ServiceAlert } from '@/types';
import type { RootStackParamList } from '@/navigation/types';
import { formatClock } from '@/utils/format';
import {
  ALERT_STATUS_LABEL,
  ALERT_TYPE_LABEL,
  alertVisual,
  alertWhenText,
  routeMode,
  SEVERITY_LABEL,
  stopRefIsNavigable,
} from '@/utils/alerts';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="overline" color={colors.textTertiary}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function AlertDetailScreen() {
  const navigation = useRootNavigation();
  const { alertId } = useRoute<RouteProp<RootStackParamList, 'AlertDetail'>>().params;

  const fromStore = useAlertById(alertId);
  const [fetched, setFetched] = useState<ServiceAlert | undefined>(undefined);
  const [state, setState] = useState<'idle' | 'loading' | 'missing'>('idle');

  // Fall back to GET /api/alerts/:id when the alert is not in the list snapshot
  // (e.g. it just ended and dropped out of the default view).
  useEffect(() => {
    if (fromStore || !apiClient.enabled) return;
    let cancelled = false;
    setState('loading');
    apiClient
      .fetchAlert(alertId)
      .then((a) => {
        if (cancelled) return;
        setFetched(a);
        setState('idle');
      })
      .catch(() => {
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [alertId, fromStore]);

  const alert = fromStore ?? fetched;

  if (!alert) {
    return (
      <Screen scroll bottomInset={24}>
        <AppHeader title="Výluka" />
        {state === 'loading' ? (
          <LoadingState label="Načítavam podrobnosti…" />
        ) : (
          <EmptyState
            title="Výluka sa nenašla"
            description="Informácia už nemusí byť aktuálna."
            icon="alert-circle-outline"
          />
        )}
      </Screen>
    );
  }

  return <AlertDetailBody alert={alert} onOpenStop={(id) => navigation.navigate('StopDetail', { stopId: id })} />;
}

function AlertDetailBody({
  alert,
  onOpenStop,
}: {
  alert: ServiceAlert;
  onOpenStop: (stopId: string) => void;
}) {
  const v = alertVisual(alert);
  const when = alertWhenText(alert);

  const shownDepartures = useMemo(
    () => alert.cancelledDepartures.filter((d) => d.stopName || d.time),
    [alert.cancelledDepartures],
  );

  const openSource = () => {
    if (alert.sourceUrl) void Linking.openURL(alert.sourceUrl);
  };

  return (
    <Screen scroll bottomInset={24}>
      <AppHeader title={ALERT_TYPE_LABEL[alert.type]} subtitle={SEVERITY_LABEL[alert.severity]} />

      <View style={{ gap: 18 }}>
        {/* headline */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: v.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={v.icon} size={19} color={colors.white} />
          </View>
          <Text variant="sectionTitle" style={{ flex: 1 }}>
            {alert.title}
          </Text>
        </View>

        {/* status + validity */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <StatusBadge label={ALERT_STATUS_LABEL[alert.status]} tone={alert.status === 'active' ? 'error' : alert.status === 'upcoming' ? 'info' : 'neutral'} />
          <StatusBadge label={SEVERITY_LABEL[alert.severity]} tone={v.tone} />
        </View>
        {when ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
            <Text variant="body" color={colors.textSecondary}>
              {when}
            </Text>
          </View>
        ) : null}

        {/* description */}
        {alert.description ? (
          <Card>
            <Text variant="body" color={colors.text}>
              {alert.description}
            </Text>
          </Card>
        ) : null}

        {/* affected lines */}
        {alert.affectedRoutes.length ? (
          <Section title="Dotknuté linky">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {alert.affectedRoutes.map((r) => (
                <RouteBadge key={r} shortName={r} mode={routeMode(r)} size="md" />
              ))}
            </View>
          </Section>
        ) : null}

        {/* affected stops */}
        {alert.affectedStops.length ? (
          <Section title="Dotknuté zastávky">
            <Card padded={false}>
              {alert.affectedStops.map((s, i) => (
                <StopRow
                  key={`${s.id}-${i}`}
                  stop={s}
                  divider={i < alert.affectedStops.length - 1}
                  onOpenStop={onOpenStop}
                />
              ))}
            </Card>
          </Section>
        ) : null}

        {/* cancelled departures */}
        {shownDepartures.length ? (
          <Section title="Zrušené spoje">
            <Card padded={false}>
              {shownDepartures.map((d, i) => (
                <DepartureRow
                  key={`${d.stopId ?? d.stopName}-${d.time ?? i}`}
                  departure={d}
                  divider={i < shownDepartures.length - 1}
                />
              ))}
            </Card>
          </Section>
        ) : null}

        {/* reason */}
        {alert.reason ? (
          <Section title="Dôvod">
            <Text variant="body" color={colors.textSecondary}>
              {capitalize(alert.reason)}
            </Text>
          </Section>
        ) : null}

        {/* source */}
        <View style={{ gap: 10, marginTop: 4 }}>
          <Text variant="caption" color={colors.textTertiary}>
            Zdroj: DPMK — Dopravný podnik mesta Košice
            {alert.needsReview ? ' · automaticky spracované, môže byť neúplné' : ''}
          </Text>
          {alert.sourceUrl ? (
            <Button
              label="Otvoriť na dpmk.sk"
              variant="secondary"
              size="sm"
              fullWidth={false}
              left={<Ionicons name="open-outline" size={15} color={colors.primary} />}
              onPress={openSource}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function StopRow({
  stop,
  divider,
  onOpenStop,
}: {
  stop: AlertStopRef;
  divider: boolean;
  onOpenStop: (stopId: string) => void;
}) {
  // Only offer navigation when the notice resolved to a real stop we hold.
  const navigable = stopRefIsNavigable(stop) && !!getStop(stop.id);
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <Ionicons name="location-outline" size={16} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="bold">
          {stop.name}
        </Text>
        {stop.direction ? (
          <Text variant="caption" color={colors.textTertiary}>
            smer {stop.direction}
          </Text>
        ) : null}
      </View>
      {navigable ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /> : null}
    </View>
  );

  return navigable ? <Pressable onPress={() => onOpenStop(stop.id)}>{content}</Pressable> : content;
}

function DepartureRow({ departure, divider }: { departure: CancelledDeparture; divider: boolean }) {
  const routes = departure.routeShortNames;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      {routes.length ? (
        <RouteBadge shortName={routes[0]} mode={routeMode(routes[0])} size="sm" />
      ) : (
        <Ionicons name="close-circle-outline" size={16} color={colors.error} />
      )}
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="bold" numberOfLines={1}>
          {departure.stopName || 'Neznáma zastávka'}
        </Text>
        {departure.direction ? (
          <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
            smer {departure.direction}
          </Text>
        ) : null}
      </View>
      {departure.time ? (
        <Text variant="bodyStrong" color={colors.error}>
          {formatClock(departure.time)}
        </Text>
      ) : null}
    </View>
  );
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
