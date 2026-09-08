/**
 * The single background poller for DPMK service alerts.
 *
 * Fetches `dpmk.sk/aktuality/rss` once per `ALERTS_POLL_MS` (default 3 min)
 * regardless of client count, parses it tolerantly, normalises each item and
 * hands the batch to the store. On any failure the previous store contents are
 * kept and the error logged. Mirrors `fleet/poller.ts`.
 */
import type { FastifyBaseLogger } from 'fastify';
import { config } from '../config.js';
import { toServiceAlert } from './normalize.js';
import { parseRss } from './rss.js';
import { fetchRssText } from './rssClient.js';
import { alerts } from './store.js';

let timer: NodeJS.Timeout | null = null;
let ticking = false;
let log: FastifyBaseLogger | null = null;
let firstPoll: Promise<void> | null = null;

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  const startedAt = Date.now();
  try {
    const xml = await fetchRssText();
    const { items, skipped } = parseRss(xml);

    const nowIso = new Date().toISOString();
    const present = new Set<string>();
    const fresh = [];
    let dropped = 0;
    let failed = 0;

    for (const item of items) {
      present.add(item.guid);
      let alert;
      try {
        alert = toServiceAlert(item, alerts.get(item.guid), nowIso);
      } catch (err) {
        failed += 1;
        log?.warn(
          { guid: item.guid, title: item.title, err: (err as Error).message },
          'alerts: item normalisation threw — skipped',
        );
        continue;
      }
      if (alert) fresh.push(alert);
      else dropped += 1;
    }

    alerts.applyPoll(fresh, present);

    log?.debug(
      {
        feedItems: items.length,
        skippedItems: skipped,
        kept: fresh.length,
        droppedNoise: dropped,
        failedNormalise: failed,
        needReview: fresh.filter((a) => a.needsReview).length,
        stored: alerts.health().alertCount,
        ms: Date.now() - startedAt,
      },
      'alerts: refreshed',
    );

    if (items.length > 0 && fresh.length === 0 && dropped === 0) {
      log?.warn(
        { feedItems: items.length },
        'alerts: feed had items but none were kept or dropped — parser may be broken',
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    alerts.markError(message);
    log?.warn(
      { err: message, ageMs: alerts.ageMs(), stored: alerts.health().alertCount },
      'alerts: poll failed — serving last known snapshot',
    );
  } finally {
    ticking = false;
  }
}

function scheduleNext(): void {
  if (timer) return;
  timer = setInterval(() => void tick(), config.alerts.pollMs);
  timer.unref?.();
}

export function start(logger: FastifyBaseLogger): void {
  log = logger;
  if (!firstPoll) firstPoll = tick();
  scheduleNext();
}

export function stop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Called by `/api/alerts` — awaits the first poll so the first request isn't empty. */
export async function ensureWarm(): Promise<void> {
  if (!timer && !firstPoll) {
    firstPoll = tick();
    scheduleNext();
  }
  if (!alerts.hasData() && firstPoll) {
    await firstPoll.catch(() => {
      /* error already recorded on the store */
    });
  }
}

/** Test helper. */
export function _stopForTest(): void {
  stop();
  ticking = false;
  firstPoll = null;
  log = null;
}
