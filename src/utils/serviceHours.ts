import { serviceHours } from '@/constants/config';
import type { TransportMode } from '@/types';

/**
 * Košice-clock service-hour checks for the mock departure board and journey
 * planner. The app has no real timetable, but every synthesised departure /
 * boarding still gets gated to the hours its service class actually runs
 * (`config.serviceHours`) so daytime boards don't list night `N*` lines and
 * night boards don't list day lines.
 */

/**
 * Minute-of-day (0–1439) for the instant `at`, in Košice local time
 * (`Europe/Bratislava`, so DST is handled by the platform). Uses `Intl`, which
 * Hermes ships with full ICU on SDK 57 — no dependency.
 */
export function kosiceMinuteOfDay(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bratislava',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/**
 * Is a service of `mode` operating at the instant `at` (Košice clock)?
 *
 * `night` uses a window that wraps midnight (`start > end`), so an after-midnight
 * departure that belongs to the previous service day (e.g. 00:30) still counts
 * as running — this is checked against the real wall-clock of the departure
 * instant, never an HH:MM string or a service-day offset.
 */
export function isServiceRunningAt(mode: TransportMode, at: Date = new Date()): boolean {
  const window = mode === 'night' ? serviceHours.night : serviceHours.day;
  const min = kosiceMinuteOfDay(at);
  return window.startMin <= window.endMin
    ? min >= window.startMin && min < window.endMin
    : min >= window.startMin || min < window.endMin;
}
