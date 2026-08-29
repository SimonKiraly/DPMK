import type { Occupancy } from '@/types';

/**
 * Seed definitions for the live-vehicle simulation used when live Ubian data is
 * off or unavailable. `transportService` turns each entry into a moving
 * `Vehicle` by interpolating along its route polyline. Line numbers below exist
 * in the official DPMK network (data/routes.ts).
 *
 * The real feed (services/ubianService.ts) replaces these entirely when "Živé
 * dáta MHD" is enabled.
 */
export interface VehicleSeed {
  id: string;
  routeShortName: string;
  direction: 0 | 1;
  /** Initial fractional progress along the route, 0..1. */
  progress: number;
  /** Progress gained per real second (controls speed). */
  speed: number;
  occupancy: Occupancy;
  /** Schedule offset in minutes: negative = early, positive = late. */
  delayMinutes: number;
  lowFloor: boolean;
  plate: string;
}

export const VEHICLE_SEEDS: VehicleSeed[] = [
  { id: 'v-6-1142', routeShortName: '6', direction: 0, progress: 0.5, speed: 0.0017, occupancy: 'busy', delayMinutes: 2, lowFloor: true, plate: 'KE-142TT' },
  { id: 'v-6-1108', routeShortName: '6', direction: 1, progress: 0.19, speed: 0.0018, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-108TT' },
  { id: 'v-9-1301', routeShortName: '9', direction: 0, progress: 0.38, speed: 0.0016, occupancy: 'busy', delayMinutes: 1, lowFloor: true, plate: 'KE-301TT' },
  { id: 'v-9-1288', routeShortName: '9', direction: 1, progress: 0.74, speed: 0.0016, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-288TT' },
  { id: 'v-2-1055', routeShortName: '2', direction: 0, progress: 0.47, speed: 0.0018, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-055TT' },
  { id: 'v-3-1077', routeShortName: '3', direction: 1, progress: 0.61, speed: 0.0018, occupancy: 'busy', delayMinutes: 3, lowFloor: false, plate: 'KE-077TT' },
  { id: 'v-16-2617', routeShortName: '16', direction: 0, progress: 0.34, speed: 0.0022, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-617DR' },
  { id: 'v-16-2604', routeShortName: '16', direction: 1, progress: 0.71, speed: 0.0021, occupancy: 'busy', delayMinutes: 1, lowFloor: true, plate: 'KE-604DR' },
  { id: 'v-19-2731', routeShortName: '19', direction: 0, progress: 0.12, speed: 0.0023, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-731BX' },
  { id: 'v-14-2708', routeShortName: '14', direction: 1, progress: 0.55, speed: 0.002, occupancy: 'busy', delayMinutes: 3, lowFloor: false, plate: 'KE-708BX' },
  { id: 'v-23-2890', routeShortName: '23', direction: 0, progress: 0.24, speed: 0.0026, occupancy: 'busy', delayMinutes: 0, lowFloor: true, plate: 'KE-890AL' },
  { id: 'v-28-2455', routeShortName: '28', direction: 1, progress: 0.83, speed: 0.0019, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-455CC' },
  { id: 'v-71-2410', routeShortName: '71', direction: 0, progress: 0.42, speed: 0.0021, occupancy: 'full', delayMinutes: 2, lowFloor: true, plate: 'KE-410CC' },
  { id: 'v-n1-2077', routeShortName: 'N1', direction: 0, progress: 0.3, speed: 0.0024, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-077NL' },
];
