/**
 * Ubian HTTP client — port of `ubianService.get()` / `buildQuery()`.
 *
 * The ONLY place the backend talks to `dpmk-odchody.ubian.sk`. Native `fetch`
 * with an `AbortController` timeout and the `{status:'ok'}` envelope check,
 * exactly as the mobile app does today.
 */
import { config } from '../config.js';
import type { UbianEnvelope } from './types.js';

export class UbianError extends Error {
  override name = 'UbianError';
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

type QueryValue = string | number | (string | number)[];

function buildQuery(params: Record<string, QueryValue>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        parts.push(`${encodeURIComponent(k)}[]=${encodeURIComponent(String(item))}`);
      }
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function ubianGet<T extends UbianEnvelope>(
  path: string,
  params: Record<string, QueryValue> = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ubian.timeoutMs);
  const url = `${config.ubian.baseUrl}${path}${buildQuery(params)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'mhd-kosice-backend/1.0 (+https://github.com/SimonKiraly/DPMK)',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new UbianError(`HTTP ${res.status} for ${path}`, res.status);
    const json = (await res.json()) as T;
    if (json.status !== 'ok') {
      throw new UbianError(json.error_message ?? `status != ok for ${path}`);
    }
    return json;
  } catch (err) {
    if (err instanceof UbianError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new UbianError(`timeout after ${config.ubian.timeoutMs}ms for ${path}`);
    }
    throw new UbianError(
      err instanceof Error ? `${err.message} for ${path}` : `request failed for ${path}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
