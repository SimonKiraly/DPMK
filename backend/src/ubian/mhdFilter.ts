/**
 * Košice MHD vs everything else — the single filter point.
 *
 * Ported from `ubianService.ts` (`classifyUbianLine`, `isKosiceMhdLine`,
 * `toMhdMode`) and then **tightened** after a live find: this is what keeps
 * suburban/regional buses (eurobus), intercity buses (ARRIVA, SAD), rail (ŽSSK)
 * AND another city's transit (DPMP Prešov) out of everything the backend serves.
 *
 * Two conditions, both required:
 *
 *  1. `line.ezIsUrban === true` — Ubian's own "mestská doprava" flag. `true` for
 *     every DPMK MHD vehicle, `false` for eurobus / ARRIVA / SAD / ŽSSK. Strict
 *     `=== true` (a line with the flag absent is treated as non-MHD).
 *
 *  2. `line.firmaID === 1000` — the Košice operator. `ezIsUrban` is
 *     **city-agnostic**: `DPMP Prešov` (Prešov city transit, `firmaID` 1030,
 *     trip `operatorID` 17071) also carries `ezIsUrban: true` and its line
 *     numbers (1, 2, 4, 8, 12 …) collide with Košice's — it showed up in the
 *     Košice fleet feed during local verification. `firmaID` 1000 is
 *     "Dopravný podnik mesta Košice a.s.", cross-checked on every observed
 *     Košice vehicle against trip `operatorID` 18024 and
 *     `supervisorName` "Dopravný podnik mesta Košice a.s.". It is an operator
 *     identity, not a per-vehicle list or a colour heuristic.
 */
import type { TransportMode } from '../types.js';
import type { UbianLine } from './types.js';

/** "Dopravný podnik mesta Košice a.s." — the only operator whose vehicles are MHD. */
export const DPMK_FIRMA_ID = 1000;
/** Same operator on the trip object (`operatorID`). Kept for cross-checks / logs. */
export const DPMK_OPERATOR_ID = 18024;

/** Raw transport classes the Ubian feed distinguishes for a line. */
export type UbianLineClass = 'tram' | 'trolleybus' | 'train' | 'night' | 'bus';

export function classifyUbianLine(line: UbianLine): UbianLineClass {
  const t = (line.ezLineType || '').toLowerCase();
  const vt = (line.ezVehicleType || '').toLowerCase();
  if (t.includes('tram') || vt.includes('tram')) return 'tram';
  if (t.includes('trol') || vt.includes('trol')) return 'trolleybus';
  if (t.includes('train') || t.includes('rail') || line.ezIsTrain) return 'train';
  if (/^n/i.test(line.line)) return 'night';
  return 'bus';
}

/**
 * Is this line operated as **Košice** city public transport (MHD)?
 * Urban (`ezIsUrban === true`) AND run by the Košice operator (`firmaID === 1000`).
 */
export function isKosiceMhdLine(line: UbianLine): boolean {
  return line.ezIsUrban === true && line.firmaID === DPMK_FIRMA_ID;
}

/**
 * Map an Ubian line onto a supported DPMK MHD mode, or `null` when the vehicle
 * is not Košice MHD and must not be exposed by the backend at all.
 */
export function toMhdMode(line: UbianLine): TransportMode | null {
  if (!isKosiceMhdLine(line)) return null; // regional / suburban / intercity / rail
  switch (classifyUbianLine(line)) {
    case 'tram':
      return 'tram';
    case 'night':
      return 'night';
    case 'bus':
    case 'trolleybus':
      // Košice runs no trolleybuses; if the feed ever tags one it is a road
      // vehicle and belongs with the buses.
      return 'bus';
    case 'train':
      return null;
  }
}
