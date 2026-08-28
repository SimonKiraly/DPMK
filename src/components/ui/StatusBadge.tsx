import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

export type BadgeTone = 'success' | 'warning' | 'error' | 'accent' | 'neutral' | 'info';

const TONE: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successTint, fg: colors.successText },
  warning: { bg: colors.warningTint, fg: colors.warning },
  error: { bg: colors.errorTint, fg: colors.errorText },
  accent: { bg: colors.accent, fg: colors.text },
  neutral: { bg: '#F1F4F9', fg: colors.textSecondary },
  info: { bg: colors.primaryTint, fg: colors.primary },
};

export interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const t = TONE[tone];
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 }}>
      <Text variant="overline" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}
