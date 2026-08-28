import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/ui/Text';
import { colors, radii, shadows } from '@/constants/theme';
import { useCountdown } from '@/hooks/useCountdown';
import type { Ticket } from '@/types';
import { formatClock } from '@/utils/format';

export interface ActiveTicketBannerProps {
  ticket: Ticket;
  onPress?: () => void;
}

/** Compact live active-ticket card for the Home screen. */
export function ActiveTicketBanner({ ticket, onPress }: ActiveTicketBannerProps) {
  const { label, expired } = useCountdown(ticket.expiresAt, ticket.activatedAt);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.96 } : undefined)}>
      <LinearGradient
        colors={[colors.accent, colors.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, padding: 18, ...shadows.ticket }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: expired ? colors.error : colors.success }} />
            <Text variant="overline" color="#7A5C00">
              {expired ? 'Lístok vypršal' : 'Aktívny lístok'}
            </Text>
          </View>
          <Text variant="caption" weight="bold" color="#7A5C00">
            ID {ticket.id}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Text variant="sectionTitle" color={colors.text}>
              {ticket.name}
            </Text>
            <Text variant="caption" weight="semibold" color="#5E4A08" style={{ marginTop: 3 }}>
              {ticket.expiresAt ? `Platný do ${formatClock(ticket.expiresAt)} · ${ticket.zones}` : ticket.zones}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              variant="screenTitle"
              color={colors.text}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {label}
            </Text>
            <Text variant="overline" color="#5E4A08">
              zostáva
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
