import { useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { colors, shadows } from '@/constants/theme';
import { PAPER_PRICE, getTicketProduct } from '@/data/tickets';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { useUserStore } from '@/store/useUserStore';
import { formatDuration, formatEuros } from '@/utils/format';

export function CheckoutScreen() {
  const navigation = useRootNavigation();
  const { productId, fareClass } = useRoute<RouteProp<RootStackParamList, 'Checkout'>>().params;
  const product = getTicketProduct(productId);
  const autoActivate = useUserStore((s) => s.preferences.autoActivateTickets);
  const [activateNow, setActivateNow] = useState(autoActivate);

  if (!product) {
    return (
      <Screen>
        <AppHeader title="Kontrola lístka" />
        <Text>Neznámy lístok.</Text>
      </Screen>
    );
  }

  const price = product.price[fareClass];
  const paper = PAPER_PRICE[product.id]?.[fareClass];
  const savings = paper ? paper - price : 0;

  const rows: { k: string; v: string }[] = [
    { k: 'Typ lístka', v: product.name.replace(' predplatný lístok', '').replace(' lístok', '') },
    { k: 'Tarifa', v: fareClass === 'discounted' ? 'Zľavnená' : 'Základná' },
    { k: 'Platnosť', v: product.category === 'basic' ? formatDuration(product.durationMs / 60000) : `${product.shortLabel} dní` },
    { k: 'Začiatok platnosti', v: activateNow ? 'Okamžite' : 'Po aktivácii' },
    { k: 'Zóny', v: product.zones },
  ];

  return (
    <Screen
      scroll
      footer={
        <Button
          label={`Pokračovať na platbu · ${formatEuros(price)}`}
          variant="accent"
          size="lg"
          onPress={() => navigation.navigate('Payment', { productId, fareClass, activateNow })}
        />
      }
    >
      <AppHeader title="Kontrola lístka" />

      <View style={{ borderRadius: 22, overflow: 'hidden', ...shadows.card }}>
        <LinearGradient colors={[colors.accent, colors.accentDeep]} style={{ padding: 18 }}>
          <Text variant="overline" color="#7A5C00">
            Vybraný lístok
          </Text>
          <Text variant="screenTitle" color={colors.text} style={{ marginTop: 6 }}>
            {product.name.replace(' predplatný lístok', '').replace(' lístok', '')}
          </Text>
          <Text variant="caption" weight="bold" color="#5E4A08" style={{ marginTop: 3 }}>
            {fareClass === 'discounted' ? 'Zľavnená tarifa' : 'Základná tarifa'} · {product.zones}
          </Text>
        </LinearGradient>

        <View style={{ backgroundColor: colors.surface, padding: 18, borderWidth: 1, borderColor: colors.border, borderTopWidth: 0, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
          {rows.map((r) => (
            <View
              key={r.k}
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F3F7' }}
            >
              <Text variant="caption" color={colors.textSecondary}>
                {r.k}
              </Text>
              <Text variant="caption" weight="bold">
                {r.v}
              </Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 16 }}>
            <Text variant="body" weight="bold" color={colors.textSecondary}>
              Spolu
            </Text>
            <Text variant="screenTitle">{formatEuros(price)}</Text>
          </View>
          {savings > 0 ? (
            <Text variant="caption" weight="bold" color={colors.success} style={{ marginTop: 6 }}>
              Ušetríte {formatEuros(savings)} oproti papierovému lístku
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={{
          marginTop: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 18,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="body" weight="bold">
            Aktivovať ihneď
          </Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            Inak sa uloží do sekcie Moje lístky
          </Text>
        </View>
        <Toggle value={activateNow} onValueChange={setActivateNow} />
      </View>
    </Screen>
  );
}
