/**
 * Checks the DPMK service-alert client layer that Phase 1 added:
 *
 *   - the pure store selectors (src/store/useAlertsStore.ts) that decide which
 *     alerts appear on the Výluky screen, the Home banner, a StopDetail strip
 *     and a VehicleDetail strip;
 *   - the presentation helpers (src/utils/alerts.ts) that map a ServiceAlert to
 *     Slovak labels, a design-system tone and a "when" line.
 *
 * The app has no component test runner — this mirrors the other
 * scripts/validate*.ts checks (plain assertions, non-zero exit on failure).
 *
 * Run:  npx tsx scripts/validateAlerts.ts
 */

import {
  byRelevance,
  selectActiveAlerts,
  selectActiveRouteAlerts,
  selectActiveStopAlerts,
  selectAlertById,
  selectPlannedAlerts,
  selectTopAlert,
  selectVisibleAlerts,
} from '../src/store/useAlertsStore.ts';
import type { AlertSeverity, AlertStatus, AlertType, ServiceAlert } from '../src/types/index.ts';
import { formatClock } from '../src/utils/format.ts';
import {
  ALERT_STATUS_LABEL,
  ALERT_TYPE_LABEL,
  alertStopsText,
  alertVisual,
  alertWhenText,
  SEVERITY_LABEL,
  stopRefIsNavigable,
} from '../src/utils/alerts.ts';

const errors: string[] = [];
const rows: string[] = [];
const ok = (cond: boolean, label: string) => {
  rows.push(`${cond ? '✓' : '✗'}  ${label}`);
  if (!cond) errors.push(label);
};

function mk(over: Partial<ServiceAlert> & { id: string }): ServiceAlert {
  return {
    source: 'dpmk-rss',
    sourceUrl: `https://www.dpmk.sk/aktuality/2026/${over.id}`,
    publishedAt: '2026-09-08T08:00:00.000Z',
    updatedAt: '2026-09-08T08:00:00.000Z',
    firstSeenAt: '2026-09-08T08:00:00.000Z',
    lastSeenInFeedAt: '2026-09-08T08:00:00.000Z',
    title: `Alert ${over.id}`,
    type: 'connection_cancelled',
    severity: 'minor',
    status: 'active',
    validFrom: null,
    validTo: null,
    affectedRoutes: [],
    affectedStops: [],
    description: '',
    reason: null,
    cancelledDepartures: [],
    rawText: '',
    needsReview: false,
    ...over,
  };
}

/* ------------------------------------------------------------- fixtures ---- */

const active1 = mk({
  id: 'a1',
  status: 'active',
  severity: 'minor',
  type: 'connection_cancelled',
  affectedRoutes: ['15'],
  affectedStops: [{ id: 's-oc-cassovia', name: 'OC Cassovia', confidence: 'exact', direction: 'Exnárova' }],
  publishedAt: '2026-09-08T09:00:00.000Z',
  validTo: '2026-09-08T10:20:00.000Z',
});
const activeSevere = mk({
  id: 'a2',
  status: 'active',
  severity: 'severe',
  type: 'planned',
  affectedRoutes: ['6', '12', '15'],
  affectedStops: [{ id: 's-polska', name: 'Poľská', confidence: 'exact' }],
  validFrom: '2026-09-01T22:00:00.000Z',
  publishedAt: '2026-09-06T09:00:00.000Z',
});
const upcoming1 = mk({
  id: 'u1',
  status: 'upcoming',
  severity: 'major',
  type: 'planned',
  affectedRoutes: ['54'],
  affectedStops: [{ id: 's-verejny-cintorin', name: 'Verejný cintorín', confidence: 'exact' }],
  validFrom: '2026-09-30T22:00:00.000Z',
  validTo: '2026-10-15T21:59:00.000Z',
});
const ended1 = mk({ id: 'e1', status: 'ended', severity: 'major', affectedRoutes: ['15'] });

const all = [active1, activeSevere, upcoming1, ended1];

/* ------------------------------------------------------- 1. status filters */

ok(
  selectActiveAlerts(all).map((a) => a.id).join(',') === 'a2,a1',
  'selectActiveAlerts returns only active, severe first (a2 before a1)',
);
ok(
  selectPlannedAlerts(all).map((a) => a.id).join(',') === 'u1',
  'selectPlannedAlerts returns only upcoming',
);
ok(
  selectVisibleAlerts(all).every((a) => a.status !== 'ended') && selectVisibleAlerts(all).length === 3,
  'selectVisibleAlerts drops ended, keeps the other 3',
);
ok(selectAlertById(all, 'u1')?.id === 'u1', 'selectAlertById finds a known id');
ok(selectAlertById(all, 'nope') === undefined, 'selectAlertById returns undefined for an unknown id');
ok(selectAlertById(all, undefined) === undefined, 'selectAlertById tolerates an undefined id');

/* ------------------------------------------------------- 2. top alert */

ok(selectTopAlert(all)?.id === 'a2', 'selectTopAlert picks the most severe active alert');
ok(selectTopAlert([ended1]) === undefined, 'selectTopAlert is undefined when nothing is active');

/* ------------------------------------------------------- 3. stop matching */

ok(
  selectActiveStopAlerts(all, 's-oc-cassovia').map((a) => a.id).join(',') === 'a1',
  'selectActiveStopAlerts matches the affected stop id',
);
ok(
  selectActiveStopAlerts(all, 's-verejny-cintorin').length === 0,
  'selectActiveStopAlerts ignores an upcoming alert on that stop',
);
ok(selectActiveStopAlerts(all, undefined).length === 0, 'selectActiveStopAlerts tolerates undefined');
ok(
  selectActiveStopAlerts([mk({ id: 'x', status: 'active', affectedStops: [] })], 's-x').length === 0,
  'selectActiveStopAlerts returns nothing when the alert names no stops',
);

/* ------------------------------------------------------- 4. route matching */

ok(
  selectActiveRouteAlerts(all, '15').map((a) => a.id).join(',') === 'a2,a1',
  'selectActiveRouteAlerts matches by canonical short name, ended excluded, severe first',
);
ok(
  selectActiveRouteAlerts(all, '6').map((a) => a.id).join(',') === 'a2',
  'selectActiveRouteAlerts matches a multi-route planned alert',
);
ok(selectActiveRouteAlerts(all, '99').length === 0, 'selectActiveRouteAlerts: unknown route → none');

/* ------------------------------------------------------- 5. ordering */

ok(byRelevance(activeSevere, active1) < 0, 'byRelevance: severe sorts ahead of minor');
ok(
  byRelevance(
    mk({ id: 'n', severity: 'minor', publishedAt: '2026-09-08T10:00:00.000Z' }),
    mk({ id: 'o', severity: 'minor', publishedAt: '2026-09-08T09:00:00.000Z' }),
  ) < 0,
  'byRelevance: equal severity → newer first',
);

/* ------------------------------------------------- 6. presentation: tone */

const tones = (['severe', 'major', 'minor', 'info'] as AlertSeverity[]).map(
  (severity) => alertVisual({ severity, type: 'planned' }).tone,
);
ok(tones[0] === 'error', 'alertVisual: severe → error tone');
ok(tones[3] === 'info', 'alertVisual: info → info tone');
ok(new Set(tones).size >= 3, 'alertVisual: at least three visually distinct tones across severities');
ok(
  alertVisual({ severity: 'minor', type: 'connection_cancelled' }).icon === 'close-circle',
  'alertVisual: connection_cancelled → close-circle icon',
);
ok(
  alertVisual({ severity: 'major', type: 'planned' }).icon === 'construct',
  'alertVisual: planned → construct icon',
);

/* ------------------------------------------- 7. presentation: "when" line */

{
  const w = alertWhenText(upcoming1);
  ok(!!w && / – /.test(w) && w.includes('2026'), `alertWhenText: planned range as dates ("${w}")`);
}
{
  const w = alertWhenText(mk({ id: 'p', type: 'planned', validFrom: '2026-09-30T22:00:00.000Z' }));
  ok(!!w && w.startsWith('Od ') && w.includes('2026'), `alertWhenText: planned start-only ("${w}")`);
}
ok(
  alertWhenText(active1) === `Predpokladané obnovenie o ${formatClock(active1.validTo!)}`,
  'alertWhenText: operational restoration estimate as a local time',
);
ok(
  alertWhenText(mk({ id: 'q', type: 'connection_cancelled', validTo: null })) === null,
  'alertWhenText: nothing stated → null (never invented)',
);

/* --------------------------------------- 8. presentation: stops + labels */

ok(alertStopsText(active1) === 'Zastávka OC Cassovia', 'alertStopsText: single stop');
ok(
  alertStopsText(mk({ id: 'm', affectedStops: [
    { id: 's-a', name: 'A', confidence: 'exact' },
    { id: 's-b', name: 'B', confidence: 'fuzzy' },
  ] })) === 'Zastávky A, B',
  'alertStopsText: two stops',
);
ok(alertStopsText(mk({ id: 'z', affectedStops: [] })) === null, 'alertStopsText: no stops → null');

ok(
  stopRefIsNavigable({ id: 's-x', name: 'X', confidence: 'exact' }) === true,
  'stopRefIsNavigable: resolved stop with an id → true',
);
ok(
  stopRefIsNavigable({ id: '', name: 'X', confidence: 'exact' }) === false,
  'stopRefIsNavigable: empty id → false (no fabricated navigation)',
);

const typeLabels = (['connection_cancelled', 'delays', 'planned', 'other'] as AlertType[]).map(
  (t) => ALERT_TYPE_LABEL[t],
);
ok(typeLabels.every((l) => l.length > 0) && new Set(typeLabels).size === 4, 'ALERT_TYPE_LABEL: all four types have a distinct Slovak label');
const statusLabels = (['active', 'upcoming', 'ended'] as AlertStatus[]).map((s) => ALERT_STATUS_LABEL[s]);
ok(statusLabels.every((l) => l.length > 0), 'ALERT_STATUS_LABEL: every status labelled');
ok((['info', 'minor', 'major', 'severe'] as AlertSeverity[]).every((s) => SEVERITY_LABEL[s].length > 0), 'SEVERITY_LABEL: every severity labelled');

/* ------------------------------------------------------------------ report */

console.log('DPMK service-alert client validation');
console.log('─'.repeat(72));
for (const r of rows) console.log(r);
console.log('─'.repeat(72));

if (errors.length) {
  console.log(`\n${errors.length} failure(s):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log('\nFAIL');
  process.exit(1);
}
console.log(`\nOK — ${rows.length} alert-client assertions passed.`);
