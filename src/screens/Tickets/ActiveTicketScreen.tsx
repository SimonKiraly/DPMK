import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/StateViews';
import { CountdownRing } from '@/components/tickets/CountdownRing';
import { TicketQr } from '@/components/tickets/TicketQr';
import { AddToWalletButton } from '@/components/wallet/AddToWalletButton';
import { WalletPassPreview } from '@/components/wallet/WalletPassPreview';
import { colors, shadows } from '@/constants/theme';
import { walletService } from '@/services/walletService';
import { useCountdown } from '@/hooks/useCountdown';
import { activateStoredTicket } from '@/store/checkout';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { selectActiveTicket, useTicketStore } from '@/store/useTicketStore';
import { useUserStore } from '@/store/useUserStore';
import { formatClock, formatDate } from '@/utils/format';

export function ActiveTicketScreen() {
  const navigation = useRootNavigation();
  const params = useRoute<RouteProp<RootStackParamList, 'ActiveTicket'>>().params;
  const active = useTicketStore(selectActiveTicket);
  const explicit = useTicketStore((s) => (params?.ticketId ? s.tickets.find((t) => t.id === params.ticketId) : undefined));
  const ticket = explicit ?? active;
  const userName = useUserStore((s) => s.user?.fullName ?? 'Cestujúci');

  const { label, progress, expired } = useCountdown(ticket?.expiresAt, ticket?.activatedAt);

  if (!ticket) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header onBack={() => navigation.goBack()} />
        <View style={{ padding: 20 }}>
          <EmptyState
            title="Žiadny aktívny lístok"
            description="Kúpte si lístok a označte ho pred nástupom."
            actionLabel="Kúpiť lístok"
            onAction={() => navigation.navigate('Main', { screen: 'TicketsTab' })}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isValid = ticket.status === 'valid' && !expired;
  const isInactive = ticket.status === 'inactive';
  const showWallet = walletService.isEligibleTicket(ticket) && ticket.status !== 'expired' && !expired;

  return (
    <LinearGradient colors={[colors.primary, colors.primaryDeep]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Header
          onBack={() => navigation.goBack()}
          badge={
            isValid ? { label: 'PLATNÝ', tone: colors.success } : isInactive ? { label: 'NEAKTÍVNY', tone: colors.textTertiary } : { label: 'NEPLATNÝ', tone: colors.error }
          }
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 }}
        >
          <View style={{ backgroundColor: colors.accent, borderRadius: 26, padding: 22, ...shadows.ticket }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text variant="overline" color="#7A5C00">
                  MHD Košice
                </Text>
                <Text variant="screenTitle" color={colors.text} style={{ marginTop: 6 }}>
                  {ticket.name.replace(' predplatný lístok', '').replace(' lístok', '')}
                </Text>
                <Text variant="caption" weight="bold" color="#5E4A08" style={{ marginTop: 3 }}>
                  {ticket.fareClass === 'discounted' ? 'Zľavnený' : 'Základný'} · {ticket.zones}
                </Text>
              </View>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: colors.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="bus" size={24} color={colors.accent} />
              </View>
            </View>

            {ticket.activatedAt ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18 }}>
                <CountdownRing progress={progress} />
                <View>
                  <Text variant="overline" color="#7A5C00">
                    Zostávajúci čas
                  </Text>
                  <Text variant="countdown" color={colors.text}>
                    {label}
                  </Text>
                  {ticket.expiresAt ? (
                    <Text variant="caption" weight="bold" color="#5E4A08">
                      {formatClock(ticket.activatedAt)} → {formatClock(ticket.expiresAt)} · {formatDate(ticket.expiresAt)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <Text variant="body" weight="bold" color="#5E4A08" style={{ marginTop: 16 }}>
                Lístok ešte nie je aktivovaný.
              </Text>
            )}

            <View style={{ height: 1, marginVertical: 18, backgroundColor: '#C9A21E', opacity: 0.5 }} />

            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <TicketQr ticket={ticket} />
              <View style={{ flex: 1 }}>
                <Text variant="overline" color="#5E4A08">
                  ID lístka
                </Text>
                <Text variant="bodyStrong" color={colors.text} style={{ letterSpacing: 0.5 }}>
                  {ticket.id}
                </Text>
                <Text variant="overline" color="#5E4A08" style={{ marginTop: 10 }}>
                  Cestujúci
                </Text>
                <Text variant="body" weight="extrabold" color={colors.text}>
                  {userName}
                </Text>
                <Text variant="overline" color="#7A5C00" style={{ marginTop: 10 }}>
                  Overovací kód {ticket.verificationCode}
                </Text>
              </View>
            </View>
          </View>

          {ticket.activatedAt ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: 16, marginTop: 16 }}>
              <Text variant="body" weight="extrabold" color={colors.white}>
                Platnosť lístka
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.round((1 - progress) * 100)}%`, backgroundColor: colors.accent }} />
                </View>
                <Text variant="caption" weight="extrabold" color={colors.accent}>
                  {Math.round((1 - progress) * 100)}%
                </Text>
              </View>
            </View>
          ) : null}

          {showWallet ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: 16,
                marginTop: 16,
                gap: 12,
              }}
            >
              <Text variant="overline" color={colors.textTertiary}>
                Digitálna peňaženka
              </Text>
              <WalletPassPreview ticket={ticket} passengerName={userName} />
              <AddToWalletButton ticket={ticket} />
              {!walletService.isBackendConfigured() ? (
                <Text variant="caption" color={colors.textTertiary}>
                  Plná integrácia s {walletService.platformLabel()} bude dostupná v produkčnej verzii aplikácie.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {isInactive ? (
              <Button
                label="Aktivovať lístok"
                variant="accent"
                onPress={() => activateStoredTicket(ticket.id)}
              />
            ) : (
              <>
                <Button
                  label="Kúpiť ďalší"
                  variant="secondary"
                  onPress={() => navigation.navigate('Main', { screen: 'TicketsTab' })}
                />
                <Button label="Moje lístky" variant="primary" onPress={() => navigation.navigate('MyTickets')} />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Header({
  onBack,
  badge,
}: {
  onBack: () => void;
  badge?: { label: string; tone: string };
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 10 }}>
      <Pressable
        onPress={onBack}
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          backgroundColor: 'rgba(255,255,255,0.16)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="chevron-back" size={20} color={colors.white} />
      </Pressable>
      <Text variant="sectionTitle" color={colors.white} style={{ flex: 1 }}>
        Aktívny lístok
      </Text>
      {badge ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255,255,255,0.14)',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: badge.tone }} />
          <Text variant="overline" color={colors.white}>
            {badge.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
