/**
 * Field extraction for the DPMK feed body text (already flattened by `rss.ts`).
 *
 * Shape A ("MHD Aktuálne" short notices) is a list of `KEY: value` lines and is
 * fully parsed. Planned notices are Slovak prose — Phase 0 only cleans the
 * boilerplate off them for `description`; their dates/stops are left for a later
 * phase and never guessed here.
 */

/** Fold diacritics + lowercase, for matching Slovak field labels. */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const KNOWN_KEYS = new Set([
  'miesto',
  'cas',
  'dotknute linky',
  'dotknuta linka',
  'linka',
  'linky',
  'obmedzenie',
  'dovod',
  'predpoklad trvania obmedzeni',
  'predpoklad trvania obmedzenia',
  'smer',
  'najdeny predmet',
  'kontakt',
]);

/** A line like `D.M.YYYY - HH:MM` — the trailing publish stamp. */
const TRAILING_STAMP_RE = /^\d{1,2}\.\s?\d{1,2}\.\s?\d{4}\s*-\s*\d{1,2}:\d{2}$/;
const BARE_TIME_RE = /^\d{1,2}:\d{2}$/;
const HHMM_RE = /(\d{1,2}):(\d{2})/;

export interface KeyedField {
  key: string; // folded label, e.g. "miesto"
  value: string; // trimmed, original casing
}

/** Split Shape A body text into `KEY: value` fields (multi-line values joined). */
export function extractFields(bodyText: string): KeyedField[] {
  const lines = bodyText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    // drop the Drupal "Obsah" field label, the author line and the date stamp
    .filter((l) => fold(l) !== 'informator' && fold(l) !== 'obsah' && !TRAILING_STAMP_RE.test(l));

  const fields: KeyedField[] = [];
  let current: KeyedField | null = null;

  for (const line of lines) {
    const m = line.match(/^([A-Za-zÀ-ž .]{3,45}?):\s*(.*)$/);
    if (m && KNOWN_KEYS.has(fold(m[1]!))) {
      if (current) fields.push(current);
      current = { key: fold(m[1]!), value: m[2]!.trim() };
      continue;
    }
    if (current) {
      // continuation of the previous field's value
      current.value = `${current.value} ${line}`.trim();
    }
    // a stray line before the first key (e.g. the repeated title / a bare time) is ignored
  }
  if (current) fields.push(current);
  return fields;
}

export interface ShapeAParse {
  /** (place, direction, time) tuples from the MIESTO/ČAS lines, in order. */
  places: { place: string; direction: string | null; time: string | null }[];
  /** Line tokens from DOTKNUTÉ LINKY / LINKA. */
  lineTokens: string[];
  restriction: string | null; // OBMEDZENIE
  reason: string | null; // DÔVOD
  /** Raw PREDPOKLAD text, and a leading `HH:MM` if the text begins with one. */
  expected: { text: string; time: string | null } | null;
}

/** `"Madridská smer Staničné námestie"` → `{ place, direction }`. */
export function splitPlaceDirection(value: string): { place: string; direction: string | null } {
  const m = value.match(/^(.*?)\s+smer\s+(.+)$/i);
  if (m) return { place: m[1]!.trim(), direction: m[2]!.trim().replace(/\.$/, '').trim() };
  return { place: value.trim(), direction: null };
}

function normalizeTime(raw: string): string | null {
  const m = raw.match(HHMM_RE);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Parse the labelled fields of a `VÝPADOK SPOJA` / `MEŠKANIE` notice. */
export function parseShapeA(fields: KeyedField[]): ShapeAParse {
  const places: ShapeAParse['places'] = [];
  const lineTokens: string[] = [];
  let restriction: string | null = null;
  let reason: string | null = null;
  let expected: ShapeAParse['expected'] = null;

  let pendingPlace: { place: string; direction: string | null } | null = null;

  for (const f of fields) {
    switch (f.key) {
      case 'miesto': {
        if (pendingPlace) places.push({ ...pendingPlace, time: null }); // MIESTO with no ČAS
        pendingPlace = splitPlaceDirection(f.value);
        break;
      }
      case 'cas': {
        const time = normalizeTime(f.value);
        if (pendingPlace) {
          places.push({ ...pendingPlace, time });
          pendingPlace = null;
        } else if (time) {
          places.push({ place: '', direction: null, time });
        }
        break;
      }
      case 'dotknute linky':
      case 'dotknuta linka':
      case 'linka':
      case 'linky': {
        for (const tok of f.value.split(/[,;/]+|\s+a\s+|\s+/i)) {
          const clean = tok.trim().replace(/[.,]$/, '');
          if (clean && /^[A-Za-z]{0,3}\d{0,3}[A-Za-zČč]?$/.test(clean) && /[0-9A-Za-z]/.test(clean)) {
            lineTokens.push(clean);
          }
        }
        break;
      }
      case 'obmedzenie':
        restriction = f.value || null;
        break;
      case 'dovod':
        reason = f.value || null;
        break;
      case 'predpoklad trvania obmedzeni':
      case 'predpoklad trvania obmedzenia': {
        const text = f.value.trim();
        if (text) {
          const lead = text.match(/^\s*(\d{1,2}:\d{2})/);
          expected = { text, time: lead ? normalizeTime(lead[1]!) : null };
        }
        break;
      }
      default:
        break;
    }
  }
  if (pendingPlace) places.push({ ...pendingPlace, time: null });

  return {
    places,
    lineTokens: Array.from(new Set(lineTokens)),
    restriction,
    reason,
    expected,
  };
}

/* ------------------------------------------------------------------- planned */

/** The media sign-off — everything from here down is boilerplate. */
const PLANNED_SIGNOFF_RE =
  /(kontakt pre médi|hovorca@|spájame košičanov|nonstop info|info linku|055\s?64\s?07\s?407|facebook\.com|sociálnych sieťach|safelinks\.protection|v prípade potreby sa cestujúci)/i;
/** Standalone boilerplate lines to skip without stopping. */
const PLANNED_SKIP_LINE_RE =
  /^(dopravný podnik mesta košice,?\s*a\.\s?s\.\s*$|košice,\s+\d)/i;

/** Clean a planned-notice prose body to a short human summary. */
export function cleanPlannedDescription(bodyText: string, maxLen = 600): string {
  const kept: string[] = [];
  for (const rawLine of bodyText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (fold(line) === 'informator' || fold(line) === 'obsah' || TRAILING_STAMP_RE.test(line)) {
      continue;
    }
    if (BARE_TIME_RE.test(line)) continue;
    if (PLANNED_SIGNOFF_RE.test(line)) break;
    if (PLANNED_SKIP_LINE_RE.test(line)) continue;
    kept.push(line);
  }
  const text = kept.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? `${text.slice(0, maxLen - 1).trimEnd()}…` : text;
}
