/**
 * In-memory accumulation of DPMK service alerts.
 *
 * The poller writes it; `/api/alerts` reads it (zero upstream calls per
 * request). The DPMK RSS is a rolling window of ~10 items, so an alert stays in
 * the store after it scrolls off the feed — its `status` decays to `ended` once
 * it has been gone long enough (see `computeStatus`). Survives an RSS outage by
 * keeping whatever it last held and exposing `lastError` / `stale`.
 *
 * Pure in-memory (like `fleet/snapshot.ts`) — Railway's filesystem is ephemeral
 * and one 3-minute tick repopulates the current feed after a restart.
 */
import { config } from '../config.js';
import type { AlertsSnapshot, AlertSeverity, ServiceAlert } from '../types.js';
import { computeStatus } from './normalize.js';

const SEVERITY_RANK: Record<AlertSeverity, number> = { severe: 3, major: 2, minor: 1, info: 0 };

class AlertStore {
  private byId = new Map<string, ServiceAlert>();
  private updatedAtMs: number | null = null;
  private lastOkAtMs: number | null = null;
  private lastError: string | null = null;

  /** Previously stored alert for an id — lets the poller preserve `firstSeenAt`. */
  get(id: string): ServiceAlert | undefined {
    return this.byId.get(id);
  }

  /**
   * Replace the store contents from one successful poll. `present` is the set of
   * guids that appeared in this feed fetch; alerts not in it are kept but their
   * `lastSeenInFeedAt` is not advanced.
   */
  applyPoll(fresh: ServiceAlert[], present: Set<string>): void {
    for (const a of fresh) this.byId.set(a.id, a);
    // Drop long-ended alerts so the map cannot grow without bound.
    const now = Date.now();
    for (const [id, a] of this.byId) {
      const status = computeStatus(
        {
          type: a.type,
          validFrom: a.validFrom,
          validTo: a.validTo,
          lastSeenInFeedAt: a.lastSeenInFeedAt,
          inLatestFeed: present.has(id),
        },
        now,
      );
      if (
        status === 'ended' &&
        now - Date.parse(a.lastSeenInFeedAt) > config.alerts.plannedRetentionMs
      ) {
        this.byId.delete(id);
      }
    }
    this.updatedAtMs = now;
    this.lastOkAtMs = now;
    this.lastError = null;
  }

  markError(message: string): void {
    this.lastError = message;
  }

  hasData(): boolean {
    return this.updatedAtMs !== null;
  }

  ageMs(): number {
    return this.updatedAtMs === null ? Infinity : Date.now() - this.updatedAtMs;
  }

  /** All alerts with a freshly-computed `status`, most relevant first. */
  private computed(now = Date.now()): ServiceAlert[] {
    const list = [...this.byId.values()].map((a) => ({
      ...a,
      status: computeStatus(
        {
          type: a.type,
          validFrom: a.validFrom,
          validTo: a.validTo,
          lastSeenInFeedAt: a.lastSeenInFeedAt,
          // "in latest feed" ≈ seen within one poll interval + slack
          inLatestFeed: now - Date.parse(a.lastSeenInFeedAt) < config.alerts.pollMs * 2,
        },
        now,
      ),
    }));

    const STATUS_RANK = { active: 2, upcoming: 1, ended: 0 };
    return list.sort(
      (x, y) =>
        STATUS_RANK[y.status] - STATUS_RANK[x.status] ||
        SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity] ||
        Date.parse(y.publishedAt) - Date.parse(x.publishedAt),
    );
  }

  read(): AlertsSnapshot {
    const alerts = this.computed();
    const age = this.ageMs();
    return {
      alerts,
      count: alerts.length,
      updatedAt: this.updatedAtMs ? new Date(this.updatedAtMs).toISOString() : null,
      ageMs: age,
      stale: this.updatedAtMs !== null && age > config.alerts.staleAfterMs,
      warmingUp: this.updatedAtMs === null,
      lastError: this.lastError,
    };
  }

  find(id: string): ServiceAlert | undefined {
    return this.computed().find((a) => a.id === id);
  }

  health() {
    return {
      alertCount: this.byId.size,
      updatedAt: this.updatedAtMs ? new Date(this.updatedAtMs).toISOString() : null,
      lastOkAt: this.lastOkAtMs ? new Date(this.lastOkAtMs).toISOString() : null,
      ageMs: this.ageMs(),
      lastError: this.lastError,
    };
  }

  /** Test helper. */
  _reset(): void {
    this.byId.clear();
    this.updatedAtMs = null;
    this.lastOkAtMs = null;
    this.lastError = null;
  }
}

export const alerts = new AlertStore();
