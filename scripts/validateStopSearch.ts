/**
 * Behavioural checks for the stop search (src/data/stopSearch.ts) against the
 * authoritative 258-stop DPMK network. Every expected id below is a REAL stop
 * in src/data/dpmkNetwork.ts — no invented names.
 *
 * Run:  npx tsx scripts/validateStopSearch.ts
 * Exits non-zero on any failed assertion so it can gate CI.
 */

import { DPMK_STOPS } from '../src/data/dpmkNetwork.ts';
import { searchStops } from '../src/data/stopSearch.ts';

const ids = new Set(DPMK_STOPS.map((s) => s.id));
const errors: string[] = [];
const rows: string[] = [];

/** The top result for `query` must be `expectedId`. */
function expectTop(query: string, expectedId: string, note = '') {
  if (!ids.has(expectedId)) {
    errors.push(`test bug: "${expectedId}" is not a real stop id`);
    return;
  }
  const res = searchStops(query);
  const top = res[0];
  const ok = top?.id === expectedId;
  rows.push(
    `${ok ? '✓' : '✗'}  "${query}"  →  ${top ? `${top.name} [${top.id}]` : '(none)'}` +
      `${ok ? '' : `   EXPECTED ${expectedId}`}${note ? `   — ${note}` : ''}`,
  );
  if (!ok) errors.push(`"${query}" → expected ${expectedId}, got ${top?.id ?? '(none)'}`);
}

/** `query` must return nothing (invalid / unrelated input). */
function expectEmpty(query: string, note = '') {
  const res = searchStops(query);
  const ok = res.length === 0;
  rows.push(
    `${ok ? '✓' : '✗'}  "${query}"  →  ${ok ? '(no results)' : res.map((s) => s.name).join(', ')}` +
      `${note ? `   — ${note}` : ''}`,
  );
  if (!ok) errors.push(`"${query}" should return nothing, got ${res.map((s) => s.id).join(', ')}`);
}

/* --------------------------------------------------- mandatory: Kino Družba -- */
// Canonical stop in the dataset IS "Kino Družba" (id s-kino-druzba). There is no
// separate "Družba" stop; "Družba" / "kino druzba" resolve to it by token match.
expectTop('Kino Družba', 's-kino-druzba', 'exact canonical');
expectTop('kino druzba', 's-kino-druzba', 'no diacritics');
expectTop('Družba', 's-kino-druzba', 'single meaningful token');
expectTop('druzba', 's-kino-druzba', 'token, no diacritics');

/* ------------------------------------------------ additional real-stop cases -- */
expectTop('Amfiteáter', 's-amfiteater', 'diacritics, exact');
expectTop('amfiteater', 's-amfiteater', 'no diacritics');
expectTop('Alpinka', 's-alpinka', 'single-word canonical');
expectTop('astor', 's-astoria', 'prefix of canonical');
expectTop('namestie maratonu mieru', 's-namestie-maratonu-mieru', 'multi-word, no diacritics');
expectTop('Nám. Osloboditeľov', 's-namestie-osloboditelov', 'DPMK alias, not the canonical name');
expectTop('vss krizovatka', 's-vss-krizovatka', 'canonical without punctuation');
expectTop('exnarova', 's-exnarova', 'no diacritics (canonical "Exnárova")');

/* ------------------------------------------------------ conservative fuzzy --- */
expectTop('druzbaa', 's-kino-druzba', 'trailing typo');
expectTop('amfiteatr', 's-amfiteater', 'missing letter');

/* ---------------------------------------------------------- invalid queries -- */
expectEmpty('qwertzuiop', 'nonsense — must not fuzzy-match anything');
expectEmpty('zzz yyy xxx', 'multi-word nonsense');
expectEmpty('   ', 'whitespace only');

/* ---------------------------------------------------------------- ambiguity -- */
// "druzba" / "kino" appear in exactly one stop → exactly one result.
if (searchStops('druzba').length !== 1) {
  errors.push(`"druzba" should return exactly 1 stop, got ${searchStops('druzba').length}`);
}

/* ------------------------------------------------------------------- report -- */
console.log('DPMK stop-search validation');
console.log('─'.repeat(70));
for (const r of rows) console.log(r);
console.log('─'.repeat(70));

if (errors.length) {
  console.log(`\n${errors.length} failure(s):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log('\nFAIL');
  process.exit(1);
}
console.log('\nOK — all stop-search assertions passed.');
