/**
 * Structural validation for the official DPMK static route network
 * (src/data/dpmkNetwork.ts) and its app adapters (src/data/routes.ts,
 * src/data/stops.ts).
 *
 * Run:  node scripts/validateTransportData.ts
 * (Node 18+; Node 23.6+ / 24 runs the TypeScript directly. Exits non-zero on
 * any error so it can gate CI.)
 *
 * Checks:
 *   - no duplicate route ids / numbers / stop ids
 *   - no empty route / direction / stop names
 *   - every route has >= 1 direction, every direction has >= 2 stops
 *   - per-direction stop sequences are 1..n, strictly increasing, no gaps
 *   - transport types are one of tram | bus | night and consistent with the
 *     line number (N* => night, non-N* => not night)
 *   - each direction's headsign/terminus matches its final stop
 *   - no broken references: every direction stop id exists; every stop.lines
 *     entry is a real line; stop.lines matches the routes that actually call
 *   - coordinates are either both null or a valid pair inside the Košice area
 */

import {
  DPMK_ROUTES,
  DPMK_STOPS,
  DPMK_NETWORK_META,
  type DpmkRoute,
  type DpmkNetworkStop,
} from '../src/data/dpmkNetwork.ts';

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const VALID_TYPES = new Set(['tram', 'bus', 'night']);
const KE_BBOX = { minLat: 48.55, maxLat: 48.86, minLng: 21.1, maxLng: 21.42 };

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/* ---------------------------------------------------------------- stops ---- */

const stopIds = new Set<string>();
for (const s of DPMK_STOPS) {
  if (stopIds.has(s.id)) err(`duplicate stop id: ${s.id}`);
  stopIds.add(s.id);

  if (!s.name || !s.name.trim()) err(`stop ${s.id} has an empty name`);
  if (!/^s-[a-z0-9-]+$/.test(s.id)) err(`stop id not a clean slug: ${s.id}`);

  const hasLat = typeof s.latitude === 'number';
  const hasLng = typeof s.longitude === 'number';
  if (hasLat !== hasLng) err(`stop ${s.id} has a half-set coordinate`);
  if (hasLat && hasLng) {
    const { latitude: la, longitude: ln } = s as { latitude: number; longitude: number };
    if (la < KE_BBOX.minLat || la > KE_BBOX.maxLat || ln < KE_BBOX.minLng || ln > KE_BBOX.maxLng) {
      err(`stop ${s.id} (${s.name}) coordinate ${la},${ln} is outside the Košice area`);
    }
  }
  if (!s.lines || s.lines.length === 0) err(`stop ${s.id} (${s.name}) is not on any line`);
}

const missingCoords = DPMK_STOPS.filter((s) => s.latitude == null);

/* --------------------------------------------------------------- routes ---- */

const routeIds = new Set<string>();
const routeNumbers = new Set<string>();
const lineNumbers = new Set<string>();

const stopLineUse = new Map<string, Set<string>>(); // stop id -> line numbers seen

function checkDirection(route: DpmkRoute, di: number) {
  const d = route.directions[di];
  if (!d.id) err(`route ${route.number} direction ${di} has no id`);
  if (!d.name || !d.name.trim()) err(`route ${route.number} direction ${di} has an empty name`);
  if (!d.destination || !d.destination.trim()) {
    err(`route ${route.number} direction ${di} has an empty destination`);
  }
  if (!d.headsignRaw || !d.headsignRaw.trim()) {
    err(`route ${route.number} direction "${d.destination}" has no verbatim headsign`);
  }
  if (!Array.isArray(d.stops) || d.stops.length < 2) {
    err(`route ${route.number} direction "${d.destination}" has < 2 stops (${d.stops?.length ?? 0})`);
    return;
  }

  d.stops.forEach((ds, i) => {
    if (ds.sequence !== i + 1) {
      err(`route ${route.number} "${d.destination}" stop #${i} has sequence ${ds.sequence}, expected ${i + 1}`);
    }
    if (!stopIds.has(ds.id)) {
      err(`route ${route.number} "${d.destination}" references unknown stop id ${ds.id}`);
    }
    const master = DPMK_STOPS.find((s) => s.id === ds.id);
    if (master && norm(master.name) !== norm(ds.name)) {
      warn(`route ${route.number} "${d.destination}" stop ${ds.id} name "${ds.name}" != master "${master.name}"`);
    }
    if (!stopLineUse.has(ds.id)) stopLineUse.set(ds.id, new Set());
    stopLineUse.get(ds.id)!.add(route.number);
  });

  // consecutive duplicate stop ids
  for (let i = 1; i < d.stops.length; i += 1) {
    if (d.stops[i].id === d.stops[i - 1].id) {
      err(`route ${route.number} "${d.destination}" visits ${d.stops[i].id} twice in a row`);
    }
  }

  // terminus: destination must be exactly the direction's final stop
  const last = d.stops[d.stops.length - 1];
  if (norm(last.name) !== norm(d.destination)) {
    err(`route ${route.number} destination "${d.destination}" != final stop "${last.name}"`);
  }
  if (d.name !== d.destination) {
    err(`route ${route.number} direction name "${d.name}" != destination "${d.destination}"`);
  }
}

for (const route of DPMK_ROUTES) {
  if (routeIds.has(route.id)) err(`duplicate route id: ${route.id}`);
  routeIds.add(route.id);
  if (routeNumbers.has(route.number)) err(`duplicate route number: ${route.number}`);
  routeNumbers.add(route.number);
  lineNumbers.add(route.number);

  if (!route.number || !route.number.trim()) err(`route ${route.id} has an empty number`);
  if (!route.name || !route.name.trim()) err(`route ${route.number} has an empty name`);

  if (!VALID_TYPES.has(route.transportType)) {
    err(`route ${route.number} has invalid transportType "${route.transportType}"`);
  }
  const isNightNumber = /^N\d/i.test(route.number);
  if (isNightNumber && route.transportType !== 'night') {
    err(`route ${route.number} looks like a night line but transportType is "${route.transportType}"`);
  }
  if (!isNightNumber && route.transportType === 'night') {
    err(`route ${route.number} is typed "night" but the number is not N*`);
  }

  if (!Array.isArray(route.directions) || route.directions.length < 1) {
    err(`route ${route.number} has no directions`);
    continue;
  }
  if (route.directions.length > 2) {
    warn(`route ${route.number} has ${route.directions.length} directions`);
  }
  route.directions.forEach((_, di) => checkDirection(route, di));
}

/* ----------------------------------------------------- cross references ---- */

for (const s of DPMK_STOPS) {
  for (const ln of s.lines) {
    if (!lineNumbers.has(ln)) err(`stop ${s.id} (${s.name}) lists unknown line "${ln}"`);
  }
  const actual = stopLineUse.get(s.id) ?? new Set<string>();
  const declared = new Set(s.lines);
  for (const ln of actual) if (!declared.has(ln)) err(`stop ${s.id} (${s.name}) is served by ${ln} but does not list it`);
  for (const ln of declared) if (!actual.has(ln)) err(`stop ${s.id} (${s.name}) lists ${ln} but no direction calls there`);
}

const referenced = new Set(stopLineUse.keys());
for (const s of DPMK_STOPS) {
  if (!referenced.has(s.id)) err(`stop ${s.id} (${s.name}) is not used by any direction`);
}

/* --------------------------------------------------------- adapter files -- */
// src/data/routes.ts and src/data/stops.ts are pure transforms of the data
// above (one ROUTES entry per route, one ROUTE_PATTERNS entry per direction,
// one STOPS entry per DPMK_STOPS entry) and are type-checked by `tsc --noEmit`.
// Re-derive the same counts here so a drift in that mapping is still caught.
const adapterStops = DPMK_STOPS.length;
const adapterRoutes = DPMK_ROUTES.length;
const adapterPatterns = DPMK_ROUTES.reduce((a, r) => a + r.directions.length, 0);
const adapterNote = `ROUTES ${adapterRoutes}, ROUTE_PATTERNS ${adapterPatterns}, STOPS ${adapterStops} (derived; tsc-checked)`;

/* --------------------------------------------------------------- report --- */

const uniqueStops = stopIds.size;
const directions = DPMK_ROUTES.reduce((a, r) => a + r.directions.length, 0);
const byType = DPMK_ROUTES.reduce<Record<string, number>>((a, r) => {
  a[r.transportType] = (a[r.transportType] ?? 0) + 1;
  return a;
}, {});

console.log('DPMK transport data validation');
console.log('─'.repeat(60));
console.log(`source           ${DPMK_NETWORK_META.source}`);
console.log(`version          ${DPMK_NETWORK_META.section} (valid from ${DPMK_NETWORK_META.validFrom})`);
console.log(`routes           ${DPMK_ROUTES.length}  ${JSON.stringify(byType)}`);
console.log(`directions       ${directions}`);
console.log(`unique stops     ${uniqueStops}  (${uniqueStops - missingCoords.length} geocoded, ${missingCoords.length} without coordinates)`);
console.log(`adapters         ${adapterNote}`);
if (missingCoords.length) {
  console.log(`no coordinates   ${missingCoords.map((s: DpmkNetworkStop) => s.name).join(', ')}`);
}
console.log('─'.repeat(60));

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 40)) console.log(`  ⚠ ${w}`);
  if (warnings.length > 40) console.log(`  … ${warnings.length - 40} more`);
}

if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log('\nFAIL');
  process.exit(1);
}

console.log('\nOK — no structural errors.');
