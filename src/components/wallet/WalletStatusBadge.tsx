import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { colors, radii } from '@/constants/theme';
import { useWalletPass } from '@/hooks/useWalletPass';
import type { Ticket } from '@/types';

/**
 * Compact wallet status shown on My Tickets rows. Hugs its content.
 * - short-term ticket        -> nothing
 * - expired long-term ticket -> "Platnosť skončila" (no action)
 * - pass added               -> "V Apple Wallet" / "V Google Wallet" (opens it)
 * - otherwise                -> "Pridať do Wallet" (starts the add flow)
 */
export function WalletStatusBadge({ ticket }: { ticket: Ticket }) {
  const { isLongTerm, expired, added, busy, platformLabel, add, open } = useWalletPass(ticket);

  if (!isLongTerm) return null;

  let content: React.ReactNode;

  if (expired) {
    content = <StatusBadge label="Platnosť skončila" tone="neutral" />;
  } else if (added) {
    content = (
      <Pressable
        onPress={open}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: colors.primaryTint,
          borderRadius: radii.chip,
          paddingVertical: 6,
          paddingHorizontal: 10,
        }}
      >
        <Ionicons name="wallet" size={13} color={colors.primary} />
        <Text variant="overline" color={colors.primary}>
          V {platformLabel}
        </Text>
      </Pressable>
    );
  } else {
    content = (
      <Pressable
        onPress={add}
        disabled={busy}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: colors.text,
          borderRadius: radii.chip,
          paddingVertical: 6,
          paddingHorizontal: 10,
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons name="wallet-outline" size={13} color={colors.white} />
        )}
        <Text variant="overline" color={colors.white}>
          Pridať do Wallet
        </Text>
      </Pressable>
    );
  }

  return <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{content}</View>;
}
