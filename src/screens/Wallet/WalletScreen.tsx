import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Text } from '@/components/ui/Text';
import { colors, shadows } from '@/constants/theme';
import { useRootNavigation } from '@/navigation/hooks';
import { useWalletMethods, useWalletStore } from '@/store/useWalletStore';
import type { TransactionKind } from '@/types';
import { formatEuros, formatTimeAgo } from '@/utils/format';

const TX_ICON: Record<TransactionKind, keyof typeof Ionicons.glyphMap> = {
  ticket: 'ticket',
  topup: 'add-circle',
  refund: 'refresh',
  booking: 'bus',
};

export function WalletScreen() {
  const navigation = useRootNavigation();
  const insets = useSafeAreaInsets();
  const balance = useWalletStore((s) => s.balanceEuros);
  const transactions = useWalletStore((s) => s.transactions);
  const methods = useWalletMethods();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Peňaženka" background={colors.primary} tone="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 70 }}>
          <Text variant="overline" color="rgba(255,255,255,0.65)">
            Dostupný zostatok
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <Text variant="hero" color={colors.white}>
              {formatEuros(balance)}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -52 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 14, flexDirection: 'row', gap: 8, ...shadows.float }}>
            <Button label="Dobiť kredit" variant="accent" onPress={() => navigation.navigate('AddMoney')} />
            <Button label="Kúpiť lístok" variant="secondary" onPress={() => navigation.navigate('Main', { screen: 'TicketsTab' })} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <SectionHeading title="Spôsoby platby" overline />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            {methods.map((m) => (
              <View
                key={m.id}
                style={{
                  width: 170,
                  borderRadius: 18,
                  padding: 14,
                  backgroundColor: m.kind === 'card' ? colors.text : colors.surface,
                  borderWidth: m.kind === 'card' ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text variant="overline" color={m.kind === 'card' ? 'rgba(255,255,255,0.7)' : colors.textTertiary}>
                  {m.label.split(' ')[0]}
                </Text>
                <Text
                  variant="body"
                  weight="extrabold"
                  color={m.kind === 'card' ? colors.white : colors.text}
                  style={{ marginTop: 20 }}
                >
                  {m.kind === 'card' ? m.label.replace('Visa ', '') : m.label}
                </Text>
                <Text variant="caption" color={m.kind === 'card' ? 'rgba(255,255,255,0.7)' : colors.textTertiary} style={{ marginTop: 3 }}>
                  {m.detail}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <SectionHeading title="Pohyby" />
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 15, marginTop: 10 }}>
            {transactions.map((tx, i) => (
              <View
                key={tx.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 13,
                  borderBottomWidth: i === transactions.length - 1 ? 0 : 1,
                  borderBottomColor: '#F2F5F9',
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    backgroundColor: tx.amountEuros >= 0 ? colors.successTint : colors.primaryTint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={TX_ICON[tx.kind]}
                    size={15}
                    color={tx.amountEuros >= 0 ? colors.successText : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" weight="bold" numberOfLines={1}>
                    {tx.title}
                  </Text>
                  <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 2 }}>
                    {formatTimeAgo(tx.createdAt)} · {tx.methodLabel}
                  </Text>
                </View>
                <Text
                  variant="body"
                  weight="extrabold"
                  color={tx.amountEuros >= 0 ? colors.successText : colors.text}
                >
                  {formatEuros(tx.amountEuros, true)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
