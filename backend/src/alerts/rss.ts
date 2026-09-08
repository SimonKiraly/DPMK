/**
 * Tolerant RSS 2.0 reader for the DPMK "Aktuality" feed.
 *
 * Hand-rolled (no XML dependency) and deliberately forgiving: it pulls each
 * `<item>…</item>` block out with one regex, then extracts individual tags from
 * that block. A block that is missing a `<title>`/`<guid>` or that throws while
 * being read is skipped — one malformed item never breaks the poll.
 *
 * The feed's `<description>` is HTML-entity-encoded markup (`&lt;p&gt;…`), so it
 * is decoded once and then flattened to text (line breaks kept for the
 * `KEY: value<br>` short notices).
 */

export interface RawRssItem {
  /** Stable numeric id from `<guid>` (`"119534 at https://www.dpmk.sk"` → `"119534"`). */
  guid: string;
  title: string;
  link: string;
  /** `<pubDate>` as an ISO string, or `null` when unparseable. */
  publishedAt: string | null;
  /** `<description>` decoded and flattened to plain text (newlines preserved). */
  bodyText: string;
  /** The raw (still HTML) decoded `<description>` inner, for debugging. */
  rawHtml: string;
}

export interface RssParseResult {
  items: RawRssItem[];
  /** `<item>` blocks present in the XML that could not be read (for logging). */
  skipped: number;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
};

function safeFromCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Decode the HTML entities that appear in this feed (named + numeric). */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? safeFromCodePoint(code) : whole;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)
      ? NAMED_ENTITIES[body]!
      : whole;
  });
}

/** HTML → plain text: `<br>` / `</p>` become newlines, other tags are dropped. */
export function htmlToText(html: string): string {
  const lines = decodeEntities(
    html
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/\s*p\s*>/gi, '\n')
      .replace(/<\s*\/?\s*[a-z][^>]*>/gi, ''),
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim());

  const out: string[] = [];
  for (const line of lines) {
    if (line.length === 0 && (out.length === 0 || out[out.length - 1] === '')) continue;
    out.push(line);
  }
  return out.join('\n').trim();
}

function tagValue(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1]! : null;
}

function parsePubDate(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw.trim());
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function extractGuid(raw: string | null): string | null {
  if (!raw) return null;
  const s = decodeEntities(raw).trim();
  const num = s.match(/^(\d+)\b/); // "119534 at https://www.dpmk.sk" → "119534"
  if (num) return num[1]!;
  return s.length > 0 && s.length < 200 ? s : null;
}

/**
 * Parse a DPMK RSS document. Never throws — returns whatever items it could read
 * plus a `skipped` count.
 */
export function parseRss(xml: string): RssParseResult {
  const items: RawRssItem[] = [];
  let skipped = 0;

  const blocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    try {
      const guid = extractGuid(tagValue(block, 'guid'));
      const rawTitle = tagValue(block, 'title');
      if (!guid || rawTitle == null) {
        skipped += 1;
        continue;
      }
      const title = decodeEntities(rawTitle).replace(/\s+/g, ' ').trim();
      const link = decodeEntities(tagValue(block, 'link') ?? '').trim();
      const publishedAt = parsePubDate(tagValue(block, 'pubDate'));

      const rawDescription = tagValue(block, 'description') ?? '';
      const decodedHtml = decodeEntities(rawDescription);
      const bodyText = htmlToText(decodedHtml);

      items.push({ guid, title, link, publishedAt, bodyText, rawHtml: decodedHtml });
    } catch {
      skipped += 1;
    }
  }

  return { items, skipped };
}
