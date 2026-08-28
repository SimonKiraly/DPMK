import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { TicketProductCard } from '@/components/tickets/TicketProductCard';
import { colors } from '@/constants/theme';
import { TICKET_PRODUCTS } from '@/data/tickets';
import { useRootNavigation } from '@/navigation/hooks';
import { selectIsDiscounted, useUserStore } from '@/store/useUserStore';
import type { FareClass, TicketCategory } from '@/types';

type Tab = TicketCategory | 'sms';

export function TicketsScreen() {
  const navigation = useRootNavigation();
  const insets = useSafeAreaInsets();
  const entitledToDiscount = useUserStore(selectIsDiscounted);

  const [tab, setTab] = useState<Tab>('basic');
  const [fare, setFare] = useState<FareClass>(entitledToDiscount ? 'discounted' : 'standard');

  const products = useMemo(
    () => TICKET_PRODUCTS.filter((p) => (tab === 'sms' ? false : p.category === tab)),
    [tab],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <GradientHeader paddingBottom={20}>
          <Text variant="screenTitle" color={colors.white}>
            Lístky
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }}>
            Kúpte v aplikácii a plaťte menej ako za papierový lístok.
          </Text>
          <View style={{ marginTop: 16 }}>
            <SegmentedControl
              tone="light"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'basic', label: 'Základné' },
                { value: 'prepaid', label: 'Predplatné' },
                { value: 'sms', label: 'SMS' },
              ]}
            />
          </View>
        </GradientHeader>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 12 }}>
          {tab !== 'sms' ? (
            <SegmentedControl
              value={fare}
              onChange={setFare}
              options={[
                { value: 'standard', label: 'Základné' },
                { value: 'discounted', label: 'Zľavnené' },
              ]}
            />
          ) : null}

          {tab === 'sms' ? <SmsTicketInfo /> : null}

          {products.map((product) => (
            <TicketProductCard
              key={product.id}
              product={product}
              fareClass={fare}
              onPress={() => navigation.navigate('Checkout', { productId: product.id, fareClass: fare })}
            />
          ))}

          {tab === 'basic' ? (
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                backgroundColor: '#F1F4F9',
                borderRadius: 16,
                padding: 13,
                alignItems: 'flex-start',
              }}
            >
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text variant="caption" color="#4A5B72" style={{ flex: 1 }}>
                Všetky základné lístky zahŕňajú prepravu 1 zvieraťa a 2 kusov batožiny. Cena v aplikácii platí aj pre držiteľov mestskej karty.
              </Text>
            </View>
          ) : null}

          <Button
            label="Moje lístky a história"
            variant="secondary"
            onPress={() => navigation.navigate('MyTickets')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function SmsTicketInfo() {
  return (
    <Card style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color={colors.primary} />
      </View>
      <Text variant="sectionTitle" center style={{ marginTop: 14 }}>
        Cestovný lístok cez SMS
      </Text>
      <Text variant="caption" center color={colors.textSecondary} style={{ marginTop: 8 }}>
        Pošlite prázdnu SMS na číslo <Text variant="caption" weight="extrabold">1166</Text> a počkajte na potvrdzujúcu správu. Lístok si kúpte pred nástupom do vozidla.
      </Text>
      <View style={{ marginTop: 16, gap: 8, alignSelf: 'stretch' }}>
        {['Otvorte správy, nová prázdna SMS na 1166', 'Počkajte na odpoveď — to je váš lístok', 'Správu si nechajte pre revízora'].map((step, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: colors.surfaceAlt,
              borderRadius: 14,
              padding: 12,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="caption" weight="extrabold">
                {i + 1}
              </Text>
            </View>
            <Text variant="caption" weight="semibold" style={{ flex: 1 }}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
