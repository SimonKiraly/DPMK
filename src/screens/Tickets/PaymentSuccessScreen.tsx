import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { AddToWalletButton } from '@/components/wallet/AddToWalletButton';
import { colors } from '@/constants/theme';
import { walletService } from '@/services/walletService';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { useTicketStore } from '@/store/useTicketStore';
import { useUserStore } from '@/store/useUserStore';
import { formatEuros } from '@/utils/format';

export function PaymentSuccessScreen() {
  const navigation = useRootNavigation();
  const { ticketId } = useRoute<RouteProp<RootStackParamList, 'PaymentSuccess'>>().params;
  const ticket = useTicketStore((s) => s.tickets.find((t) => t.id === ticketId));
  const email = useUserStore((s) => s.user?.email ?? 'vas@email.sk');

  const isValid = ticket?.status === 'valid';
  const longTerm = !!ticket && walletService.isEligibleTicket(ticket);

  const goToTicket = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main' },
        {
          name: isValid ? 'ActiveTicket' : 'MyTickets',
          params: isValid ? { ticketId } : undefined,
        },
      ],
    });
  };

  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.successTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={46} color={colors.success} />
          </View>

          <Text variant="screenTitle" center style={{ marginTop: 24 }}>
            Platba úspešná
          </Text>
          <Text variant="sectionTitle" center color={colors.textSecondary} style={{ marginTop: 6 }}>
            Váš lístok je pripravený
          </Text>
          <Text variant="body" center color={colors.textSecondary} style={{ marginTop: 8 }}>
            {ticket ? `${ticket.name} · ${formatEuros(ticket.priceEuros)}` : 'Lístok bol vytvorený'}
            {'. '}
            {isValid ? 'Lístok je aktívny a pripravený na kontrolu.' : 'Lístok nájdete v sekcii Moje lístky.'}
          </Text>
        </View>

        <View style={{ marginTop: 22, backgroundColor: colors.surfaceAlt, borderRadius: 18, padding: 16, gap: 8 }}>
          <Row k="ID lístka" v={ticket?.id ?? '—'} />
          <Row k="Doklad" v={`Odoslaný na ${email}`} />
        </View>

        {/* Digital wallet — long-term tickets only, secondary to the confirmation */}
        {ticket && longTerm ? (
          <View style={{ marginTop: 20, gap: 8 }}>
            <Text variant="overline" color={colors.textTertiary}>
              Digitálna peňaženka
            </Text>
            <AddToWalletButton ticket={ticket} />
            {!walletService.isBackendConfigured() ? (
              <Text variant="caption" color={colors.textTertiary}>
                Plná integrácia s {walletService.platformLabel()} bude dostupná v produkčnej verzii aplikácie.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ marginTop: 24, gap: 10 }}>
          <Button
            label={isValid ? 'Zobraziť môj lístok' : 'Moje lístky'}
            variant="accent"
            size="lg"
            onPress={goToTicket}
          />
          <Button label="Späť na domovskú obrazovku" variant="ghost" onPress={goHome} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="caption" color={colors.textSecondary}>
        {k}
      </Text>
      <Text variant="caption" weight="bold">
        {v}
      </Text>
    </View>
  );
}
