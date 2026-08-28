import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { colors, radii, shadows } from '@/constants/theme';
import { PAPER_PRICE, perDayLabel } from '@/data/tickets';
import type { FareClass, TicketProduct } from '@/types';
import { formatEuros } from '@/utils/format';

export interface TicketProductCardProps {
  product: TicketProduct;
  fareClass: FareClass;
  selected?: boolean;
  onPress: () => void;
}

/** Catalogue card for a purchasable ticket (basic or prepaid). */
export function TicketProductCard({ product, fareClass, selected, onPress }: TicketProductCardProps) {
  const price = product.price[fareClass];
  const paper = PAPER_PRICE[product.id]?.[fareClass];

  if (product.category === 'prepaid') {
    const best = !!product.bestValue;
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}>
        <View style={{ borderRadius: 22, overflow: 'hidden', ...shadows.card }}>
          <LinearGradient
            colors={best ? [colors.primary, colors.primaryDeep] : [colors.surface, colors.surface]}
            style={{
              padding: 18,
              borderRadius: 22,
              borderWidth: 2,
              borderColor: best ? colors.accent : selected ? colors.primary : colors.border,
            }}
          >
            {best ? (
              <View style={{ position: 'absolute', top: -1, right: 16 }}>
                <StatusBadge label="Najvýhodnejšie" tone="accent" />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="sectionTitle" color={best ? colors.white : colors.text}>
                  {product.shortLabel} dní
                </Text>
                <Text
                  variant="caption"
                  color={best ? 'rgba(255,255,255,0.72)' : colors.textSecondary}
                  style={{ marginTop: 4 }}
                >
                  {product.note}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="screenTitle" color={best ? colors.white : colors.text}>
                  {formatEuros(price)}
                </Text>
                <Text variant="caption" weight="bold" color={best ? 'rgba(255,255,255,0.7)' : colors.textTertiary}>
                  {perDayLabel(product, fareClass)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderRadius: radii.card,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.border,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          opacity: pressed ? 0.96 : 1,
        },
        shadows.card,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="bodyStrong" weight="extrabold" color={colors.primary}>
          {product.shortLabel}
        </Text>
        <Text style={{ fontSize: 9, fontFamily: 'Manrope_700Bold', color: colors.primary }}>{product.unit}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{shortName(product)}</Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>
          {product.note}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="sectionTitle">{formatEuros(price)}</Text>
        {paper ? (
          <Text
            variant="caption"
            color={colors.textTertiary}
            style={{ textDecorationLine: 'line-through' }}
          >
            {formatEuros(paper)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function shortName(product: TicketProduct): string {
  return product.name.replace(' predplatný lístok', '').replace(' lístok', '');
}
