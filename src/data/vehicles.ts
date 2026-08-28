import type { Occupancy } from '@/types';

/**
 * Seed definitions for the live-vehicle simulation. `transportService` turns
 * each entry into a moving `Vehicle` by interpolating along its route polyline.
 *
 * Replace with a websocket / polling subscription to the DPMK AVL feed later;
 * keep the `Vehicle` output shape and the rest of the app is unaffected.
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
  { id: 'v-16-2617', routeShortName: '16', direction: 0, progress: 0.34, speed: 0.0022, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-217DR' },
  { id: 'v-16-2604', routeShortName: '16', direction: 1, progress: 0.71, speed: 0.0021, occupancy: 'busy', delayMinutes: 1, lowFloor: true, plate: 'KE-204DR' },
  { id: 'v-19-2731', routeShortName: '19', direction: 0, progress: 0.12, speed: 0.0023, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-731BX' },
  { id: 'v-19-2708', routeShortName: '19', direction: 1, progress: 0.55, speed: 0.002, occupancy: 'busy', delayMinutes: 3, lowFloor: false, plate: 'KE-708BX' },
  { id: 'v-12-2410', routeShortName: '12', direction: 0, progress: 0.42, speed: 0.0019, occupancy: 'full', delayMinutes: 2, lowFloor: true, plate: 'KE-410CC' },
  { id: 'v-12-2455', routeShortName: '12', direction: 1, progress: 0.83, speed: 0.0018, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-455CC' },
  { id: 'v-23-2890', routeShortName: '23', direction: 0, progress: 0.24, speed: 0.0026, occupancy: 'busy', delayMinutes: 0, lowFloor: true, plate: 'KE-890AL' },
  { id: 'v-23-2877', routeShortName: '23', direction: 1, progress: 0.63, speed: 0.0025, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-877AL' },
  { id: 'v-6-1142', routeShortName: '6', direction: 0, progress: 0.5, speed: 0.0017, occupancy: 'busy', delayMinutes: 2, lowFloor: true, plate: 'KE-T142' },
  { id: 'v-6-1108', routeShortName: '6', direction: 1, progress: 0.19, speed: 0.0018, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-T108' },
  { id: 'v-4-1233', routeShortName: '4', direction: 0, progress: 0.66, speed: 0.0016, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-T233' },
  { id: 'v-9-1301', routeShortName: '9', direction: 0, progress: 0.38, speed: 0.0016, occupancy: 'busy', delayMinutes: 1, lowFloor: true, plate: 'KE-T301' },
  { id: 'v-2-1055', routeShortName: '2', direction: 1, progress: 0.47, speed: 0.0018, occupancy: 'quiet', delayMinutes: 0, lowFloor: true, plate: 'KE-T055' },
];
