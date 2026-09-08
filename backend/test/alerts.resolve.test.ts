import { describe, expect, it } from 'vitest';

import { resolveRoutes, resolveStops } from '../src/alerts/resolve.js';
import { resolveStopPhrase, searchStopsWithScore } from '../src/network/stopSearch.js';
import { ROUTE_BY_SHORT_NAME } from '../src/network/adapters.js';

describe('resolveRoutes — against the 71-route network', () => {
  it('resolves plain line numbers verbatim', () => {
    const r = resolveRoutes(['15', '27', '6', 'N1', 'R4']);
    expect(r.resolved.sort()).toEqual(['15', '27', '6', 'N1', 'R4'].sort());
    expect(r.unresolved).toEqual([]);
  });

  it('folds the notice/Ubian express names x1 / x9 / xR2 onto the sheet names X / XR', () => {
    expect(ROUTE_BY_SHORT_NAME['X']).toBeTruthy();
    expect(ROUTE_BY_SHORT_NAME['x1']).toBeUndefined();
    const r = resolveRoutes(['x1', 'x9', 'xR2']);
    expect(r.resolved.sort()).toEqual(['X', 'XR']);
    expect(r.unresolved).toEqual([]);
  });

  it('reports tokens that match no route instead of dropping them silently', () => {
    const r = resolveRoutes(['15', '999', 'ABC']);
    expect(r.resolved).toEqual(['15']);
    expect(r.unresolved).toEqual(['999', 'ABC']);
  });
});

describe('stop search — scored, for confidence', () => {
  it('exact canonical name scores highest', () => {
    const [top] = searchStopsWithScore('Madridská');
    expect(top?.stop.id).toBe('s-madridska');
    expect(top!.score).toBeGreaterThanOrEqual(900);
  });
});

describe('resolveStopPhrase — DPMK notice text → a real stop', () => {
  it('resolves an exact stop name', () => {
    expect(resolveStopPhrase('Madridská')?.stop.id).toBe('s-madridska');
    expect(resolveStopPhrase('Verejný cintorín')?.stop.id).toBe('s-verejny-cintorin');
  });

  it('strips a trailing " smer …" before matching', () => {
    expect(resolveStopPhrase('Zimná smer KVP, kláštor')?.stop.id).toBe('s-zimna');
  });

  it('bridges "Obchodné centrum Cassovia" → the sheet name "OC Cassovia"', () => {
    const hit = resolveStopPhrase('Obchodné centrum Cassovia smer Exnárova');
    expect(hit?.stop.id).toBe('s-oc-cassovia');
    expect(hit?.confidence).toBe('exact');
  });

  it('returns null for a phrase with no confident match', () => {
    expect(resolveStopPhrase('Neexistujúca Ulica 42')).toBeNull();
    expect(resolveStopPhrase('')).toBeNull();
  });
});

describe('resolveStops — list', () => {
  it('resolves the confident ones and lists the rest as unresolved', () => {
    const r = resolveStops(['Madridská', 'Staničné námestie', 'Rastislavova (nejestvuje)']);
    const ids = r.stops.map((s) => s.id);
    expect(ids).toContain('s-madridska');
    expect(ids).toContain('s-stanicne-namestie');
    expect(r.unresolved.length).toBe(1);
  });

  it('de-duplicates by stop id', () => {
    const r = resolveStops(['Madridská', 'Madridská smer Moskovská']);
    expect(r.stops).toHaveLength(1);
  });
});
