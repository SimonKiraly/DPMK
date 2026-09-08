/**
 * `RawRssItem` → `ServiceAlert` (or `null` to drop feed noise).
 *
 * Every step is wrapped so a single malformed item can never throw out of the
 * poll. Missing information is `null` / `[]` — the RSS is the only source and it
 * is never second-guessed.
 */
import { config } from '../config.js';
import { combineDateAndClock } from '../lib/time.js';
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
  parseShapeA,
  splitPlaceDirection,
} from './parse.js';
import { resolveRoutes, resolveStops } from './resolve.js';
import type { RawRssItem } from './rss.js';

/** Line tokens explicitly attributed to a route in planned prose ("linky 12 a 54"). */
function plannedLineTokens(text: string): string[] {
  const out: string[] = [];
  const re = /\blink[ay]?\s+((?:[A-Za-z]{0,3}\d{1,3}[A-Za-zČč]?(?:\s*(?:,|a|\/)\s*)?)+)/gi;
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

function deriveSeverity(type: AlertType, text: string): AlertSeverity {
  if (type === 'connection_cancelled' || type === 'delays') return 'minor';
  if (type === 'planned') return /\bobnov/i.test(text) ? 'info' : 'major';
  return 'info';
}

export interface StatusInput {
  type: AlertType;
  validFrom: string | null;
  validTo: string | null;
  lastSeenInFeedAt: string;
  inLatestFeed: boolean;
}

/** active / upcoming / ended — only from information we actually have. */
export function computeStatus(a: StatusInput, now = Date.now()): AlertStatus {
  const vf = a.validFrom ? Date.parse(a.validFrom) : NaN;
  const vt = a.validTo ? Date.parse(a.validTo) : NaN;

  if (Number.isFinite(vt) && now > vt) return 'ended';
  if (Number.isFinite(vf) && now < vf) return 'upcoming';

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
            time: p.time ? combineDateAndClock(new Date(publishedAt), p.time) ?? p.time : null,
          };
        });

      // affected stops = every confidently-resolved stop across the departures
      const stopRes = resolveStops(parsed.places.map((p) => p.place).filter(Boolean));

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
      base.severity = deriveSeverity(cls.type, item.bodyText);
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
      // planned / other — classify + clean prose only (Phase 0)
      const routeRes = resolveRoutes(plannedLineTokens(item.bodyText));
      const stopRes = resolveStops(plannedStopPhrases(item.bodyText).map(splitPlaceDirectionPlace));

      base.affectedRoutes = routeRes.resolved;
      base.affectedStops = stopRes.stops;
      base.severity = deriveSeverity(cls.type, item.bodyText);
      base.description = cleanPlannedDescription(item.bodyText) || item.title;
      base.needsReview = true; // prose parsing is out of Phase 0 scope
    }

    base.status = computeStatus(
      {
        type: base.type,
        validFrom: base.validFrom,
        validTo: base.validTo,
        lastSeenInFeedAt: base.lastSeenInFeedAt,
        inLatestFeed: true,
      },
      Date.parse(nowIso),
    );

    return base;
  } catch {
    return null;
  }
}

function splitPlaceDirectionPlace(phrase: string): string {
  return splitPlaceDirection(phrase).place;
}
