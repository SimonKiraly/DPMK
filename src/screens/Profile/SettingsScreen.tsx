import { View } from 'react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { APP_NAME, APP_VERSION } from '@/constants/config';
import { colors } from '@/constants/theme';
import { useRootNavigation } from '@/navigation/hooks';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useUserStore } from '@/store/useUserStore';
import type { UserPreferences } from '@/types';

const PREF_ROWS: { key: keyof UserPreferences; label: string; note: string }[] = [
  { key: 'disruptionAlerts', label: 'Upozornenia na výluky', note: 'Push pri zmene uložených liniek' },
  { key: 'autoActivateTickets', label: 'Automatická aktivácia lístkov', note: 'Platnosť začne hneď po kúpe' },
  { key: 'ticketExpiryReminders', label: 'Pripomienka konca platnosti', note: 'Upozorní 10 minút pred vypršaním' },
  { key: 'validationHaptics', label: 'Vibrácie pri kontrole', note: 'Zavibruje pri skenovaní kódu' },
  { key: 'lowFloorOnly', label: 'Len nízkopodlažné vozidlá', note: 'Uprednostní bezbariérové spoje' },
];

const A11Y_ROWS: { key: keyof UserPreferences; label: string; note: string }[] = [
  { key: 'largeText', label: 'Väčší text', note: 'Zväčší písmo v celej aplikácii' },
  { key: 'highContrast', label: 'Vysoký kontrast', note: 'Výraznejšie farby a okraje' },
];

export function SettingsScreen() {
  const navigation = useRootNavigation();
  const preferences = useUserStore((s) => s.preferences);
  const setPreference = useUserStore((s) => s.setPreference);
  const signOut = useUserStore((s) => s.signOut);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const language = useUserStore((s) => s.user?.language ?? 'sk');
  const updateProfile = useUserStore((s) => s.updateProfile);

  const handleSignOut = async () => {
    await signOut();
    resetOnboarding();
  };

  return (
    <Screen scroll bottomInset={24}>
      <AppHeader title="Nastavenia" />

      <Text variant="overline" color={colors.textTertiary} style={{ marginBottom: 8 }}>
        Preferencie
      </Text>
      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 15 }}>
        {PREF_ROWS.map((row, i) => (
          <View
            key={row.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 13,
              borderBottomWidth: i < PREF_ROWS.length - 1 ? 1 : 0,
              borderBottomColor: '#F2F5F9',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="bold">
                {row.label}
              </Text>
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                {row.note}
              </Text>
            </View>
            <Toggle value={preferences[row.key]} onValueChange={(v) => setPreference(row.key, v)} />
          </View>
        ))}
      </View>

      <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 18, marginBottom: 8 }}>
        Mesto a jazyk
      </Text>
      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 15 }}>
        <ListRow title="Mesto" value="Košice" chevron={false} />
        <ListRow
          title="Jazyk"
          value={language === 'sk' ? 'Slovenčina' : 'English'}
          onPress={() => updateProfile({ language: language === 'sk' ? 'en' : 'sk' })}
        />
        <ListRow
          title="Veľkosť textu"
          value={preferences.largeText ? 'Veľká' : 'Štandardná'}
          divider={false}
          onPress={() => setPreference('largeText', !preferences.largeText)}
        />
      </View>

      <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 18, marginBottom: 8 }}>
        Prístupnosť
      </Text>
      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 15 }}>
        {A11Y_ROWS.map((row, i) => (
          <View
            key={row.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 13,
              borderBottomWidth: i < A11Y_ROWS.length - 1 ? 1 : 0,
              borderBottomColor: '#F2F5F9',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="bold">
                {row.label}
              </Text>
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                {row.note}
              </Text>
            </View>
            <Toggle value={preferences[row.key]} onValueChange={(v) => setPreference(row.key, v)} />
          </View>
        ))}
      </View>

      <Button label="Odhlásiť sa" variant="destructive" style={{ marginTop: 20 }} onPress={handleSignOut} />

      <Text variant="caption" center color={colors.textTertiary} style={{ marginTop: 16 }}>
        {APP_NAME} {APP_VERSION}
      </Text>
    </Screen>
  );
}
