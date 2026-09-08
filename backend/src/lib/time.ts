/**
 * Tiny Košice-clock helpers (`Europe/Bratislava`). Node ships full ICU, so
 * `Intl` is enough — no dependency. Mirrors the mobile app's
 * `src/utils/serviceHours.ts` approach.
 */

/** Minute-of-day (0–1439) for `at`, in Košice local time. */
export function kosiceMinuteOfDay(at: Date): number {
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
 * Combine a base instant with a Košice wall-clock `"HH:MM"`, returning an ISO
 * string. The clock time is assumed to be on the same Košice day as `base`, or
 * the next day when that would put it more than an hour *before* `base` (a
 * "next departure at 00:20" posted at 23:58). Returns `null` on a bad input.
 */
export function combineDateAndClock(base: Date, hhmm: string): string | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;

  const baseMin = kosiceMinuteOfDay(base);
  const targetMin = h * 60 + min;
  let delta = targetMin - baseMin;
  if (delta < -60) delta += 24 * 60; // crossed midnight forward

  // Floor the base to the whole minute — the notice only gives HH:MM.
  const baseFloored = Math.floor(base.getTime() / 60_000) * 60_000;
  return new Date(baseFloored + delta * 60_000).toISOString();
}
