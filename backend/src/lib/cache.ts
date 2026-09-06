/**
 * TTL cache + single-flight.
 *
 * `cached(key, ttlMs, loader)`:
 *   - serves a fresh cached value if one exists within `ttlMs`
 *   - otherwise runs `loader` — and if N callers ask for the same key while the
 *     loader is in flight, they all await the SAME promise (one upstream call)
 *   - a failed loader is not cached; the rejection is shared by the waiters
 *
 * This is the backend equivalent of `ubianService`'s `cached()` Map, extended
 * with request coalescing so 50 phones opening the same stop = 1 Ubian call.
 */

interface Entry<T> {
  value: T;
  at: number;
}

export class TtlCache {
  private store = new Map<string, Entry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  async cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key) as Entry<T> | undefined;
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;

    const running = this.inflight.get(key) as Promise<T> | undefined;
    if (running) return running;

    const p = loader()
      .then((value) => {
        this.store.set(key, { value, at: Date.now() });
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, p);
    return p;
  }

  /** Last-good value regardless of age, or undefined. Used for stale fallback. */
  peek<T>(key: string): T | undefined {
    return this.store.get(key)?.value as T | undefined;
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const cache = new TtlCache();
