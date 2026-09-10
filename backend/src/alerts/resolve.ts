/**
 * Resolve line numbers and stop phrases from a DPMK notice against the existing
 * 71-route / 258-stop network. Best-effort: anything that does not resolve
 * confidently is reported so the caller can set `needsReview` — nothing is
 * invented.
 */
import { ROUTE_BY_SHORT_NAME } from '../network/adapters.js';
import { resolveStopPhrase } from '../network/stopSearch.js';
import type { AlertStopRef } from '../types.js';

export interface RouteResolution {
  resolved: string[]; // canonical short names, deduped
  unresolved: string[]; // tokens that matched no route
}

/**
 * The dataset (1.7.2026 route sheet) names the express lines `X` / `XR`; DPMK's
 * operational notices and Ubian use `x1` / `x9` / `xR2`. Fold those onto the
 * canonical name. Still just a name bridge — the route already exists.
 */
function canonicalRouteToken(token: string): string {
  const t = token.trim();
  if (/^x\d+$/i.test(t)) return 'X';
  if (/^xr\d*$/i.test(t)) return 'XR';
  // "N1".."N7", "R1".."R8", "RA1".. — keep as written (upper-cased letter part).
  return t.replace(/^([a-z]+)/i, (m) => m.toUpperCase());
}

export function resolveRoutes(tokens: string[]): RouteResolution {
  const resolved = new Set<string>();
  const unresolved: string[] = [];

  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;
    const direct = ROUTE_BY_SHORT_NAME[token];
    if (direct) {
      resolved.add(direct.shortName);
      continue;
    }
    const canon = canonicalRouteToken(token);
    if (ROUTE_BY_SHORT_NAME[canon]) {
      resolved.add(canon);
      continue;
    }
    unresolved.push(token);
  }

  return { resolved: [...resolved], unresolved };
}

export interface StopResolution {
  stops: AlertStopRef[];
  /** Phrases that produced no confident stop match. */
  unresolved: string[];
}

/** A stop phrase, optionally already split from its `… smer X` direction. */
export type StopPhrase = string | { place: string; direction?: string | null };

/**
 * Resolve a list of stop phrases (from `MIESTO:` lines / prose) to stop refs.
 * A `{ place, direction }` input carries its direction onto the resolved ref;
 * the first direction seen for a given stop wins (deduped by id).
 */
export function resolveStops(phrases: StopPhrase[]): StopResolution {
  const seen = new Set<string>();
  const stops: AlertStopRef[] = [];
  const unresolved: string[] = [];

  for (const raw of phrases) {
    const place = (typeof raw === 'string' ? raw : raw.place).trim();
    const direction = typeof raw === 'string' ? null : raw.direction ?? null;
    if (!place) continue;
    const hit = resolveStopPhrase(place);
    if (!hit) {
      unresolved.push(place);
      continue;
    }
    if (seen.has(hit.stop.id)) continue;
    seen.add(hit.stop.id);
    stops.push({
      id: hit.stop.id,
      name: hit.stop.name,
      confidence: hit.confidence,
      direction: direction || null,
    });
  }

  return { stops, unresolved };
}
