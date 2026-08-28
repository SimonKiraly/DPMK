import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { DepartureChip } from '@/components/transport/DepartureChip';
import { colors } from '@/constants/theme';
import type { NearbyStop } from '@/types';
import { stopLabel } from '@/data/stops';
import { formatDistance } from '@/utils/format';

const MODE_TAG: Record<string, string> = {
  bus: 'BUS',
  trolleybus: 'TROL',
  tram: 'ELE',
  rail: 'VLAK',
  night: 'NOC',
};

export interface StopCardProps {
  nearby: NearbyStop;
  onPress?: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
}

/** Nearby-stop card: name, distance, lines and next departures. */
export function StopCard({ nearby, onPress, saved, onToggleSave }: StopCardProps) {
  const { stop } = nearby;
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.primaryTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="overline" color={colors.primary}>
            {MODE_TAG[stop.mode] ?? 'MHD'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="body" weight="extrabold" numberOfLines={1}>
            {stopLabel(stop)}
          </Text>
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
            {formatDistance(nearby.distanceMeters)} · {nearby.walkMinutes} min chôdze · {stop.lines.slice(0, 5).join(' · ')}
          </Text>
        </View>
        {onToggleSave ? (
          <Pressable onPress={onToggleSave} hitSlop={10}>
            <Ionicons
              name={saved ? 'star' : 'star-outline'}
              size={20}
              color={saved ? colors.accentDeep : colors.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>

      {nearby.departures.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
          {nearby.departures.map((d, i) => (
            <DepartureChip key={`${d.routeShortName}-${i}`} departure={d} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}
