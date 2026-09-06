import type { z } from 'zod';

/** HTTP error with a status Fastify will honour. */
export class HttpError extends Error {
  override name = 'HttpError';
  constructor(
    readonly statusCode: number,
    message: string,
    readonly payload?: unknown,
  ) {
    super(message);
  }
}

/**
 * Parse request input against a Zod schema; on failure throw a 400 `HttpError`
 * (not a raw `ZodError`, whose `instanceof` is fragile across module copies).
 */
export function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  throw new HttpError(400, 'invalid request parameters', {
    issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}
