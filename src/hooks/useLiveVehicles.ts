import { useEffect, useMemo, useState } from 'react';

import { subscribeVehicles } from '@/services/transportService';
import type { TransportMode, Vehicle } from '@/types';

export interface VehicleFilter {
  mode?: TransportMode | 'all';
  query?: string;
}

/**
 * Subscribes to the live-vehicle simulation and returns the current fleet.
 * The service starts/stops its ticker automatically based on subscribers.
 */
export function useLiveVehicles(filter: VehicleFilter = {}): Vehicle[] {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => subscribeVehicles(setVehicles), []);

  return useMemo(() => {
    let list = vehicles;
    if (filter.mode && filter.mode !== 'all') {
      list = list.filter((v) => v.mode === filter.mode);
    }
    const q = filter.query?.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) => v.routeShortName.toLowerCase().includes(q) || v.headsign.toLowerCase().includes(q),
      );
    }
    return list;
  }, [vehicles, filter.mode, filter.query]);
}
