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
 *
 * Use this only for a genuinely *forward-looking* clock (a promised next
 * departure / expected-resolution time). For a time that is at, near, or before
 * the base instant — a cancelled departure's scheduled `ČAS` — use
 * `kosiceClockOnDateOf`, which never rolls forward a day.
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

/** Minutes Košice local time is ahead of UTC at instant `at` (+60 CET / +120 CEST). */
export function kosiceOffsetMinutes(at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Bratislava',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/**
 * ISO instant for a Košice calendar date + wall clock (default 00:00). Used to
 * turn a parsed "od 7. septembra 2026" into a real `validFrom`.
 */
export function kosiceDateToIso(
  year: number,
  month1: number,
  day: number,
  hour = 0,
  minute = 0,
): string {
  const guessMs = Date.UTC(year, month1 - 1, day, hour, minute, 0);
  const offMin = kosiceOffsetMinutes(new Date(guessMs));
  return new Date(guessMs - offMin * 60_000).toISOString();
}

/** The Košice calendar Y/M/D of an instant. */
function kosiceYmd(at: Date): { year: number; month: number; day: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Bratislava',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
}

/**
 * Pair a Košice wall-clock `"HH:MM"` with the Košice calendar *day of `base`*,
 * returning an ISO instant. Unlike `combineDateAndClock` this never rolls the
 * clock **forward** past `base` — it is for a time that is at, near, or before
 * the base instant (a cancelled departure's scheduled `ČAS`, announced at or
 * after the trip), not for a promised future departure.
 *
 * The only adjustment it makes is to step **back** one day when the naive
 * same-day pairing lands more than 12 h *after* `base` — a notice posted just
 * after midnight about a trip cancelled just before it. Returns `null` on a bad
 * input.
 */
export function kosiceClockOnDateOf(base: Date, hhmm: string): string | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59 || Number.isNaN(base.getTime())) return null;

  const d = kosiceYmd(base);
  let iso = kosiceDateToIso(d.year, d.month, d.day, h, min);
  if (Date.parse(iso) - base.getTime() > 12 * 60 * 60_000) {
    const prev = kosiceYmd(new Date(base.getTime() - 24 * 60 * 60_000));
    iso = kosiceDateToIso(prev.year, prev.month, prev.day, h, min);
  }
  return iso;
}
