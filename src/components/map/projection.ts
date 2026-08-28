import type { LatLng } from '@/types';
import { STOPS } from '@/data/stops';

/**
 * Equirectangular projection tuned to the Košice network extent. Produces
 * "world" pixel coordinates that the map view then pans / zooms. Latitude is
 * stretched by 1/cos(lat) so shapes keep roughly the right proportions.
 */

const PAD = 0.012; // ~1.3 km padding around the network

const lats = STOPS.map((s) => s.location.latitude);
const lngs = STOPS.map((s) => s.location.longitude);

export const REGION = {
  minLat: Math.min(...lats) - PAD,
  maxLat: Math.max(...lats) + PAD,
  minLng: Math.min(...lngs) - PAD,
  maxLng: Math.max(...lngs) + PAD,
};

const centerLat = (REGION.minLat + REGION.maxLat) / 2;
const aspect = Math.cos((centerLat * Math.PI) / 180);

export const WORLD_WIDTH = 1100;
const pxPerLng = WORLD_WIDTH / (REGION.maxLng - REGION.minLng);
const pxPerLat = pxPerLng / aspect;
export const WORLD_HEIGHT = (REGION.maxLat - REGION.minLat) * pxPerLat;

export function project(coord: LatLng): { x: number; y: number } {
  return {
    x: (coord.longitude - REGION.minLng) * pxPerLng,
    y: (REGION.maxLat - coord.latitude) * pxPerLat,
  };
}
