import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  hideBack?: boolean;
  right?: React.ReactNode;
  /** Sits on a coloured hero — flips icon/text to white. */
  tone?: 'default' | 'light';
  background?: string;
}

/** Screen header with a back affordance and optional trailing action. */
export function AppHeader({
  title,
  subtitle,
  onBack,
  hideBack,
  right,
  tone = 'default',
  background = colors.bg,
}: AppHeaderProps) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const fg = tone === 'light' ? colors.white : colors.text;

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 6,
          paddingBottom: 10,
        }}
      >
        {!hideBack && (canGoBack || onBack) ? (
          <Pressable
            onPress={onBack ?? (() => navigation.goBack())}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tone === 'light' ? 'rgba(255,255,255,0.16)' : colors.surface,
              borderWidth: tone === 'light' ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="chevron-back" size={20} color={fg} />
          </Pressable>
        ) : null}

        <View style={{ flex: 1 }}>
          <Text variant="sectionTitle" color={fg} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              variant="caption"
              color={tone === 'light' ? 'rgba(255,255,255,0.72)' : colors.textSecondary}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right ?? null}
      </View>
    </SafeAreaView>
  );
}
