import { memo, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Text } from '@/components/ui/Text';
import { colors, modeColors, shadows } from '@/constants/theme';
import type { Vehicle } from '@/types';

interface Props {
  vehicle: Vehicle;
  selected: boolean;
  /** Filtered out by the mode chips — kept mounted but invisible so the marker
   *  set never churns on a filter change (react-native-maps + New Arch crashes
   *  when many overlays are added/removed at once). */
  hidden?: boolean;
  onPress: (vehicle: Vehicle) => void;
}

/**
 * One live-vehicle marker on the geographic map. A coloured route-number badge
 * (blue = bus, yellow = tram, grey = night), matching the app's `RouteBadge`.
 *
 * Perf: `tracksViewChanges` is only enabled for a moment after mount / a visual
 * change, then frozen — otherwise every one of ~100 markers re-rasterises its
 * view on each parent render. The marker still moves natively when `coordinate`
 * updates (every ~15 s poll) without re-rendering its content.
 */
function VehicleMarkerBase({ vehicle, selected, hidden = false, onPress }: Props) {
  const [tracks, setTracks] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // A hidden (filtered-out) marker never needs to rasterise its view.
    if (hidden) {
      setTracks(false);
      return;
    }
    setTracks(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTracks(false), 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [vehicle.routeShortName, vehicle.mode, selected, hidden]);

  const c = modeColors[vehicle.mode] ?? modeColors.bus;

  return (
    <Marker
      coordinate={vehicle.location}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks && !hidden}
      opacity={hidden ? 0 : 1}
      zIndex={hidden ? 0 : selected ? 30 : 6}
      onPress={hidden ? undefined : () => onPress(vehicle)}
      // Apple Maps recycles annotation views; a stable identifier keeps the
      // right badge attached to the right vehicle.
      identifier={vehicle.id}
    >
      <View
        style={{
          minWidth: 30,
          height: 28,
          paddingHorizontal: 6,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.bg,
          borderWidth: selected ? 3 : 2,
          borderColor: selected ? colors.text : colors.white,
          ...(Platform.OS === 'android' ? {} : shadows.card),
        }}
      >
        <Text variant="caption" weight="extrabold" color={c.fg}>
          {vehicle.routeShortName}
        </Text>
      </View>
    </Marker>
  );
}

export const VehicleMarker = memo(
  VehicleMarkerBase,
  (a, b) =>
    a.selected === b.selected &&
    a.hidden === b.hidden &&
    a.onPress === b.onPress &&
    a.vehicle.id === b.vehicle.id &&
    a.vehicle.routeShortName === b.vehicle.routeShortName &&
    a.vehicle.mode === b.vehicle.mode &&
    a.vehicle.location.latitude === b.vehicle.location.latitude &&
    a.vehicle.location.longitude === b.vehicle.location.longitude,
);
