import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors } from '@/constants/theme';
import type { Ticket } from '@/types';
import { ticketService } from '@/services/ticketService';

export interface TicketQrProps {
  ticket: Ticket;
  size?: number;
}

/** Renders the inspector / validator QR for a ticket. */
export function TicketQr({ ticket, size = 112 }: TicketQrProps) {
  const payload = ticketService.buildQrPayload(ticket);
  return (
    <View
      style={{
        width: size + 18,
        height: size + 18,
        borderRadius: 16,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <QRCode value={payload} size={size} color={colors.text} backgroundColor={colors.white} />
    </View>
  );
}
