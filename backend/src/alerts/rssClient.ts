/**
 * Fetches the DPMK "Aktuality" RSS feed as text.
 *
 * The ONLY place the backend talks to `dpmk.sk`. Native `fetch` + an
 * `AbortController` timeout, mirroring `ubian/client.ts`. Returns the raw XML
 * string; parsing is the caller's job so a transport failure and a parse
 * failure stay distinct in the logs.
 */
import { config } from '../config.js';

export class RssError extends Error {
  override name = 'RssError';
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function fetchRssText(url = config.alerts.rssUrl): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.alerts.timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'mhd-kosice-backend/1.0 (+https://github.com/SimonKiraly/DPMK)',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new RssError(`HTTP ${res.status} for ${url}`, res.status);
    const text = await res.text();
    if (!text.includes('<rss') && !text.includes('<feed')) {
      throw new RssError(`response is not an RSS/Atom document (${text.length} bytes)`);
    }
    return text;
  } catch (err) {
    if (err instanceof RssError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new RssError(`timeout after ${config.alerts.timeoutMs}ms for ${url}`);
    }
    throw new RssError(err instanceof Error ? err.message : `request failed for ${url}`);
  } finally {
    clearTimeout(timer);
  }
}
