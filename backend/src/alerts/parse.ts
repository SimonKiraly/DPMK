/**
 * Field extraction for the DPMK feed body text (already flattened by `rss.ts`).
 *
 * Shape A ("MHD Aktuálne" short notices) is a list of `KEY: value` lines and is
 * fully parsed. Planned notices are Slovak prose — the boilerplate is cleaned
 * off for `description`, and a few deterministic signals (an explicit
 * `od …/do …` date range, a `z dôvodu …` reason, an `AKTUALIZÁCIA (HH:MM)`
 * revision stamp) are lifted out when the phrasing is unambiguous. Nothing that
 * is not written plainly in the text is ever guessed.
 */
import { combineDateAndClock, kosiceDateToIso } from '../lib/time.js';

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

/* --------------------------------------------------- planned: dates & reason */

/**
 * Slovak month names folded to `1‥12` — nominative, genitive ("7. septembra")
 * and locative ("v septembri"), plus their diacritic-free forms (the body text
 * is `fold()`-ed before matching).
 */
const MONTHS: Record<string, number> = {
  januar: 1, januara: 1, januari: 1,
  februar: 2, februara: 2, februari: 2,
  marec: 3, marca: 3, marci: 3,
  april: 4, aprila: 4, aprili: 4,
  maj: 5, maja: 5, maji: 5,
  jun: 6, juna: 6, juni: 6,
  jul: 7, jula: 7, juli: 7,
  august: 8, augusta: 8, auguste: 8,
  september: 9, septembra: 9, septembri: 9,
  oktober: 10, oktobra: 10, oktobri: 10,
  november: 11, novembra: 11, novembri: 11,
  december: 12, decembra: 12, decembri: 12,
};

export interface PlannedDates {
  /** ISO Košice-midnight start when the text states an explicit `od …` date. */
  validFrom: string | null;
  /** ISO Košice end-of-day when the text states an explicit `do …` date. */
  validTo: string | null;
  /** True once a `validFrom` was lifted from unambiguous phrasing. */
  confident: boolean;
}

function resolveYear(explicit: string | undefined, month: number, day: number, base: Date): {
  year: number;
} {
  const pubYear = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bratislava', year: 'numeric' }).format(base),
  );
  if (explicit) return { year: Number(explicit) };
  // Planned notices always describe the future: if this day/month sits well
  // before the publication date, the notice means next year.
  const sameYear = Date.parse(kosiceDateToIso(pubYear, month, day, 12, 0));
  return { year: sameYear < base.getTime() - 14 * 24 * 60 * 60_000 ? pubYear + 1 : pubYear };
}

/**
 * Pull an explicit validity window out of planned-notice prose. Only fires on
 * `od <deň>. <mesiac> [rok]` / `do <deň>. <mesiac> [rok]` (or the fully numeric
 * `od DD. MM. YYYY`) — a bare "od pondelka" with no date is left as `null`.
 */
export function parsePlannedDates(bodyText: string, publishedAt: string): PlannedDates {
  const base = new Date(publishedAt);
  if (Number.isNaN(base.getTime())) return { validFrom: null, validTo: null, confident: false };

  const text = ` ${fold(bodyText).replace(/\s+/g, ' ')} `;
  const monthAlt = Object.keys(MONTHS).join('|');
  const re = new RegExp(
    String.raw`\b(od|do)\b (?:[a-z]+ )?(\d{1,2})\. ?(?:(${monthAlt})|(\d{1,2})\.) ?(\d{4})?`,
    'g',
  );

  let validFrom: string | null = null;
  let validTo: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index === re.lastIndex) re.lastIndex += 1;
    const prep = m[1]!;
    const day = Number(m[2]);
    const month = m[3] ? MONTHS[m[3]]! : Number(m[4]);
    if (!month || month < 1 || month > 12 || day < 1 || day > 31) continue;
    const { year } = resolveYear(m[5], month, day, base);
    if (prep === 'od' && !validFrom) validFrom = kosiceDateToIso(year, month, day, 0, 0);
    else if (prep === 'do' && !validTo) validTo = kosiceDateToIso(year, month, day, 23, 59);
  }
  // Guard against a reversed pair ("do" earlier than "od").
  if (validFrom && validTo && Date.parse(validTo) <= Date.parse(validFrom)) validTo = null;

  return { validFrom, validTo, confident: validFrom != null };
}

/** `"… z dôvodu rekonštrukčných prác …"` → `"rekonštrukčných prác …"`, or `null`. */
export function extractPlannedReason(bodyText: string): string | null {
  const m = bodyText.match(/z\s+dôvodu\s+(.+?)(?=\s*[.;]|,\s|\s+od\s+\w|\s+do\s+\w|$)/i);
  if (!m) return null;
  const reason = m[1]!.trim().replace(/\s+/g, ' ').replace(/[.,;:]+$/, '');
  return reason.length >= 4 && reason.length <= 160 ? reason : null;
}

/**
 * The `AKTUALIZÁCIA (HH:MM)` / `📍(HH:MM) AKTUALIZÁCIA:` revision stamp some
 * operational notices carry, paired with the publication date. `null` when
 * there is no such stamp, its time is unparseable, or pairing it with the
 * publication day would place it *before* publication (so not a later revision).
 */
export function parseUpdateTimestamp(bodyText: string, publishedAt: string): string | null {
  if (Number.isNaN(new Date(publishedAt).getTime())) return null;
  const folded = fold(bodyText);
  if (!/aktualizaci[ae]/.test(folded)) return null;

  const before = folded.match(/(\d{1,2}:\d{2})\s*\)?\s*(?:[-–:]\s*)?aktualizaci[ae]/);
  const after = folded.match(/aktualizaci[ae]\s*[:(]?\s*(?:o\s+)?(\d{1,2}:\d{2})/);
  const hhmm = normalizeTime(before?.[1] ?? '') ?? normalizeTime(after?.[1] ?? '');
  if (!hhmm) return null;

  const iso = combineDateAndClock(new Date(publishedAt), hhmm);
  if (!iso || Date.parse(iso) < Date.parse(publishedAt)) return null;
  return iso;
}
