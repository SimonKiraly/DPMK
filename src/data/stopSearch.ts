// Relative import (not the `@/` alias) so `scripts/validateStopSearch.ts` can
// load this module directly with `tsx` — `dpmkNetwork` has no imports of its own.
import { DPMK_STOPS, type DpmkNetworkStop } from './dpmkNetwork';

/**
 * Diacritics-insensitive, token-aware stop search over the 258-stop DPMK
 * network (`data/dpmkNetwork.ts`).
 *
 * The canonical stop names are NEVER modified — this module only builds a
 * normalized in-memory index from each stop's `name` plus the `aliases` DPMK
 * already ships for it, and ranks matches. Callers display `stop.name` verbatim.
 *
 * No dependency: normalization is Unicode NFD + combining-mark strip; typo
 * tolerance is a tiny bounded Levenshtein used only as a last resort.
 */

/** `"Družba"` → `"druzba"`, `"Nám. Osloboditeľov"` → `"nam osloboditelov"`. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(normalized: string): string[] {
  return normalized ? normalized.split(' ') : [];
}

/* ------------------------------------------------------------------- index -- */

interface IndexEntry {
  stop: DpmkNetworkStop;
  rawName: string;
  normName: string;
  aliasNorms: string[];
  /** every distinct token across the canonical name and all aliases */
  tokens: string[];
}

const INDEX: IndexEntry[] = DPMK_STOPS.map((stop) => {
  const normName = normalizeText(stop.name);
  const aliasNorms = (stop.aliases ?? []).map(normalizeText).filter(Boolean);
  const tokens = Array.from(
    new Set([...tokenize(normName), ...aliasNorms.flatMap(tokenize)]),
  );
  return { stop, rawName: stop.name, normName, aliasNorms, tokens };
});

const BY_ID = new Map(DPMK_STOPS.map((s) => [s.id, s]));

/** The raw network stop for an id, or `undefined`. */
export function networkStopById(id: string): DpmkNetworkStop | undefined {
  return BY_ID.get(id);
}

/* ----------------------------------------------------------- fuzzy (bounded) */

/** Levenshtein distance, bailing out as soon as it exceeds `max`. */
function editDistanceWithin(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Conservative: only near-identical tokens count as a fuzzy hit. */
function fuzzyTokenMatch(queryToken: string, stopToken: string): boolean {
  if (queryToken.length < 4 || stopToken.length < 4) return false;
  const max = queryToken.length >= 8 ? 2 : 1;
  const d = editDistanceWithin(queryToken, stopToken, max);
  return d <= max && d / Math.max(queryToken.length, stopToken.length) <= 0.34;
}

/* ----------------------------------------------------------------- scoring -- */

const SCORE = {
  exactRawName: 1000,
  exactNormName: 900,
  exactAlias: 800,
  prefixName: 700,
  allTokens: 520,
  partial: 300,
  fuzzy: 150,
} as const;

/** Below this a match is treated as noise (keeps invalid queries empty). */
const MIN_SCORE = 140;

function scoreEntry(e: IndexEntry, rawQuery: string, nq: string, qTokens: string[]): number {
  // Tiers 1–4 — whole-query signals.
  if (rawQuery === e.rawName) return SCORE.exactRawName;
  if (nq === e.normName) return SCORE.exactNormName;
  if (e.aliasNorms.includes(nq)) return SCORE.exactAlias;
  if (nq.length >= 2 && e.normName.startsWith(nq)) {
    return SCORE.prefixName + Math.max(0, 40 - e.normName.length);
  }

  // Tiers 5–7 — per query token.
  let matched = 0;
  let fuzzyOnly = 0;
  let partialOnly = 0;
  for (const qt of qTokens) {
    const prefixHit = e.tokens.some(
      (t) => (qt.length >= 2 && t.startsWith(qt)) || (t.length >= 4 && qt.startsWith(t)),
    );
    if (prefixHit) {
      matched += 1;
      continue;
    }
    const substrHit =
      qt.length >= 3 &&
      (e.normName.includes(qt) || e.aliasNorms.some((a) => a.includes(qt)));
    if (substrHit) {
      matched += 1;
      partialOnly += 1;
      continue;
    }
    if (e.tokens.some((t) => fuzzyTokenMatch(qt, t))) {
      matched += 1;
      fuzzyOnly += 1;
    }
  }

  if (matched === 0) return 0;
  const coverage = matched / qTokens.length;
  // Multi-word queries must land most of their tokens, else it is noise.
  if (qTokens.length >= 2 && coverage < 0.5) return 0;
  // A single fuzzy-only token is not enough to carry a multi-word query.
  if (qTokens.length >= 2 && matched === fuzzyOnly) return 0;

  let base: number;
  if (coverage === 1 && fuzzyOnly === 0 && partialOnly === 0) base = SCORE.allTokens;
  else if (matched === fuzzyOnly) base = SCORE.fuzzy;
  else base = SCORE.partial;

  const shorterBonus = Math.max(0, 24 - e.normName.length);
  return Math.round(base * coverage) + shorterBonus - fuzzyOnly * 20 - partialOnly * 10;
}

/** Ranked stop matches for a free-text query. Empty / unmatched query → `[]`. */
export function searchStops(query: string, limit = 8): DpmkNetworkStop[] {
  const rawQuery = query.trim();
  const nq = normalizeText(rawQuery);
  if (!nq) return [];
  const qTokens = tokenize(nq);

  const scored: { stop: DpmkNetworkStop; score: number }[] = [];
  for (const e of INDEX) {
    const score = scoreEntry(e, rawQuery, nq, qTokens);
    if (score >= MIN_SCORE) scored.push({ stop: e.stop, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.stop.name.length - b.stop.name.length ||
      a.stop.name.localeCompare(b.stop.name, 'sk'),
  );
  return scored.slice(0, limit).map((s) => s.stop);
}
