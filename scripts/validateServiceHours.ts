/**
 * Checks for the Košice-clock service-hour gate (src/utils/serviceHours.ts)
 * that keeps the mock departure board / journey planner from listing a service
 * class outside the hours it runs (the "night lines shown at noon" bug).
 *
 * Integration cases use REAL DPMK data: patterns from src/data/routes.ts through
 * the real hub stop "Námestie osloboditeľov" (s-namestie-osloboditelov), which
 * DPMK serves with both day lines and every night line N1–N7.
 *
 * Run:  npx tsx scripts/validateServiceHours.ts     (exits non-zero on failure)
 */

import { serviceHours } from '../src/constants/config.ts';
import { ROUTE_PATTERNS } from '../src/data/routes.ts';
import { isServiceRunningAt, kosiceMinuteOfDay } from '../src/utils/serviceHours.ts';

const errors: string[] = [];
const rows: string[] = [];
const ok = (cond: boolean, label: string) => {
  rows.push(`${cond ? '✓' : '✗'}  ${label}`);
  if (!cond) errors.push(label);
};

/** A `Date` that reads as `hh:mm` in Košice local time, DST handled. */
function atKosice(hh: number, mm = 0): Date {
  const probe = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));
  const offsetMin = kosiceMinuteOfDay(probe) - 12 * 60; // Bratislava = UTC + offset
  const targetUtcMs = Date.UTC(2026, 8, 15, 0, 0, 0) + (hh * 60 + mm - offsetMin) * 60000;
  return new Date(targetUtcMs);
}

/* ---------------------------------------------- 0. atKosice / kosiceMinuteOfDay */

for (const [hh, mm] of [
  [0, 1],
  [6, 30],
  [14, 0],
  [23, 59],
] as const) {
  ok(
    kosiceMinuteOfDay(atKosice(hh, mm)) === hh * 60 + mm,
    `kosiceMinuteOfDay(atKosice(${hh}:${String(mm).padStart(2, '0')})) === ${hh * 60 + mm}`,
  );
}

/* ------------------------------------------------------- 1. pure gate, by mode */

// daytime → night service is NOT running
ok(isServiceRunningAt('night', atKosice(14, 0)) === false, 'noon: night line NOT running');
ok(isServiceRunningAt('bus', atKosice(14, 0)) === true, 'noon: day (bus) line running');
ok(isServiceRunningAt('tram', atKosice(14, 0)) === true, 'noon: day (tram) line running');

// evening → day service still running; night service starts at 23:15 (DPMK)
ok(isServiceRunningAt('bus', atKosice(21, 0)) === true, '21:00: day line running');
ok(isServiceRunningAt('night', atKosice(21, 0)) === false, '21:00: night line NOT running yet');
ok(isServiceRunningAt('night', atKosice(23, 0)) === false, '23:00: night line NOT running yet (starts 23:15)');
ok(isServiceRunningAt('night', atKosice(23, 15)) === true, '23:15: night service starts (DPMK published span)');
ok(isServiceRunningAt('bus', atKosice(23, 15)) === true, '23:15: day line still running');

// just before / just after midnight
ok(isServiceRunningAt('bus', atKosice(23, 59)) === true, '23:59: day line running');
ok(isServiceRunningAt('night', atKosice(23, 59)) === true, '23:59: night line running');
ok(isServiceRunningAt('bus', atKosice(0, 1)) === false, '00:01: day line NOT running');
ok(isServiceRunningAt('night', atKosice(0, 1)) === true, '00:01: night line running');

// previous-service-day trips that run after midnight
for (const hh of [0, 1, 2, 3] as const) {
  ok(isServiceRunningAt('night', atKosice(hh, 30)) === true, `0${hh}:30: after-midnight night line running`);
  ok(isServiceRunningAt('bus', atKosice(hh, 30)) === false, `0${hh}:30: day line NOT running`);
}

// early morning back to day service
ok(isServiceRunningAt('night', atKosice(5, 0)) === false, '05:00: night line finished');
ok(isServiceRunningAt('bus', atKosice(5, 0)) === true, '05:00: day line running');

// the 23:59 → 00:00 transition, gating on the DEPARTURE instant (what
// getStopDepartures does): a night departure computed for 00:03 is valid,
// a day departure computed for 00:03 is not.
ok(isServiceRunningAt('night', atKosice(0, 3)) === true, 'transition: night departure at 00:03 shown');
ok(isServiceRunningAt('bus', atKosice(0, 3)) === false, 'transition: day departure at 00:03 hidden');

/* -------------------------------------- 2. coverage: something always runs ----*/

for (let h = 0; h < 24; h += 1) {
  const t = atKosice(h, 0);
  ok(
    isServiceRunningAt('bus', t) || isServiceRunningAt('night', t),
    `${String(h).padStart(2, '0')}:00: at least one service class running (planner never starved)`,
  );
}

/* ------------------------------ 3. integration: real hub, real patterns -------*/

const HUB = 's-namestie-osloboditelov';
const hubPatterns = ROUTE_PATTERNS.filter(
  (p) => p.stopIds.includes(HUB) && p.stopIds.indexOf(HUB) < p.stopIds.length - 1,
);
const nightPatterns = hubPatterns.filter((p) => p.mode === 'night');
const dayPatterns = hubPatterns.filter((p) => p.mode !== 'night');

ok(nightPatterns.length > 0, `hub has night patterns in real data (${nightPatterns.length})`);
ok(dayPatterns.length > 0, `hub has day patterns in real data (${dayPatterns.length})`);

// noon: exactly the day patterns pass the gate, zero night patterns
const noon = atKosice(12, 0);
ok(
  nightPatterns.every((p) => !isServiceRunningAt(p.mode, noon)),
  'noon: 0 night patterns at the hub pass the gate',
);
ok(
  dayPatterns.filter((p) => isServiceRunningAt(p.mode, noon)).length === dayPatterns.length,
  `noon: all ${dayPatterns.length} day patterns at the hub still pass (no regression)`,
);

// 01:00: night patterns pass, day patterns don't
const deepNight = atKosice(1, 0);
ok(
  nightPatterns.every((p) => isServiceRunningAt(p.mode, deepNight)),
  '01:00: all night patterns at the hub pass the gate',
);
ok(
  dayPatterns.every((p) => !isServiceRunningAt(p.mode, deepNight)),
  '01:00: 0 day patterns at the hub pass the gate',
);

// 23:30: overlap — both classes run
const lateEve = atKosice(23, 30);
ok(
  nightPatterns.some((p) => isServiceRunningAt(p.mode, lateEve)) &&
    dayPatterns.some((p) => isServiceRunningAt(p.mode, lateEve)),
  '23:30: both day and night patterns at the hub pass (transition window)',
);

/* ------------------------------------------------------------------- report ---*/

console.log('DPMK service-hours validation');
console.log('─'.repeat(72));
console.log(
  `windows (Košice local): day ${serviceHours.day.startMin / 60}:00–${serviceHours.day.endMin / 60}:00` +
    `, night ${Math.floor(serviceHours.night.startMin / 60)}:${serviceHours.night.startMin % 60}` +
    `–0${Math.floor(serviceHours.night.endMin / 60)}:${String(serviceHours.night.endMin % 60).padStart(2, '0')}`,
);
console.log('─'.repeat(72));
for (const r of rows) console.log(r);
console.log('─'.repeat(72));

if (errors.length) {
  console.log(`\n${errors.length} failure(s):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log('\nFAIL');
  process.exit(1);
}
console.log(`\nOK — ${rows.length} service-hour assertions passed.`);
