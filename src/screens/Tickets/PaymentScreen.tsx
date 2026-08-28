import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { colors } from '@/constants/theme';
import { getTicketProduct } from '@/data/tickets';
import { paymentService } from '@/services/paymentService';
import { checkoutTicket } from '@/store/checkout';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { useUserStore } from '@/store/useUserStore';
import { useWalletStore } from '@/store/useWalletStore';
import type { PaymentMethodKind } from '@/types';
import { formatEuros } from '@/utils/format';

const METHOD_ICON: Record<PaymentMethodKind, keyof typeof Ionicons.glyphMap> = {
  apple_pay: 'logo-apple',
  google_pay: 'logo-google',
  card: 'card',
  wallet: 'wallet',
};

export function PaymentScreen() {
  const navigation = useRootNavigation();
  const { productId, fareClass, activateNow } = useRoute<RouteProp<RootStackParamList, 'Payment'>>().params;
  const product = getTicketProduct(productId);
  const methods = useWalletStore((s) => s.methods());
  const haptics = useUserStore((s) => s.preferences.validationHaptics);

  const [selectedId, setSelectedId] = useState(methods[0]?.id ?? 'pm_apple');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;
  const amount = product.price[fareClass];

  const pay = async () => {
    setStatus('processing');
    setError(null);
    paymentService.setNextOutcome(simulateFailure ? 'failed' : null);
    try {
      const result = await checkoutTicket({ productId, fareClass, methodId: selectedId, activateNow });
      if (result.payment.status === 'succeeded' && result.ticket) {
        if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        navigation.replace('PaymentSuccess', { ticketId: result.ticket.id });
      } else {
        if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(result.payment.errorMessage ?? 'Platba zlyhala. Skúste to znova.');
        setStatus('failed');
      }
    } catch {
      setError('Platba zlyhala. Skontrolujte pripojenie a skúste znova.');
      setStatus('failed');
    }
  };

  return (
    <Screen
      scroll
      footer={
        <Button
          label={status === 'failed' ? `Skúsiť znova · ${formatEuros(amount)}` : `Zaplatiť ${formatEuros(amount)}`}
          variant="accent"
          size="lg"
          loading={status === 'processing'}
          onPress={pay}
        />
      }
    >
      <AppHeader title="Spôsob platby" />

      <View style={{ gap: 9 }}>
        {methods.map((m) => {
          const active = m.id === selectedId;
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelectedId(m.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 13,
                backgroundColor: colors.surface,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: active ? colors.primary : colors.border,
                padding: 15,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 32,
                  borderRadius: 9,
                  backgroundColor: colors.primaryTint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={METHOD_ICON[m.kind]} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold">
                  {m.label}
                </Text>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {m.detail}
                </Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: active ? colors.primary : '#CFD8E3',
                  backgroundColor: active ? colors.primary : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {active ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
              </View>
            </Pressable>
          );
        })}

        <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: '#F1F4F9', borderRadius: 14, padding: 12 }}>
          <Ionicons name="lock-closed" size={16} color={colors.primary} />
          <Text variant="caption" color="#4A5B72" style={{ flex: 1 }}>
            Platby sú šifrované. Údaje o karte sa neukladajú do zariadenia.
          </Text>
        </View>

        {/* Dev-only: exercise the mock payment failure path */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <Ionicons name="flask-outline" size={16} color={colors.textSecondary} />
          <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
            Test: simulovať zlyhanie platby
          </Text>
          <Toggle value={simulateFailure} onValueChange={setSimulateFailure} />
        </View>

        {error ? (
          <View style={{ backgroundColor: colors.errorTint, borderWidth: 1, borderColor: '#F3C9C6', borderRadius: 14, padding: 13 }}>
            <Text variant="caption" weight="bold" color={colors.errorText}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>

      <Modal transparent visible={status === 'processing'} animationType="fade">
        <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 28, alignItems: 'center', gap: 14, width: 240 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="bodyStrong" center>
              Spracúvam platbu…
            </Text>
            <Text variant="caption" center color={colors.textSecondary}>
              Nezatvárajte aplikáciu
            </Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
