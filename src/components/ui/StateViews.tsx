import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { colors, radii } from '@/constants/theme';

export function LoadingState({ label = 'Načítavam…' }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={colors.primary} />
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
      <Ionicons name="cloud-offline-outline" size={30} color={colors.textTertiary} />
      <Text variant="body" center color={colors.textSecondary}>
        {message}
      </Text>
      {onRetry ? <Button label="Skúsiť znova" variant="secondary" size="sm" fullWidth={false} onPress={onRetry} /> : null}
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  actionLabel?: string;
  onAction?: () => void;
  dashed?: boolean;
}

export function EmptyState({ title, description, icon, actionLabel, onAction, dashed = true }: EmptyStateProps) {
  return (
    <View
      style={{
        padding: 22,
        alignItems: 'center',
        gap: 6,
        borderRadius: radii.card,
        borderWidth: dashed ? 1 : 0,
        borderStyle: 'dashed',
        borderColor: '#C9D6E6',
        backgroundColor: dashed ? colors.surface : 'transparent',
      }}
    >
      {icon ? <Ionicons name={icon} size={26} color={colors.textTertiary} style={{ marginBottom: 4 }} /> : null}
      <Text variant="bodyStrong" center>
        {title}
      </Text>
      {description ? (
        <Text variant="caption" center color={colors.textTertiary}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="accent" size="sm" style={{ marginTop: 10 }} onPress={onAction} />
      ) : null}
    </View>
  );
}
