import { useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { APP_NAME, OPERATOR } from '@/constants/config';
import { colors } from '@/constants/theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useUserStore } from '@/store/useUserStore';

const SLIDES = [
  {
    icon: 'bus' as const,
    title: 'Vaše mesto\nv pohybe.',
    body: 'Živé autobusy, električky a lístky pre Košice — kúpte a označte lístok dvomi ťuknutiami.',
  },
  {
    icon: 'navigate' as const,
    title: 'Naplánujte\nkaždú cestu.',
    body: 'Vyhľadávač spojení s reálnymi zastávkami MHD Košice, prestupmi a časom chôdze.',
  },
  {
    icon: 'qr-code' as const,
    title: 'Lístok vždy\npo ruke.',
    body: 'Digitálny lístok s QR kódom, odpočtom platnosti a históriou — aj offline.',
  },
];

export function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const complete = useOnboardingStore((s) => s.complete);
  const continueAsGuest = useUserStore((s) => s.continueAsGuest);
  const slide = SLIDES[index];

  const finish = () => {
    continueAsGuest();
    complete();
  };

  const next = () => (index < SLIDES.length - 1 ? setIndex(index + 1) : finish());

  return (
    <LinearGradient colors={[colors.primary, colors.primaryDeep]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: 28, paddingTop: 72 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -80,
            right: -90,
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: 'rgba(255,213,56,0.14)',
          }}
        />

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="bus" size={24} color={colors.primaryDeep} />
            </View>
            <Text variant="screenTitle" color={colors.white}>
              {APP_NAME}
            </Text>
          </View>

          <View
            style={{
              marginTop: 56,
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={slide.icon} size={34} color={colors.accent} />
          </View>
          <Text variant="hero" color={colors.white} style={{ marginTop: 28 }}>
            {slide.title}
          </Text>
          <Text variant="bodyStrong" weight="semibold" color="rgba(255,255,255,0.72)" style={{ marginTop: 16, maxWidth: 300 }}>
            {slide.body}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index ? 28 : 10,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i === index ? colors.accent : 'rgba(255,255,255,0.28)',
                }}
              />
            ))}
          </View>
          <Button label={index < SLIDES.length - 1 ? 'Ďalej' : 'Začať'} variant="accent" size="lg" onPress={next} />
          <Button label="Preskočiť" variant="ghost" onPress={finish} />
          <Text variant="caption" center color="rgba(255,255,255,0.5)">
            {OPERATOR}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
