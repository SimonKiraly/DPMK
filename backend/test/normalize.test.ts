import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { bearingDeg } from '../src/lib/geo.js';
import {
  mapDepartures,
  mapStop,
  normalizeNearbyStops,
  normalizeVehicles,
} from '../src/ubian/normalize.js';
import type {
  UbianDepartureRaw,
  UbianStop,
  UbianVehicleRaw,
} from '../src/ubian/types.js';
import type { Vehicle } from '../src/types.js';

const fx = (name: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8'),
  );

const synthetic = fx('vehicles-nearby.synthetic.json') as { vehicles: UbianVehicleRaw[] };
const live = fx('vehicles-nearby.live.json') as { vehicles: UbianVehicleRaw[] };
const stopsFx = fx('stops-nearby.json') as { stops: UbianStop[] };

describe('normalizeVehicles — synthetic fixture (known composition)', () => {
  const r = normalizeVehicles(synthetic.vehicles);

  it('returns only MHD vehicles: 5 (2 tram, 2 bus, 1 night)', () => {
    expect(r.vehicles).toHaveLength(5);
    const byMode = r.vehicles.reduce<Record<string, number>>((a, v) => {
      a[v.mode] = (a[v.mode] ?? 0) + 1;
      return a;
    }, {});
    expect(byMode).toEqual({ tram: 2, bus: 2, night: 1 });
  });

  it('drops 5 non-MHD carriers + 1 flag-absent + 1 DPMP Prešov (droppedNonMhd = 7)', () => {
    expect(r.droppedNonMhd).toBe(7);
  });

  it('deduplicates by vehicleID (droppedDuplicate = 1)', () => {
    expect(r.droppedDuplicate).toBe(1);
    const ids = r.vehicles.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drops canceled trips and zero-position vehicles before classification', () => {
    // 15 raw − 1 canceled − 1 zero-position = 13 candidates
    expect(r.rawCount).toBe(15);
    expect(r.candidateCount).toBe(13);
    expect(r.vehicles.some((v) => v.routeShortName === '12')).toBe(false); // canceled
    expect(r.vehicles.some((v) => v.routeShortName === '3')).toBe(false); // no position
  });

  it('never exposes eurobus / ARRIVA / ŽSSK / DPMP Prešov', () => {
    for (const v of r.vehicles) {
      expect(v.routeShortName).not.toMatch(/^\d{6}$/); // 6-digit regional codes
      expect(v.routeShortName).not.toMatch(/^(Os|Ex|R|EN|REX)\s/); // rail labels
      expect(v.operatorId).toBe(18024); // Košice DPMK only — not 17071 (Prešov) etc.
    }
  });

  it('normalizes to the app Vehicle shape', () => {
    const v = r.vehicles.find((x) => x.routeShortName === '6')!;
    expect(v).toMatchObject({
      id: 'u_1276747',
      routeShortName: '6',
      routeId: 'ubian_1000013620',
      mode: 'tram',
      source: 'live',
      tripId: '1003243321',
      plate: '1276747',
      atStop: true,
    });
    expect(v.location).toEqual({ latitude: 48.71732, longitude: 21.26108 });
    expect(v.direction).toBe(0);
  });

  it('maps ezTripDirection "back" to direction 1', () => {
    const v = r.vehicles.find((x) => x.routeShortName === '1')!;
    expect(v.direction).toBe(1);
  });
});

describe('normalizeVehicles — bearing from position deltas', () => {
  const prevWith = (id: string, location: { latitude: number; longitude: number }, bearing: number) =>
    new Map<string, Vehicle>([[id, { id, location, bearing } as Vehicle]]);

  it('is 0 on the first sighting, then the heading of the move', () => {
    const first = normalizeVehicles(synthetic.vehicles);
    const bus = first.vehicles.find((v) => v.id === 'u_1276481')!;
    expect(bus.bearing).toBe(0);

    const prev = prevWith('u_1276481', { latitude: 48.72095, longitude: 21.26335 }, 0);
    const moved = synthetic.vehicles.map((v) =>
      v.vehicleID === 1276481 && !v.tooltip.startsWith('duplicate')
        ? { ...v, latitude: 48.72200, longitude: 21.26500 }
        : v,
    );
    const next = normalizeVehicles(moved, prev);
    const bus2 = next.vehicles.find((v) => v.id === 'u_1276481')!;
    const expected = bearingDeg(
      { latitude: 48.72095, longitude: 21.26335 },
      { latitude: 48.722, longitude: 21.265 },
    );
    expect(bus2.bearing).toBeCloseTo(expected, 6);
    expect(bus2.bearing).not.toBe(0);
  });

  it('retains the last heading when Ubian has not moved the vehicle yet', () => {
    // Ubian refreshes positions in ~50 s bursts; most polls see an identical
    // position. The heading from the last real move must not be reset to 0.
    const bus = synthetic.vehicles.find(
      (v) => v.vehicleID === 1276481 && !v.tooltip.startsWith('duplicate'),
    )!;
    const prev = prevWith(
      'u_1276481',
      { latitude: bus.latitude, longitude: bus.longitude },
      137.5,
    );
    const again = normalizeVehicles(synthetic.vehicles, prev);
    const bus2 = again.vehicles.find((v) => v.id === 'u_1276481')!;
    expect(bus2.location).toEqual({ latitude: bus.latitude, longitude: bus.longitude });
    expect(bus2.bearing).toBe(137.5); // unchanged position → keep heading
  });
});

describe('normalizeVehicles — live capture (properties, not counts)', () => {
  const r = normalizeVehicles(live.vehicles);

  it('output ⊆ input and every output id is unique', () => {
    expect(r.vehicles.length).toBeLessThanOrEqual(live.vehicles.length);
    const ids = r.vehicles.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains ZERO non-MHD vehicles (Košice DPMK only)', () => {
    const kosiceVehicleIds = new Set(
      live.vehicles
        .filter(
          (v) =>
            v.timeTableTrip.timeTableLine.ezIsUrban === true &&
            v.timeTableTrip.timeTableLine.firmaID === 1000,
        )
        .map((v) => `u_${v.vehicleID}`),
    );
    for (const v of r.vehicles) {
      expect(kosiceVehicleIds.has(v.id)).toBe(true);
      expect(v.operatorId).toBe(18024);
    }
  });

  it('every vehicle has a valid Košice-area position and a known mode', () => {
    for (const v of r.vehicles) {
      expect(['bus', 'tram', 'night']).toContain(v.mode);
      expect(v.location.latitude).toBeGreaterThan(48.5);
      expect(v.location.latitude).toBeLessThan(48.9);
      expect(v.location.longitude).toBeGreaterThan(21.0);
      expect(v.location.longitude).toBeLessThan(21.5);
    }
  });
});

describe('mapStop / normalizeNearbyStops', () => {
  it('derives the coordinate from platforms when the stop-level coord is null', () => {
    const withNullCoord = stopsFx.stops.find((s) => s.latitude == null && s.platforms.length > 0);
    if (withNullCoord) {
      const mapped = mapStop(withNullCoord);
      expect(mapped.location.latitude).toBeGreaterThan(48.5);
      expect(mapped.location.longitude).toBeGreaterThan(21.0);
    }
  });

  it('keeps only MHD line labels (rejects 6-digit regional codes)', () => {
    for (const raw of stopsFx.stops) {
      const mapped = mapStop(raw);
      for (const l of mapped.lines) expect(l).not.toMatch(/^\d{6}$/);
    }
  });

  it('normalizeNearbyStops filters non-urban stops and sorts by distance', () => {
    const origin = { latitude: 48.7204, longitude: 21.2577 };
    const near = normalizeNearbyStops(stopsFx.stops, origin, 5000, 20);
    for (const n of near) expect(n.distanceMeters).toBeGreaterThanOrEqual(0);
    const distances = near.map((n) => n.distanceMeters);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });
});

describe('mapDepartures', () => {
  it('drops non-MHD departures and sorts by inMinutes', () => {
    const now = Date.UTC(2026, 8, 1, 10, 0, 0);
    const base = (line: Partial<UbianDepartureRaw['timeTableTrip']['timeTableLine']>, tsOffsetMin: number): UbianDepartureRaw => ({
      timeTableTrip: {
        tripID: 1,
        destinationStopName: 'X',
        ezTripDirection: 'there',
        lowFloor: false,
        canceled: false,
        timeTableLine: {
          lineID: 1,
          lineType: 1,
          line: '6',
          lineNumber: 6,
          lineName: '',
          ezLineType: 'tram',
          ezVehicleType: 'TRAM',
          firmaID: 1000,
          ezIsUrban: true,
          ...line,
        } as UbianDepartureRaw['timeTableTrip']['timeTableLine'],
      },
      plannedDepartureTimestamp: Math.round(now / 1000) + tsOffsetMin * 60,
      delayMinutes: 0,
      platformNumber: 1,
      plannedOrRealVehicleID: null,
    });

    const list: UbianDepartureRaw[] = [
      base({ line: '6', ezIsUrban: true }, 8),
      base({ line: '2', ezIsUrban: true }, 3),
      base({ line: '802446', ezIsUrban: false, ezLineType: 'bus', firmaID: 1001 }, 1),
      base({ line: 'Os 6432', ezIsUrban: false, ezLineType: 'train', ezIsTrain: true, firmaID: 950 }, 2),
    ];
    const out = mapDepartures(list, 10, now);
    expect(out).toHaveLength(2);
    expect(out.map((d) => d.routeShortName)).toEqual(['2', '6']);
    expect(out[0]!.inMinutes).toBe(3);
  });
});
