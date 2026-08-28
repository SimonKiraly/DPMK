import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/components/ui/Text';
import { colors, radii, shadows } from '@/constants/theme';
import { walletService } from '@/services/walletService';
import type { Ticket } from '@/types';
import { formatDateNumeric } from '@/utils/format';

/**
 * In-app preview of the digital-wallet pass — the visual the backend-signed
 * `.pkpass` / Google pass will mirror. Blue-dominant, yellow accent, real
 * ticket data (never hardcoded).
 */
export function WalletPassPreview({ ticket, passengerName }: { ticket: Ticket; passengerName: string }) {
  const p = walletService.buildPassPayload(ticket, passengerName);
  const notYetActive = !ticket.activatedAt;

  return (
    <View style={{ borderRadius: radii.card, overflow: 'hidden', ...shadows.card }}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDeep]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ padding: 18 }}
      >
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="bus" size={19} color={colors.primaryDeep} />
            </View>
            <View>
              <Text variant="bodyStrong" color={colors.white}>
                {p.organizationName}
              </Text>
              <Text variant="overline" color="rgba(255,255,255,0.7)">
                Verejná doprava
              </Text>
            </View>
          </View>
          <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
        </View>

        {/* ticket type */}
        <Text variant="sectionTitle" color={colors.white} style={{ marginTop: 18 }}>
          {p.ticketName}
        </Text>
        <Text variant="caption" weight="bold" color={colors.accent} style={{ marginTop: 2 }}>
          {p.fareClassLabel} · {p.zones}
        </Text>

        {/* validity */}
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 20 }}>
          <PassField label="Platný">
            {notYetActive
              ? 'Po aktivácii'
              : `${formatDateNumeric(p.validFrom)} – ${formatDateNumeric(p.validUntil)}`}
          </PassField>
        </View>

        <View style={{ marginTop: 14, flexDirection: 'row', gap: 20 }}>
          <PassField label="Cestujúci">{p.passengerName}</PassField>
          <PassField label="Ticket ID">{p.reference}</PassField>
        </View>

        {/* barcode */}
        <View
          style={{
            marginTop: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.16)',
            paddingTop: 16,
          }}
        >
          <View style={{ width: 78, height: 78, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
            <QRCode value={p.barcodeValue} size={64} color={colors.text} backgroundColor={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="overline" color="rgba(255,255,255,0.7)">
              {p.provider} · {p.city}, {p.country}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>
              {p.operator}
            </Text>
            <Text variant="overline" color="rgba(255,255,255,0.55)" style={{ marginTop: 6 }}>
              Kód pre revízora — nezdieľajte snímku obrazovky
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function PassField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="overline" color="rgba(255,255,255,0.6)">
        {label}
      </Text>
      <Text variant="caption" weight="extrabold" color={colors.white} style={{ marginTop: 3 }}>
        {children}
      </Text>
    </View>
  );
}
