/** Shared domain types for the MHD Košice app. */

export type LatLng = { latitude: number; longitude: number };

export type TransportMode = 'bus' | 'trolleybus' | 'tram' | 'rail' | 'night';

export type Occupancy = 'quiet' | 'busy' | 'full';

export type DelayStatus = {
  /** Minutes ahead(-) / behind(+) schedule. 0 = on time. */
  minutes: number;
  label: string;
  onTime: boolean;
};

export interface Stop {
  id: string;
  name: string;
  /** Optional platform / sub-name, e.g. "Cottbuská". */
  platform?: string;
  mode: TransportMode;
  location: LatLng;
  /** Line short names that call at this stop. */
  lines: string[];
  zone: 1 | 2;
}

export interface TransitRoute {
  id: string;
  /** Short public-facing name, e.g. "16", "R810", "N1". */
  shortName: string;
  mode: TransportMode;
  /** Human headsign per direction, index 0 = outbound, 1 = inbound. */
  headsigns: [string, string];
  /** Ordered stop ids, outbound direction. */
  stopIds: string[];
  color?: string;
  night?: boolean;
}

export interface NearbyStop {
  stop: Stop;
  /** Metres from the reference point. */
  distanceMeters: number;
  walkMinutes: number;
  departures: Departure[];
}

export interface Departure {
  routeShortName: string;
  mode: TransportMode;
  headsign: string;
  /** ISO timestamp of the (predicted) departure. */
  time: string;
  /** Minutes from now, pre-computed for convenience. */
  inMinutes: number;
  realtime: boolean;
  delay: DelayStatus;
}

export interface Vehicle {
  id: string;
  routeShortName: string;
  routeId: string;
  mode: TransportMode;
  headsign: string;
  /** 0 outbound, 1 inbound. */
  direction: 0 | 1;
  location: LatLng;
  bearing: number;
  /** Fractional progress along the route polyline, 0..1. */
  progress: number;
  nextStopId: string;
  nextStopName: string;
  etaNextStopMinutes: number;
  occupancy: Occupancy;
  delay: DelayStatus;
  lowFloor: boolean;
  plate: string;
  /** Source: 'sim' = local simulation, 'live' = Ubian real-time feed. */
  source?: 'sim' | 'live';
  /** Provider trip id (live source) — needed to fetch the stop timeline. */
  tripId?: string;
  /** Provider operator id (live source). */
  operatorId?: number;
  /** True when the feed reports the vehicle is currently dwelling at a stop. */
  atStop?: boolean;
  /** Live source: order of the last passed stop on the trip. */
  lastStopOrder?: number;
}

export interface VehicleDetail extends Vehicle {
  /** Upcoming stops with predicted call times. */
  timeline: VehicleTimelineEntry[];
}

export interface VehicleTimelineEntry {
  stopId: string;
  name: string;
  platform?: string;
  time: string;
  state: 'passed' | 'current' | 'upcoming' | 'terminus';
}

export interface Place {
  id: string;
  name: string;
  subtitle: string;
  location: LatLng;
  /** Nearest stop id, used to seed journey planning. */
  nearestStopId: string;
  kind: 'poi' | 'address' | 'stop' | 'home' | 'work';
}

export type JourneyLegKind = 'walk' | 'ride';

export interface JourneyLeg {
  kind: JourneyLegKind;
  mode?: TransportMode;
  routeShortName?: string;
  fromName: string;
  toName: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  /** Intermediate stop count for ride legs. */
  stopCount?: number;
  headsign?: string;
}

export interface Journey {
  id: string;
  fromName: string;
  toName: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  walkMinutes: number;
  transfers: number;
  legs: JourneyLeg[];
  fareEuros: number;
  delay: DelayStatus;
  fastest: boolean;
  accessible: boolean;
}

export type JourneyPreference = 'fastest' | 'fewest_transfers' | 'least_walking' | 'accessible';

/* ------------------------------------------------------------------ tickets */

export type TicketCategory = 'basic' | 'prepaid';
export type FareClass = 'standard' | 'discounted';

export interface TicketProduct {
  id: string;
  category: TicketCategory;
  name: string;
  shortLabel: string; // "30", "365"
  unit: string; // "MIN", "HOD", "DNÍ"
  note: string;
  /** Validity in milliseconds once activated. */
  durationMs: number;
  price: Record<FareClass, number>;
  bestValue?: boolean;
  zones: string;
}

export type TicketStatus = 'inactive' | 'valid' | 'expired';

export interface Ticket {
  id: string;
  productId: string;
  name: string;
  fareClass: FareClass;
  priceEuros: number;
  zones: string;
  status: TicketStatus;
  purchasedAt: string;
  /** Null until the passenger activates it. */
  activatedAt: string | null;
  expiresAt: string | null;
  durationMs: number;
  /** Short signed payload rendered into the QR / inspector code. */
  verificationCode: string;
  paymentMethodId: string;
}

/* ------------------------------------------------------------------ payments */

export type PaymentMethodKind = 'apple_pay' | 'google_pay' | 'card' | 'wallet';

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  detail: string;
  /** Wallet balance is dynamic; card expiry etc. otherwise. */
  removable: boolean;
}

export type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed';

export interface PaymentIntent {
  id: string;
  amountEuros: number;
  description: string;
  methodId: string;
}

export interface PaymentResult {
  status: 'succeeded' | 'failed';
  intentId: string;
  reference: string;
  processedAt: string;
  errorMessage?: string;
}

/* ------------------------------------------------------------------ wallet */

export type TransactionKind = 'ticket' | 'topup' | 'refund' | 'booking';

export interface Transaction {
  id: string;
  kind: TransactionKind;
  title: string;
  subtitle: string;
  amountEuros: number; // negative = debit
  createdAt: string;
  methodLabel: string;
}

/* ------------------------------------------------------------------ favorites */

export type FavoriteKind = 'stop' | 'route' | 'place';

export interface FavoriteStop {
  kind: 'stop';
  id: string;
  stopId: string;
  name: string;
  lines: string[];
  addedAt: string;
}

export interface FavoriteRoute {
  kind: 'route';
  id: string;
  routeId: string;
  shortName: string;
  headsign: string;
  mode: TransportMode;
  alertsEnabled: boolean;
  addedAt: string;
}

export interface FavoritePlace {
  kind: 'place';
  id: string;
  label: string; // "Domov", "Práca", custom
  slot: 'home' | 'work' | 'custom';
  placeName: string;
  location: LatLng;
  nearestStopId: string;
  addedAt: string;
}

export type Favorite = FavoriteStop | FavoriteRoute | FavoritePlace;

/* ------------------------------------------------------------------ notifications */

export type NotificationKind = 'disruption' | 'trip_update' | 'info' | 'offer' | 'ticket';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  cta?: { label: string; target: NotificationTarget };
}

export type NotificationTarget =
  | { screen: 'LiveMap' }
  | { screen: 'Tickets' }
  | { screen: 'Planner' }
  | { screen: 'VehicleDetail'; routeShortName: string }
  | { screen: 'Notifications' };

/* ------------------------------------------------------------------ account */

export type DiscountEntitlement = 'none' | 'student' | 'senior' | 'child' | 'disability';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  initials: string;
  cityCardVerified: boolean;
  discount: DiscountEntitlement;
  language: 'sk' | 'en';
}

export interface UserPreferences {
  disruptionAlerts: boolean;
  autoActivateTickets: boolean;
  validationHaptics: boolean;
  lowFloorOnly: boolean;
  ticketExpiryReminders: boolean;
  largeText: boolean;
  highContrast: boolean;
  /** Opt in to the live DPMK / Ubian data feed instead of the sample data. */
  liveTransportData: boolean;
}

/* ------------------------------------------------------------------ lost & found */

export type LostFoundType = 'lost' | 'found';
export type LostFoundStatus = 'open' | 'matched' | 'resolved' | 'closed';

export interface LostFoundReport {
  id: string;
  type: LostFoundType;
  description: string;
  mode: TransportMode;
  routeShortName: string;
  date: string; // ISO date
  timeWindow: string; // "17:30 – 18:00"
  contactEmail: string;
  contactPhone: string;
  photoUri?: string;
  status: LostFoundStatus;
  createdAt: string;
  reference: string;
}
