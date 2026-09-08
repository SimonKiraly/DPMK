/**
 * Diacritics-insensitive, token-aware stop search over the 258-stop DPMK
 * network — a verbatim port of the mobile app's `src/data/stopSearch.ts`, with
 * two additions the alert pipeline needs:
 *
 *   - `searchStopsWithScore()` — exposes the internal score so a caller can
 *     judge match confidence;
 *   - `resolveStopPhrase()` — turns a stop phrase from a DPMK notice
 *     ("Obchodné centrum Cassovia smer Exnárova") into a confident stop match
 *     or `null`.
 *
 * The canonical DPMK stop names are never modified. This module is read-only.
 */
import { DPMK_STOPS, type DpmkNetworkStop } from './dpmkNetwork.js';

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

interface IndexEntry {
  stop: DpmkNetworkStop;
  rawName: string;
  normName: string;
  aliasNorms: string[];
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

export function networkStopById(id: string): DpmkNetworkStop | undefined {
  return BY_ID.get(id);
}

/* ----------------------------------------------------------- fuzzy (bounded) */

function editDistanceWithin(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
      if (curr[j]! < rowMin) rowMin = curr[j]!;
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

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

const MIN_SCORE = 140;

function scoreEntry(e: IndexEntry, rawQuery: string, nq: string, qTokens: string[]): number {
  if (rawQuery === e.rawName) return SCORE.exactRawName;
  if (nq === e.normName) return SCORE.exactNormName;
  if (e.aliasNorms.includes(nq)) return SCORE.exactAlias;
  if (nq.length >= 2 && e.normName.startsWith(nq)) {
    return SCORE.prefixName + Math.max(0, 40 - e.normName.length);
  }

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
      qt.length >= 3 && (e.normName.includes(qt) || e.aliasNorms.some((a) => a.includes(qt)));
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
  if (qTokens.length >= 2 && coverage < 0.5) return 0;
  if (qTokens.length >= 2 && matched === fuzzyOnly) return 0;

  let base: number;
  if (coverage === 1 && fuzzyOnly === 0 && partialOnly === 0) base = SCORE.allTokens;
  else if (matched === fuzzyOnly) base = SCORE.fuzzy;
  else base = SCORE.partial;

  const shorterBonus = Math.max(0, 24 - e.normName.length);
  return Math.round(base * coverage) + shorterBonus - fuzzyOnly * 20 - partialOnly * 10;
}

export interface ScoredStop {
  stop: DpmkNetworkStop;
  score: number;
}

/** Ranked stop matches with their raw score. Empty / unmatched query → `[]`. */
export function searchStopsWithScore(query: string, limit = 8): ScoredStop[] {
  const rawQuery = query.trim();
  const nq = normalizeText(rawQuery);
  if (!nq) return [];
  const qTokens = tokenize(nq);

  const scored: ScoredStop[] = [];
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
  return scored.slice(0, limit);
}

export function searchStops(query: string, limit = 8): DpmkNetworkStop[] {
  return searchStopsWithScore(query, limit).map((s) => s.stop);
}

/* --------------------------------------------------------- notice resolution */

/**
 * DPMK notice text vs the 1.7.2026 route sheet the dataset is transcribed from
 * spell some stops differently. These are text bridges, not new data — each
 * still resolves to an existing canonical stop.
 */
const PHRASE_REWRITES: [RegExp, string][] = [
  [/\bobchodné centrum\b/gi, 'OC'],
  [/\bobch\.?\s*centrum\b/gi, 'OC'],
  [/\bžel(?:\.|ezničná)\s+stanica\b/gi, 'železničná stanica'],
];

/** Strip notice cruft: leading "zastávka(-y/-u)", trailing "smer …", punctuation. */
function cleanPhrase(phrase: string): string {
  return phrase
    .replace(/^\s*(zast[áa]vk[aáuy]|na\s+zast[áa]vk[eu])\s+/i, '')
    .replace(/\s+smer\s+.+$/i, '')
    .replace(/[(),.;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ResolvedStop {
  stop: DpmkNetworkStop;
  confidence: 'exact' | 'fuzzy';
}

/**
 * Resolve a stop phrase from a DPMK notice to one of the 258 network stops, or
 * `null` when there is no confident match. `exact` = score from an exact
 * name/alias/prefix hit; `fuzzy` = a clearly-leading weaker hit.
 */
export function resolveStopPhrase(phrase: string): ResolvedStop | null {
  const base = cleanPhrase(phrase);
  if (!base || base.length < 2) return null;

  const candidates = [base];
  for (const [re, to] of PHRASE_REWRITES) {
    if (re.test(base)) candidates.push(base.replace(re, to));
  }

  let best: ScoredStop | null = null;
  let runnerUp = 0;
  for (const q of candidates) {
    const hits = searchStopsWithScore(q, 3);
    if (hits[0] && (!best || hits[0].score > best.score)) {
      best = hits[0];
      runnerUp = hits[1]?.score ?? 0;
    }
  }
  if (!best) return null;

  if (best.score >= SCORE.exactAlias) return { stop: best.stop, confidence: 'exact' };
  if (best.score >= SCORE.allTokens && best.score - runnerUp >= 80) {
    return { stop: best.stop, confidence: 'fuzzy' };
  }
  return null;
}
