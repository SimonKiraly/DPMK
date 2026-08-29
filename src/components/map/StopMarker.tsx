import { memo, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import { stopLabel } from '@/data/stops';
import type { Stop } from '@/types';

interface Props {
  stop: Stop;
  /** Callout press — open the existing Stop Detail screen. */
  onOpen: (stopId: string) => void;
  /** Marker press — recentre the map on this stop. */
  onFocus?: (stop: Stop) => void;
}

/**
 * A single MHD stop on the geographic map: a small dot. Tapping it recentres the
 * map and shows a callout with the stop name + calling lines; the callout opens
 * the existing Stop Detail screen. TransitMap clips these to the viewport and
 * caps how many render at once.
 */
function StopMarkerBase({ stop, onOpen, onFocus }: Props) {
  const [tracks, setTracks] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => setTracks(false), 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const lines = stop.lines.slice(0, 8).join(' · ');

  return (
    <Marker
      coordinate={stop.location}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      zIndex={2}
      identifier={stop.id}
      onPress={() => onFocus?.(stop)}
      onCalloutPress={() => onOpen(stop.id)}
    >
      <View
        style={{
          width: 13,
          height: 13,
          borderRadius: 7,
          backgroundColor: colors.surface,
          borderWidth: 3,
          borderColor: colors.primary,
        }}
      />
      <Callout tooltip onPress={() => onOpen(stop.id)}>
        <View
          style={{
            maxWidth: 230,
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingVertical: 9,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: colors.border,
            ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
          }}
        >
          <Text variant="caption" weight="extrabold" numberOfLines={2}>
            {stopLabel(stop)}
          </Text>
          {lines ? (
            <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 3 }}>
              {lines}
            </Text>
          ) : null}
          <Text variant="overline" weight="bold" color={colors.primary} style={{ marginTop: 5 }}>
            Zobraziť detail zastávky →
          </Text>
        </View>
      </Callout>
    </Marker>
  );
}

export const StopMarker = memo(
  StopMarkerBase,
  (a, b) => a.stop.id === b.stop.id && a.onOpen === b.onOpen && a.onFocus === b.onFocus,
);
