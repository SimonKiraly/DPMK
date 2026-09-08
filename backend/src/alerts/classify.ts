/**
 * Classify a DPMK "Aktuality" item from its title (and a little body context).
 *
 * The RSS carries no `<category>`, so the title prefix does the work:
 *   "VÝPADOK SPOJA 15"              → connection_cancelled
 *   "UPOZORNENIE NA MEŠKANIE …"     → delays
 *   "Dočasná zmena zastávky …" etc. → planned
 *   "NÁLEZ" / "STRATA"              → dropped (lost & found)
 *   "V septembri prídu elektrobusy" → dropped (PR / news)
 *   anything else                   → other (kept, flagged for review)
 */
import type { AlertType } from '../types.js';

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Lost & found — same feed, not a disruption. */
const LOSTFOUND_RE = /^\s*(nalez|strata|najden|straten)/;

/** PR / corporate news — not an operational disruption. */
const PR_RE =
  /(elektrobus|trolejbus.*nakup|investici|modernizacia vozidlo|vyroci|\b\d{2,3} rokov\b|ocenenie|sutaz|kariera|nabor|volne pracovne|den otvorenych dveri|tlacova sprava|vysledky hospodarenia|valne zhromazdenie|predstavenstvo|dozorna rada|zmluva o|verejne obstaravanie|darcovstvo|charita)/;

/** Planned change / works / event affecting operation. */
const PLANNED_RE =
  /(vyluk|obchadzk|odklon|docasn|zrusenie .*zastavk|zrusen[aáiy] .*zastavk|zrusenie docasnej zastavk|presun .*zastavk|posun .*zastavk|premiestnenie .*zastavk|rekonstrukci|oprava .*(ulic|cest|most|trat)|uzavier|zmena trasy|zmena zastavovania|nahradn[aáye] (doprav|autobus|sluzb)|organizacia mhd|obmedzenie (dopravy|premavky)|obnovenie .*(zastavk|trasy|linky|premavky)|rezim .*(pracovn|skolsk|prazdnin)|prevadzka pocas|pocas podujatia|maraton|festival)/;

const DELAYS_RE = /(meskani|meska|zdrzani|zdrzuje|kolon|zhusten[aá] premavk)/;

const CANCELLED_RE = /(vypadok spoja|vypadok spojov|neodide spoj|neide spoj|zrusen[yý] spoj)/;

export interface Classification {
  type: AlertType;
  /** When true the item is feed noise and must not be stored. */
  drop: boolean;
  /** Low-confidence classification → `needsReview`. */
  uncertain: boolean;
}

export function classify(title: string, bodyText = ''): Classification {
  const t = fold(title);
  const b = fold(bodyText);
  const both = `${t}\n${b}`;

  if (LOSTFOUND_RE.test(t)) return { type: 'other', drop: true, uncertain: false };
  if (PR_RE.test(both) && !PLANNED_RE.test(both) && !CANCELLED_RE.test(both) && !DELAYS_RE.test(both)) {
    return { type: 'other', drop: true, uncertain: false };
  }

  if (CANCELLED_RE.test(both) || /^vypadok spoja/.test(t)) {
    return { type: 'connection_cancelled', drop: false, uncertain: false };
  }
  if (DELAYS_RE.test(both) || /meskani/.test(t)) {
    return { type: 'delays', drop: false, uncertain: false };
  }
  if (PLANNED_RE.test(both)) {
    return { type: 'planned', drop: false, uncertain: false };
  }

  // Kept but flagged — could be a disruption we don't recognise, or stray news.
  return { type: 'other', drop: false, uncertain: true };
}
