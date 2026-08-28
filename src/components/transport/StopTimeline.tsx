import { View } from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import type { VehicleTimelineEntry } from '@/types';
import { formatClock } from '@/utils/format';

/** Vertical stop list with a progress line — used on the vehicle detail screen. */
export function StopTimeline({ entries }: { entries: VehicleTimelineEntry[] }) {
  return (
    <View>
      {entries.map((entry, i) => {
        const isPast = entry.state === 'passed';
        const isCurrent = entry.state === 'current';
        const isLast = i === entries.length - 1;

        const dotBg = isPast ? '#CFD8E3' : isCurrent ? colors.accent : colors.surface;
        const dotBorder = isPast ? '#CFD8E3' : isCurrent ? colors.text : colors.primary;
        const textColor = isPast ? '#A9B4C2' : colors.text;

        return (
          <View key={entry.stopId + i} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 22, alignItems: 'center' }}>
              <View
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 7,
                  backgroundColor: dotBg,
                  borderWidth: 3,
                  borderColor: dotBorder,
                }}
              />
              {!isLast ? (
                <View
                  style={{
                    flex: 1,
                    width: 3,
                    minHeight: 26,
                    backgroundColor: isPast ? '#CFD8E3' : '#DDE4EC',
                  }}
                />
              ) : null}
            </View>
            <View
              style={{
                flex: 1,
                paddingBottom: isLast ? 0 : 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text variant="body" weight={isCurrent ? 'extrabold' : 'bold'} color={textColor}>
                  {entry.name}
                  {entry.platform ? `, ${entry.platform}` : ''}
                </Text>
                {isCurrent ? (
                  <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                    <StatusBadge label="Najbližšia zastávka" tone="info" />
                  </View>
                ) : null}
              </View>
              <Text
                variant="caption"
                weight="extrabold"
                color={textColor}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatClock(entry.time)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
