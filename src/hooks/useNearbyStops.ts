import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

import { KOSICE_CENTER } from '@/constants/config';
import { getNearbyStops } from '@/services/transportService';
import type { LatLng, NearbyStop, TransportMode } from '@/types';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

export interface NearbyStopsState {
  stops: NearbyStop[];
  loading: boolean;
  error: string | null;
  permission: LocationPermission;
  /** The coordinate results are anchored to (real GPS or the city-centre fallback). */
  origin: LatLng;
  usingFallback: boolean;
  refresh: () => Promise<void>;
  requestPermission: () => Promise<void>;
}

/**
 * Nearby stops with graceful degradation: if location permission is denied or
 * unavailable, results are anchored to Košice city centre and `usingFallback`
 * is set so the UI can explain why.
 */
export function useNearbyStops(opts: { mode?: TransportMode | 'all'; limit?: number } = {}): NearbyStopsState {
  const { mode = 'all', limit = 8 } = opts;
  const [stops, setStops] = useState<NearbyStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [origin, setOrigin] = useState<LatLng>(KOSICE_CENTER);
  const [usingFallback, setUsingFallback] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let coord: LatLng = KOSICE_CENTER;
    let fallback = true;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setPermission('granted');
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        fallback = false;
      } else {
        setPermission(status === 'denied' ? 'denied' : 'unknown');
      }
    } catch {
      // Keep the city-centre fallback.
    }

    setOrigin(coord);
    setUsingFallback(fallback);

    try {
      const result = await getNearbyStops(coord, { mode, limit });
      setStops(result);
    } catch {
      setError('Zastávky sa nepodarilo načítať. Skúste to znova.');
    } finally {
      setLoading(false);
    }
  }, [mode, limit]);

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermission(status === 'granted' ? 'granted' : 'denied');
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { stops, loading, error, permission, origin, usingFallback, refresh: load, requestPermission };
}
