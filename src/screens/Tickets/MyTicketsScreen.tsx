import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/StateViews';
import { colors, shadows } from '@/constants/theme';
import { useCountdown } from '@/hooks/useCountdown';
import { activateStoredTicket } from '@/store/checkout';
import { useRootNavigation } from '@/navigation/hooks';
import { selectActiveTicket, selectInactiveTickets, selectTicketHistory, useTicketStore } from '@/store/useTicketStore';
import type { Ticket } from '@/types';
import { formatClock, formatDate, formatEuros } from '@/utils/format';

export function MyTicketsScreen() {
  const navigation = useRootNavigation();
  const active = useTicketStore(selectActiveTicket);
  const inactive = useTicketStore(selectInactiveTickets);
  const history = useTicketStore(selectTicketHistory);

  const empty = !active && inactive.length === 0 && history.length === 0;

  return (
    <Screen scroll bottomInset={24}>
      <AppHeader title="Moje lístky" />

      {empty ? (
        <EmptyState
          title="Zatiaľ žiadne lístky"
          description="Kúpené lístky sa zobrazia tu — aktívne aj história."
          actionLabel="Kúpiť lístok"
          onAction={() => navigation.navigate('Main', { screen: 'TicketsTab' })}
        />
      ) : null}

      {active ? (
        <View style={{ gap: 10, marginBottom: 22 }}>
          <SectionHeading title="Aktívny" overline />
          <ActiveRow ticket={active} onPress={() => navigation.navigate('ActiveTicket', { ticketId: active.id })} />
        </View>
      ) : null}

      {inactive.length > 0 ? (
        <View style={{ gap: 10, marginBottom: 22 }}>
          <SectionHeading title="Pripravené na aktiváciu" overline />
          {inactive.map((t) => (
            <Card key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold">
                  {t.name.replace(' predplatný lístok', '').replace(' lístok', '')}
                </Text>
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                  Kúpené {formatDate(t.purchasedAt)} · {formatEuros(t.priceEuros)}
                </Text>
              </View>
              <Button label="Aktivovať" size="sm" fullWidth={false} variant="accent" onPress={() => activateStoredTicket(t.id)} />
            </Card>
          ))}
        </View>
      ) : null}

      {history.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionHeading title="História" overline />
          {history.map((t) => (
            <View
              key={t.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 18,
                padding: 14,
                opacity: 0.9,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: '#F1F4F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="overline" color={colors.textTertiary}>
                  {t.name.match(/\d+/)?.[0] ?? '—'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold">
                  {t.name.replace(' predplatný lístok', '').replace(' lístok', '')}
                </Text>
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                  {t.expiresAt ? `Vypršal ${formatDate(t.expiresAt)} · ${formatClock(t.expiresAt)}` : formatDate(t.purchasedAt)}
                </Text>
              </View>
              <Text variant="body" weight="extrabold" color={colors.textSecondary}>
                {formatEuros(t.priceEuros)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function ActiveRow({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  const { label } = useCountdown(ticket.expiresAt, ticket.activatedAt);
  return (
    <Pressable onPress={onPress}>
      <LinearGradient colors={[colors.accent, colors.accentDeep]} style={{ borderRadius: 20, padding: 16, ...shadows.card }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="bodyStrong" color={colors.text}>
            {ticket.name.replace(' predplatný lístok', '').replace(' lístok', '')}
          </Text>
          <Text variant="bodyStrong" color={colors.text} style={{ fontVariant: ['tabular-nums'] }}>
            {label}
          </Text>
        </View>
        <Text variant="caption" weight="bold" color="#5E4A08" style={{ marginTop: 4 }}>
          {ticket.expiresAt ? `Platný do ${formatClock(ticket.expiresAt)} · ` : ''}Ťuknutím zobrazíte QR
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
