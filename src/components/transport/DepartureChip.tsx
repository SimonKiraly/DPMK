import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import type { Departure } from '@/types';
import { formatRelativeMinutes } from '@/utils/format';

/** Small pill: line number + relative arrival, tinted by delay. */
export function DepartureChip({ departure }: { departure: Departure }) {
  const late = !departure.delay.onTime;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: late ? colors.warningTint : colors.surfaceAlt,
        borderRadius: 10,
        paddingHorizontal: 9,
        paddingVertical: 6,
      }}
    >
      <Text variant="caption" weight="extrabold" color={colors.primary}>
        {departure.routeShortName}
      </Text>
      <Text variant="caption" weight="bold" color={late ? colors.warning : colors.text}>
        {departure.inMinutes <= 0 ? 'teraz' : `${departure.inMinutes} min`}
      </Text>
    </View>
  );
}

/** One-line departure row for stop detail lists. */
export function DepartureRow({ departure }: { departure: Departure }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F5F9',
      }}
    >
      <View
        style={{
          minWidth: 34,
          height: 30,
          paddingHorizontal: 6,
          borderRadius: 9,
          backgroundColor: colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="caption" weight="extrabold" color={colors.primary}>
          {departure.routeShortName}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="bold" numberOfLines={1}>
          {departure.headsign}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          {departure.realtime ? 'Živé sledovanie' : 'Podľa cestovného poriadku'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="bodyStrong">{formatRelativeMinutes(departure.inMinutes)}</Text>
        {!departure.delay.onTime ? (
          <Text variant="caption" weight="bold" color={colors.warning}>
            {departure.delay.label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
