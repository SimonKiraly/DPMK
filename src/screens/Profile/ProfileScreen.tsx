import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ListRow } from '@/components/ui/ListRow';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/constants/theme';
import { useRootNavigation } from '@/navigation/hooks';
import { selectTicketHistory, useTicketStore } from '@/store/useTicketStore';
import { useUserStore } from '@/store/useUserStore';
import type { DiscountEntitlement } from '@/types';

const DISCOUNTS: { value: DiscountEntitlement; label: string }[] = [
  { value: 'none', label: 'Bez zľavy' },
  { value: 'student', label: 'Študent' },
  { value: 'senior', label: 'Senior (63+)' },
  { value: 'child', label: 'Dieťa (6–15)' },
  { value: 'disability', label: 'ŤZP / ŤZP-S' },
];

export function ProfileScreen() {
  const navigation = useRootNavigation();
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const setDiscount = useUserStore((s) => s.setDiscount);
  const historyCount = useTicketStore((s) => selectTicketHistory(s).length);
  const savedEuros = useTicketStore((s) =>
    s.tickets.reduce((sum, t) => sum + (t.fareClass === 'discounted' ? t.priceEuros : t.priceEuros * 0.08), 0),
  );

  const [editing, setEditing] = useState(false);
  const [discountPicker, setDiscountPicker] = useState(false);
  const [form, setForm] = useState({ fullName: user?.fullName ?? '', email: user?.email ?? '', phone: user?.phone ?? '' });

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text variant="sectionTitle">Nie ste prihlásený</Text>
        <Button label="Späť" variant="secondary" fullWidth={false} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const save = () => {
    updateProfile(form);
    setEditing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader paddingBottom={28}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Text variant="sectionTitle" color={colors.white}>
            Môj účet
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <View
            style={{
              width: 66,
              height: 66,
              borderRadius: 22,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="screenTitle" color={colors.text}>
              {user.initials}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="sectionTitle" color={colors.white}>
              {user.fullName}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.72)" style={{ marginTop: 3 }}>
              {user.email} · {user.phone}
            </Text>
          </View>
        </View>
      </GradientHeader>

      <View style={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 24 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat value={String(historyCount + 180)} label="Jázd v roku 2026" />
          <Stat value={`€${Math.round(savedEuros + 60)}`} label="Ušetrené oproti papieru" />
        </View>

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden' }}>
          <ListRow
            title="Mestská karta"
            chevron={false}
            badge={{ label: user.cityCardVerified ? 'Overená' : 'Neoverená', tone: user.cityCardVerified ? 'success' : 'warning' }}
          />
          <ListRow
            title="Nárok na zľavu"
            value={DISCOUNTS.find((d) => d.value === user.discount)?.label}
            onPress={() => setDiscountPicker(true)}
          />
          <ListRow title="Osobné údaje" value="Upraviť" divider={false} onPress={() => setEditing(true)} />
        </View>

        <Button label="Otvoriť nastavenia" variant="secondary" onPress={() => navigation.navigate('Settings')} />
      </View>

      {/* edit personal details */}
      <Modal transparent visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setEditing(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 40, gap: 12 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDE3EB', alignSelf: 'center' }} />
          <Text variant="sectionTitle">Osobné údaje</Text>
          <TextField label="Meno a priezvisko" value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} />
          <TextField label="E-mail" value={form.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(v) => setForm({ ...form, email: v })} />
          <TextField label="Telefón" value={form.phone} keyboardType="phone-pad" onChangeText={(v) => setForm({ ...form, phone: v })} />
          <Button label="Uložiť zmeny" variant="accent" onPress={save} />
        </View>
      </Modal>

      {/* discount picker */}
      <Modal transparent visible={discountPicker} animationType="slide" onRequestClose={() => setDiscountPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setDiscountPicker(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 40, gap: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDE3EB', alignSelf: 'center', marginBottom: 8 }} />
          <Text variant="sectionTitle" style={{ marginBottom: 8 }}>
            Nárok na zľavu
          </Text>
          {DISCOUNTS.map((d) => (
            <Pressable
              key={d.value}
              onPress={() => {
                setDiscount(d.value);
                setDiscountPicker(false);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}
            >
              <Text variant="body" weight="bold">
                {d.label}
              </Text>
              {user.discount === d.value ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14 }}>
      <Text variant="screenTitle">{value}</Text>
      <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
