import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { colors, radii } from '@/constants/theme';
import { useWalletPass } from '@/hooks/useWalletPass';
import type { Ticket } from '@/types';

export interface AddToWalletButtonProps {
  ticket: Ticket;
  style?: ViewStyle;
}

/**
 * Platform-specific wallet CTA. iOS → Apple Wallet, Android → Google Wallet.
 * Renders nothing for short-term tickets, expired tickets, or unsupported
 * platforms. When a pass already exists it becomes a "view in wallet" control.
 */
export function AddToWalletButton({ ticket, style }: AddToWalletButtonProps) {
  const { eligible, canAdd, added, busy, platformLabel, add, open } = useWalletPass(ticket);

  if (!eligible || (!canAdd && !added)) return null;

  if (added) {
    return (
      <View style={[{ gap: 8 }, style]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.successTint,
            borderRadius: radii.chip,
            paddingVertical: 10,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.successText} />
          <Text variant="caption" weight="bold" color={colors.successText}>
            Pridané do {platformLabel}
          </Text>
        </View>
        <Pressable
          onPress={open}
          style={({ pressed }) => ({
            height: 48,
            borderRadius: radii.button,
            backgroundColor: colors.text,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="wallet" size={17} color={colors.white} />
          <Text variant="body" weight="extrabold" color={colors.white}>
            Zobraziť v {platformLabel}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={add}
      disabled={busy}
      style={({ pressed }) => [
        {
          height: 52,
          borderRadius: radii.button,
          backgroundColor: colors.text,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          opacity: pressed || busy ? 0.9 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Ionicons name="wallet-outline" size={18} color={colors.white} />
          <Text variant="bodyStrong" weight="extrabold" color={colors.white}>
            Pridať do {platformLabel}
          </Text>
        </>
      )}
    </Pressable>
  );
}
