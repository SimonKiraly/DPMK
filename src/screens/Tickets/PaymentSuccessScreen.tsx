import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
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

  const goToTicket = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main' },
        { name: ticket?.status === 'valid' ? 'ActiveTicket' : 'MyTickets', params: ticket?.status === 'valid' ? { ticketId } : undefined },
      ],
    });
  };

  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
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
        <Text variant="body" center color={colors.textSecondary} style={{ marginTop: 8 }}>
          {ticket ? `${ticket.name} · ${formatEuros(ticket.priceEuros)}` : 'Lístok bol vytvorený'}
          {'. '}
          {ticket?.status === 'valid'
            ? 'Lístok je aktívny a pripravený na kontrolu.'
            : 'Lístok nájdete v sekcii Moje lístky.'}
        </Text>

        <View style={{ marginTop: 22, alignSelf: 'stretch', backgroundColor: colors.surfaceAlt, borderRadius: 18, padding: 16, gap: 8 }}>
          <Row k="ID lístka" v={ticket?.id ?? '—'} />
          <Row k="Doklad" v={`Odoslaný na ${email}`} />
        </View>

        <View style={{ marginTop: 24, alignSelf: 'stretch', gap: 10 }}>
          <Button
            label={ticket?.status === 'valid' ? 'Zobraziť lístok' : 'Moje lístky'}
            variant="accent"
            size="lg"
            onPress={goToTicket}
          />
          <Button label="Späť na domovskú obrazovku" variant="ghost" onPress={goHome} />
        </View>
      </View>
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
