/**
 * Raw Ubian navigation-API response shapes.
 *
 * Verbatim copy of the interfaces in the mobile app's `src/services/ubianService.ts`
 * (which were themselves verified against live samples — see
 * `docs/TRANSPORT-DATA-SOURCE.md §3`). Do NOT invent fields: extend only from an
 * observed response.
 *
 * Base: https://dpmk-odchody.ubian.sk — public, unauthenticated, `{status:'ok'}`
 * envelope, no CORS headers, no rate-limit headers.
 */

export interface UbianEnvelope {
  status: 'ok' | 'error';
  error_message?: string;
}

export interface UbianLine {
  lineID: number;
  /** Ubian line category. Košice MHD = 1; regional/suburban bus = 2; rail = 22/25/26/31. */
  lineType: number;
  line: string;
  lineNumber: number;
  lineName: string;
  ezLineType: string; // "tram" | "bus" | "train" | "trolleybus" | …
  ezVehicleType: string | null; // "TRAM" | "BUS" | …
  /** Operator/company id. "Dopravný podnik mesta Košice a.s." = 1000. */
  firmaID: number;
  /** "<line>/<firmaID>", e.g. "6/1000" (MHD) vs "802446/1001" (eurobus). */
  uniqueID?: string;
  /**
   * Ubian's own "mestská doprava" flag — `true` for Košice MHD, `false` for
   * every regional / suburban / intercity carrier (eurobus, ARRIVA) and for
   * rail (ŽSSK). This is the field used to keep the tracker MHD-only.
   */
  ezIsUrban?: boolean;
  ezIsTrain?: boolean;
  ezIsBus?: boolean;
  /** Operator display name, e.g. "Dopravný podnik mesta Košice a.s." / "eurobus". */
  supervisorName?: string;
}

export interface UbianTrip {
  tripID: number;
  destinationStopName: string;
  destinationCityName?: string;
  ezTripDirection: 'there' | 'back' | string;
  lowFloor: boolean;
  canceled: boolean;
  messages?: string;
  operatorID?: number;
  operatorName?: string;
  timeTableLine: UbianLine;
}

export interface UbianPlatform {
  platformNumber: number;
  latitude: number | null;
  longitude: number | null;
  platformName: string;
}

export interface UbianStop {
  stopID: number;
  stopName: string;
  stopCity: string;
  latitude: number | null;
  longitude: number | null;
  forUrbanPublicTransport: boolean;
  forBusTransport: boolean;
  forRail: boolean;
  platforms: UbianPlatform[];
  ezLines: string[];
  passingLines?: Record<string, { lineType: string; lines: string[] }[]>;
}

export interface UbianVehicleRaw {
  vehicleID: number;
  delayMinutes: number;
  latitude: number;
  longitude: number;
  lastStopOrder: number;
  isOnStop: boolean;
  tooltip: string;
  timeTableTrip: UbianTrip;
}

export interface UbianDepartureRaw {
  timeTableTrip: UbianTrip;
  plannedDepartureTimestamp: number; // unix seconds
  delayMinutes: number;
  platformNumber: number;
  plannedOrRealVehicleID: number | null;
}

export interface UbianTripStop {
  stopOrder: number;
  stopID: number;
  stopName: string;
  latitude: number;
  longitude: number;
  plannedDepartureTimestamp: number;
}

export interface UbianAutocompleteResult {
  id: number;
  stopName: string;
  stopCity: string;
  type: string; // "stop" | "city" | "address" | …
  transportType: string; // "urban" | "bus" | "train"
  region?: string;
  slug?: string;
}
