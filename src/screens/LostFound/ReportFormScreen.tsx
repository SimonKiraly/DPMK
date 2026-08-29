import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/constants/theme';
import { ROUTES } from '@/data/routes';
import { useRootNavigation } from '@/navigation/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { useLostFoundStore } from '@/store/useLostFoundStore';
import { useUserStore } from '@/store/useUserStore';
import type { TransportMode } from '@/types';
import { formatDate } from '@/utils/format';

const MODES: { value: TransportMode; label: string }[] = [
  { value: 'bus', label: 'Autobus' },
  { value: 'tram', label: 'Električka' },
  { value: 'trolleybus', label: 'Trolejbus' },
  { value: 'night', label: 'Nočná linka' },
];

const TIME_WINDOWS = ['05:00 – 08:00', '08:00 – 11:00', '11:00 – 14:00', '14:00 – 17:00', '17:00 – 20:00', '20:00 – 24:00'];

export function ReportFormScreen() {
  const navigation = useRootNavigation();
  const { type } = useRoute<RouteProp<RootStackParamList, 'ReportForm'>>().params;
  const user = useUserStore((s) => s.user);
  const submit = useLostFoundStore((s) => s.submit);
  const submitting = useLostFoundStore((s) => s.submitting);

  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<TransportMode>('bus');
  const [route, setRoute] = useState('16');
  const [timeWindow, setTimeWindow] = useState(TIME_WINDOWS[3]);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '');
  const [picker, setPicker] = useState<'mode' | 'route' | 'time' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString();

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Prístup k fotkám', 'Povoľte prístup k fotkám v nastaveniach systému.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const onSubmit = async () => {
    if (description.trim().length < 8) {
      setError('Opíšte predmet aspoň niekoľkými slovami.');
      return;
    }
    if (!contactEmail.trim() && !contactPhone.trim()) {
      setError('Zadajte e-mail alebo telefón, aby sme vás mohli kontaktovať.');
      return;
    }
    setError(null);
    const report = await submit({
      type,
      description,
      mode,
      routeShortName: route,
      date: today,
      timeWindow,
      contactEmail,
      contactPhone,
      photoUri,
    });
    Alert.alert(
      'Hlásenie odoslané',
      `Referenčné číslo ${report.reference}. Ozveme sa do 24 hodín.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  const options =
    picker === 'mode'
      ? MODES.map((m) => ({ label: m.label, value: m.value as string }))
      : picker === 'route'
        ? ROUTES.map((r) => ({ label: `Linka ${r.shortName}`, value: r.shortName }))
        : TIME_WINDOWS.map((t) => ({ label: t, value: t }));

  const applyOption = (value: string) => {
    if (picker === 'mode') setMode(value as TransportMode);
    else if (picker === 'route') setRoute(value);
    else if (picker === 'time') setTimeWindow(value);
    setPicker(null);
  };

  return (
    <Screen
      scroll
      footer={<Button label="Odoslať hlásenie" variant="primary" size="lg" loading={submitting} onPress={onSubmit} />}
    >
      <AppHeader title={type === 'lost' ? 'Nahlásiť stratu' : 'Nahlásiť nález'} />

      <View style={{ gap: 12 }}>
        <Pressable
          onPress={pickPhoto}
          style={{
            borderWidth: 1,
            borderColor: '#C9D6E6',
            borderStyle: 'dashed',
            borderRadius: 20,
            backgroundColor: colors.surface,
            padding: 20,
            alignItems: 'center',
          }}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: 120, height: 120, borderRadius: 14 }} />
          ) : (
            <>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera" size={20} color={colors.primary} />
              </View>
              <Text variant="caption" weight="extrabold" style={{ marginTop: 10 }}>
                Pridať fotku
              </Text>
              <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 3 }}>
                Nepovinné · pomôže rýchlejšie identifikovať predmet
              </Text>
            </>
          )}
        </Pressable>

        <TextField
          label="Popis predmetu"
          placeholder="Napr. čierny skladací dáždnik, drevená rukoväť"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={{ flexDirection: 'row', gap: 9 }}>
          <View style={{ flex: 1 }}>
            <PickerField label="Druh dopravy" value={MODES.find((m) => m.value === mode)?.label ?? ''} onPress={() => setPicker('mode')} />
          </View>
          <View style={{ flex: 1 }}>
            <PickerField label="Linka" value={`Linka ${route}`} onPress={() => setPicker('route')} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 9 }}>
          <View style={{ flex: 1 }}>
            <PickerField label="Dátum" value={formatDate(today)} onPress={() => Alert.alert('Dátum', 'V ukážke je pevne nastavený dnešný dátum.')} />
          </View>
          <View style={{ flex: 1 }}>
            <PickerField label="Približný čas" value={timeWindow} onPress={() => setPicker('time')} />
          </View>
        </View>

        <TextField label="Kontaktný e-mail" value={contactEmail} autoCapitalize="none" keyboardType="email-address" onChangeText={setContactEmail} />
        <TextField label="Kontaktný telefón" value={contactPhone} keyboardType="phone-pad" onChangeText={setContactPhone} />

        {error ? (
          <View style={{ backgroundColor: colors.errorTint, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F3C9C6' }}>
            <Text variant="caption" weight="bold" color={colors.errorText}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>

      <ModalSheet visible={picker !== null} onClose={() => setPicker(null)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => applyOption(opt.value)}
              style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F5F9' }}
            >
              <Text variant="body" weight="bold">
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </ModalSheet>
    </Screen>
  );
}

function PickerField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" weight="extrabold" color="#4A5B72">
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="body" weight="bold" numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}
