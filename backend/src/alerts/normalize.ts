/**
 * `RawRssItem` → `ServiceAlert` (or `null` to drop feed noise).
 *
 * Every step is wrapped so a single malformed item can never throw out of the
 * poll. Missing information is `null` / `[]` — the RSS is the only source and it
 * is never second-guessed.
 */
import { config } from '../config.js';
import { combineDateAndClock, kosiceClockOnDateOf } from '../lib/time.js';
import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  CancelledDeparture,
  ServiceAlert,
} from '../types.js';
import { classify } from './classify.js';
import {
  cleanPlannedDescription,
  extractFields,
  extractPlannedReason,
  parsePlannedDates,
  parseShapeA,
  parseUpdateTimestamp,
  splitPlaceDirection,
} from './parse.js';
import { resolveRoutes, resolveStops } from './resolve.js';
import type { RawRssItem } from './rss.js';

/** Line tokens explicitly attributed to a route in planned prose ("linky 12 a 54", "linku 6"). */
function plannedLineTokens(text: string): string[] {
  const out: string[] = [];
  const re =
    /\b(?:link(?:[ayeu]|ou|ám|ami|ách)?|liniek)\s+((?:[A-Za-z]{0,3}\d{1,3}[A-Za-zČč]?(?:\s*(?:,|a|\/)\s*)?)+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index === re.lastIndex) re.lastIndex += 1;
    for (const tok of m[1]!.split(/[,/]+|\s+a\s+|\s+/i)) {
      const clean = tok.trim().replace(/[.,]$/, '');
      if (clean && /^[A-Za-z]{0,3}\d{1,3}[A-Za-zČč]?$/.test(clean)) out.push(clean);
    }
  }
  return Array.from(new Set(out));
}

/** Stop phrases explicitly named in planned prose ("zastávok Verejný cintorín a Poľská"). */
function plannedStopPhrases(text: string): string[] {
  const out: string[] = [];
  const re =
    /\bzast[áa]v(?:k[aáuy]|ok|ky|ke)\s+([A-ZÁ-Ž][\p{L} .]+?)(?=\s+(?:smer|pre|je|sa|z\b|do\b|na\b)|[.,;:]|$)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index === re.lastIndex) re.lastIndex += 1;
    for (const part of m[1]!.split(/\s+a\s+|,/)) {
      const p = part.trim().replace(/[.,;:]+$/, '');
      if (p.length >= 3) out.push(p);
    }
  }
  return Array.from(new Set(out));
}

/**
 * Broad-disruption phrases that justify `severe` for a planned notice — a
 * whole-line closure, a road/junction shutdown, a tram-for-bus swap. Deliberately
 * narrow: a bare "výluka" is a routine planned change and must NOT reach here.
 */
const BROAD_DISRUPTION_RE =
  /(úpln[áa] výluk|výluk[ay] cel[ej][a-z]*|nepremáva|nebud[eú] premávať|nebud[uú] premávať|mimo prevádzk|uzavret[iý][ea]? (?:úsek|ulic|most|križovatk|námest)|uzávierk[ay] (?:úsek|ulic|most|križovatk|námest)|náhradn[áa] (?:autobusov[áa] )?doprav[ay] za (?:električk|tramvaj)|preprava.*náhradn[ýa]mi autobus)/i;

/**
 * Map a classified alert to a severity. `routeCount` is the number of routes the
 * notice was resolved against — the only quantitative "how broad" signal we have.
 *
 * - operational (`connection_cancelled` / `delays`): `minor`, or `major` once it
 *   clearly spans many routes;
 * - planned: `info` for a restoration ("obnovenie premávky"), `severe` for an
 *   explicit broad/full-line disruption or a 3-plus-route change, else `major`.
 */
export function deriveSeverity(type: AlertType, text: string, routeCount: number): AlertSeverity {
  if (type === 'connection_cancelled' || type === 'delays') {
    return routeCount >= 4 ? 'major' : 'minor';
  }
  if (type === 'planned') {
    if (/\bobnov/i.test(text)) return 'info';
    if (routeCount >= 3 || BROAD_DISRUPTION_RE.test(text)) return 'severe';
    return 'major';
  }
  return 'info';
}

export interface StatusInput {
  type: AlertType;
  validFrom: string | null;
  validTo: string | null;
  lastSeenInFeedAt: string;
  inLatestFeed: boolean;
  /**
   * ISO times of the notice's cancelled departures (Shape A). When every entry
   * is a real time, they drive expiry directly; a `null` in the list means at
   * least one departure had no stated time, so the feed-presence grace is used
   * instead. Omit for non-operational notices.
   */
  cancelledDepartureTimes?: (string | null)[];
}

/** active / upcoming / ended — only from information we actually have. */
export function computeStatus(a: StatusInput, now = Date.now()): AlertStatus {
  const vf = a.validFrom ? Date.parse(a.validFrom) : NaN;
  const vt = a.validTo ? Date.parse(a.validTo) : NaN;

  if (Number.isFinite(vt) && now > vt) return 'ended';
  if (Number.isFinite(vf) && now < vf) return 'upcoming';

  // An explicit `validTo` (a PREDPOKLAD resolution estimate) is DPMK's own word
  // on when service resumes — while it has not passed, the disruption is still
  // on, even if every cancelled departure is already behind us.
  if (Number.isFinite(vt)) return 'active';

  // A cancelled-departure notice with an explicit time for *every* departure:
  // ended once the latest of those times is well past; still active (regardless
  // of feed presence) while any of them is upcoming.
  const dts = a.cancelledDepartureTimes;
  if (a.type === 'connection_cancelled' && dts && dts.length > 0 && dts.every((t) => t != null)) {
    const ms = dts.map((t) => Date.parse(t!)).filter(Number.isFinite);
    if (ms.length === dts.length) {
      const latest = Math.max(...ms);
      return now > latest + config.alerts.departureGraceMs ? 'ended' : 'active';
    }
  }

  if (!a.inLatestFeed) {
    const goneMs = now - Date.parse(a.lastSeenInFeedAt);
    if (
      (a.type === 'connection_cancelled' || a.type === 'delays') &&
      goneMs > config.alerts.operationalGraceMs
    ) {
      return 'ended';
    }
    if ((a.type === 'planned' || a.type === 'other') && goneMs > config.alerts.plannedRetentionMs) {
      return 'ended';
    }
  }
  return 'active';
}

interface PlaceForText {
  place: string;
  direction: string | null;
  time: string | null; // "HH:MM" (local, for display)
}

function rebuildShapeADescription(
  type: AlertType,
  routeShortNames: string[],
  places: PlaceForText[],
  reason: string | null,
  expectedText: string | null,
): string {
  if (type === 'delays') {
    return reason ? `Meškania spojov. ${capitalize(reason)}.` : 'Upozornenie na meškanie spojov.';
  }
  const parts: string[] = [];
  const line = routeShortNames.length ? `Linka ${routeShortNames.join(', ')}` : 'Spoj';
  for (const p of places) {
    const at = p.time ? ` o ${p.time}` : '';
    const from = p.place ? ` zo zastávky ${p.place}` : '';
    const dir = p.direction ? ` (smer ${p.direction})` : '';
    parts.push(`${line}: výpadok spoja${at}${from}${dir}.`);
  }
  if (parts.length === 0) parts.push('Výpadok spoja.');
  if (reason) parts.push(`Dôvod: ${reason}.`);
  if (expectedText) parts.push(`Predpoklad obnovenia: ${expectedText}.`);
  return parts.join(' ');
}

function capitalize(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/**
 * Build a `ServiceAlert` from a feed item. `prev` (the previously stored alert
 * with this id, if any) preserves `firstSeenAt`. Returns `null` for feed noise
 * or an item too broken to represent.
 */
export function toServiceAlert(
  item: RawRssItem,
  prev: ServiceAlert | undefined,
  nowIso: string,
): ServiceAlert | null {
  try {
    const cls = classify(item.title, item.bodyText);
    if (cls.drop) return null;

    const publishedAt = item.publishedAt ?? prev?.publishedAt ?? nowIso;
    const base: ServiceAlert = {
      id: item.guid,
      source: 'dpmk-rss',
      sourceUrl: item.link || prev?.sourceUrl || '',
      publishedAt,
      updatedAt: nowIso,
      firstSeenAt: prev?.firstSeenAt ?? nowIso,
      lastSeenInFeedAt: nowIso,
      title: item.title,
      type: cls.type,
      severity: 'info',
      status: 'active',
      validFrom: null,
      validTo: null,
      affectedRoutes: [],
      affectedStops: [],
      description: '',
      reason: null,
      cancelledDepartures: [],
      rawText: item.bodyText,
      needsReview: cls.uncertain,
    };

    // A reliable "AKTUALIZÁCIA (HH:MM)" revision stamp becomes `updatedAt`;
    // otherwise it stays at "when the backend parsed this" (`nowIso`).
    base.updatedAt = parseUpdateTimestamp(item.bodyText, publishedAt) ?? nowIso;

    if (cls.type === 'connection_cancelled' || cls.type === 'delays') {
      const fields = extractFields(item.bodyText);
      const parsed = parseShapeA(fields);
      const routeRes = resolveRoutes(parsed.lineTokens);

      const departures: CancelledDeparture[] = parsed.places
        .filter((p) => p.place || p.time)
        .map((p) => {
          const stopHit = p.place ? resolveStops([p.place]).stops[0] : undefined;
          return {
            routeShortNames: routeRes.resolved,
            stopName: p.place,
            stopId: stopHit?.id ?? null,
            direction: p.direction,
            // A cancelled departure's ČAS is anchored to the *publication day* —
            // never rolled forward (`kosiceClockOnDateOf`, not
            // `combineDateAndClock`). An afternoon-published notice listing a
            // morning departure must not push that departure to "tomorrow", or
            // the alert never expires.
            time: p.time ? kosiceClockOnDateOf(new Date(publishedAt), p.time) ?? p.time : null,
          };
        });

      // affected stops = every confidently-resolved stop across the departures,
      // each carrying the direction it was named with
      const stopRes = resolveStops(
        parsed.places
          .filter((p) => p.place)
          .map((p) => ({ place: p.place, direction: p.direction })),
      );

      const baseInstant = new Date(publishedAt);
      const validTo =
        parsed.expected?.time != null
          ? combineDateAndClock(baseInstant, parsed.expected.time)
          : null;

      base.affectedRoutes = routeRes.resolved;
      base.affectedStops = stopRes.stops;
      base.reason = parsed.reason;
      base.cancelledDepartures = departures;
      base.validFrom = publishedAt;
      base.validTo = validTo;
      base.severity = deriveSeverity(cls.type, item.bodyText, routeRes.resolved.length);
      base.description =
        cls.type === 'delays' && !parsed.reason
          ? cleanPlannedDescription(item.bodyText) || 'Upozornenie na meškanie spojov.'
          : rebuildShapeADescription(
              cls.type,
              routeRes.resolved,
              parsed.places,
              parsed.reason,
              parsed.expected?.text ?? null,
            );
      base.needsReview =
        cls.uncertain ||
        routeRes.unresolved.length > 0 ||
        (cls.type === 'connection_cancelled' && departures.length === 0);
    } else {
      // planned / other — clean prose, plus deterministic date/route/stop/reason
      // signals lifted from unambiguous phrasing.
      const routeRes = resolveRoutes(plannedLineTokens(item.bodyText));
      const stopRes = resolveStops(
        plannedStopPhrases(item.bodyText).map((phrase) => splitPlaceDirection(phrase)),
      );
      const dates = parsePlannedDates(item.bodyText, publishedAt);

      base.affectedRoutes = routeRes.resolved;
      base.affectedStops = stopRes.stops;
      base.validFrom = dates.validFrom;
      base.validTo = dates.validTo;
      base.reason = cls.type === 'planned' ? extractPlannedReason(item.bodyText) : null;
      base.severity = deriveSeverity(cls.type, item.bodyText, routeRes.resolved.length);
      base.description = cleanPlannedDescription(item.bodyText) || item.title;
      // Only trust the parse enough to clear the review flag when the notice
      // gave us a firm start date AND every line/stop phrase resolved cleanly.
      const fullyResolved =
        cls.type === 'planned' &&
        dates.confident &&
        routeRes.resolved.length > 0 &&
        routeRes.unresolved.length === 0 &&
        stopRes.stops.length > 0 &&
        stopRes.unresolved.length === 0;
      base.needsReview = cls.uncertain || !fullyResolved;
    }

    base.status = computeStatus(
      {
        type: base.type,
        validFrom: base.validFrom,
        validTo: base.validTo,
        lastSeenInFeedAt: base.lastSeenInFeedAt,
        inLatestFeed: true,
        cancelledDepartureTimes: base.cancelledDepartures.map((d) => d.time),
      },
      Date.parse(nowIso),
    );

    return base;
  } catch {
    return null;
  }
}
