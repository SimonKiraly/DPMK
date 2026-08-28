import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import { useRootNavigation } from '@/navigation/hooks';
import { useWalletStore } from '@/store/useWalletStore';
import { formatEuros } from '@/utils/format';

const AMOUNTS = [10, 20, 50, 100];

export function AddMoneyScreen() {
  const navigation = useRootNavigation();
  const balance = useWalletStore((s) => s.balanceEuros);
  const topUp = useWalletStore((s) => s.topUp);
  const [amount, setAmount] = useState(20);

  const confirm = () => {
    topUp(amount, 'Visa •••• 4417');
    navigation.goBack();
  };

  return (
    <Screen
      scroll
      footer={<Button label={`Dobiť ${formatEuros(amount)}`} variant="accent" size="lg" onPress={confirm} />}
    >
      <AppHeader title="Dobiť kredit" />

      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
        <Text variant="overline" color={colors.textTertiary}>
          Suma dobitia
        </Text>
        <Text variant="hero" style={{ fontSize: 54, marginTop: 8 }}>
          {formatEuros(amount)}
        </Text>
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 4 }}>
          Nový zostatok {formatEuros(balance + amount)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
        {AMOUNTS.map((v) => {
          const active = v === amount;
          return (
            <Pressable
              key={v}
              onPress={() => setAmount(v)}
              style={{
                minWidth: 74,
                alignItems: 'center',
                paddingVertical: 12,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary : colors.surface,
              }}
            >
              <Text variant="bodyStrong" weight="extrabold" color={active ? colors.white : colors.text}>
                {formatEuros(v)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 24, gap: 10 }}>
        <SectionHeading title="Zaplatiť cez" overline />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 13,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 20,
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
            <Ionicons name="card" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="bold">
              Visa •••• 4417
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Predvolená karta
            </Text>
          </View>
        </View>
        <View style={{ backgroundColor: '#F1F4F9', borderRadius: 16, padding: 13 }}>
          <Text variant="caption" color="#4A5B72">
            Automatické dobitie: pridá €10, keď zostatok klesne pod €5. Nastavíte v peňaženke.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
