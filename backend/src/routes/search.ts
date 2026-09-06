import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { cache } from '../lib/cache.js';
import { ubianGet } from '../ubian/client.js';
import { parseInput } from '../lib/validate.js';
import { mapSearchResults } from '../ubian/normalize.js';
import type { UbianAutocompleteResult, UbianEnvelope } from '../ubian/types.js';

const query = z.object({ q: z.string().trim().min(1).max(80) });

/**
 * `GET /api/search?q=` — stop/place autocomplete, proxied from Ubian, filtered
 * to Košice stops (drops pure railway stations). Cached + single-flight per query.
 */
export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/search', async (req) => {
    const { q } = parseInput(query, req.query);
    if (q.length < 2) return { results: [] };

    const raw = await cache.cached(
      `ac:${q.toLowerCase()}`,
      config.cacheTtlMs.search,
      async () => {
        const json = await ubianGet<UbianEnvelope & { results?: UbianAutocompleteResult[] }>(
          '/navigation/autocomplete',
          { query: q },
        );
        return json.results ?? [];
      },
    );

    return { results: mapSearchResults(raw) };
  });
};
