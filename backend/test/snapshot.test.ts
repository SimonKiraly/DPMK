import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { config } from '../src/config.js';
import { fleet } from '../src/fleet/snapshot.js';
import { normalizeVehicles } from '../src/ubian/normalize.js';
import type { UbianVehicleRaw } from '../src/ubian/types.js';

const synthetic = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/vehicles-nearby.synthetic.json', import.meta.url)), 'utf8'),
) as { vehicles: UbianVehicleRaw[] };

afterEach(() => {
  fleet._reset();
  vi.useRealTimers();
});

describe('FleetStore — snapshot / stale behaviour', () => {
  it('starts warming up with no data', () => {
    const s = fleet.read();
    expect(s.warmingUp).toBe(true);
    expect(s.vehicles).toHaveLength(0);
    expect(s.updatedAt).toBeNull();
    expect(s.ageMs).toBe(Infinity);
  });

  it('a successful poll clears warm-up and is fresh', () => {
    const { vehicles } = normalizeVehicles(synthetic.vehicles);
    fleet.setVehicles(vehicles);
    const s = fleet.read();
    expect(s.warmingUp).toBe(false);
    expect(s.stale).toBe(false);
    expect(s.vehicles).toHaveLength(5);
    expect(s.lastError).toBeNull();
  });

  it('keeps the last good vehicle list when a later poll fails', () => {
    const { vehicles } = normalizeVehicles(synthetic.vehicles);
    fleet.setVehicles(vehicles);
    fleet.markError('HTTP 503 for /navigation/vehicles/nearby');

    const s = fleet.read();
    expect(s.vehicles).toHaveLength(5); // unchanged
    expect(s.lastError).toContain('503');
    expect(s.warmingUp).toBe(false);
  });

  it('reports stale=true once the snapshot ages past the threshold', () => {
    vi.useFakeTimers();
    fleet.setVehicles(normalizeVehicles(synthetic.vehicles).vehicles);
    expect(fleet.read().stale).toBe(false);

    vi.advanceTimersByTime(config.poller.staleAfterMs + 1000);
    const s = fleet.read();
    expect(s.stale).toBe(true);
    expect(s.ageMs).toBeGreaterThan(config.poller.staleAfterMs);
    expect(s.vehicles).toHaveLength(5); // still served
  });

  it('a fresh poll clears stale and the error', () => {
    vi.useFakeTimers();
    fleet.setVehicles(normalizeVehicles(synthetic.vehicles).vehicles);
    fleet.markError('boom');
    vi.advanceTimersByTime(config.poller.staleAfterMs + 1000);
    expect(fleet.read().stale).toBe(true);

    fleet.setVehicles(normalizeVehicles(synthetic.vehicles).vehicles);
    const s = fleet.read();
    expect(s.stale).toBe(false);
    expect(s.lastError).toBeNull();
  });

  it('idle demand tracking drives the poller pause', () => {
    vi.useFakeTimers();
    fleet.touchDemand();
    expect(fleet.msSinceDemand()).toBeLessThan(1000);
    vi.advanceTimersByTime(config.poller.idleStopMs + 5000);
    expect(fleet.msSinceDemand()).toBeGreaterThan(config.poller.idleStopMs);
    fleet.touchDemand();
    expect(fleet.msSinceDemand()).toBeLessThan(1000);
  });

  it('snapshotById feeds the next poll for bearing', () => {
    fleet.setVehicles(normalizeVehicles(synthetic.vehicles).vehicles);
    const prev = fleet.snapshotById();
    expect(prev.get('u_1276747')?.location).toEqual({ latitude: 48.71732, longitude: 21.26108 });
    expect(prev.get('u_1276747')?.id).toBe('u_1276747');
  });
});
