import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  classifyUbianLine,
  isKosiceMhdLine,
  toMhdMode,
} from '../src/ubian/mhdFilter.js';
import type { UbianLine, UbianVehicleRaw } from '../src/ubian/types.js';

const fx = (name: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8'),
  );

const synthetic = fx('vehicles-nearby.synthetic.json') as { vehicles: UbianVehicleRaw[] };
const live = fx('vehicles-nearby.live.json') as { vehicles: UbianVehicleRaw[] };

const lineOf = (v: UbianVehicleRaw): UbianLine => v.timeTableTrip.timeTableLine;

describe('isKosiceMhdLine — urban AND the Košice operator', () => {
  it('keeps DPMK Košice lines (ezIsUrban === true && firmaID === 1000)', () => {
    const dpmk = synthetic.vehicles.filter(
      (v) => lineOf(v).supervisorName === 'Dopravný podnik mesta Košice a.s.',
    );
    expect(dpmk.length).toBeGreaterThan(0);
    for (const v of dpmk) {
      const line = lineOf(v);
      if (line.ezIsUrban === true) {
        expect(line.firmaID).toBe(1000);
        expect(isKosiceMhdLine(line)).toBe(true);
      }
    }
  });

  it('rejects regional / suburban / intercity / rail (ezIsUrban === false)', () => {
    const regionalNames = ['eurobus', 'ARRIVA Michalovce', 'ŽSSK a.s.'];
    const regional = synthetic.vehicles.filter((v) =>
      regionalNames.includes(lineOf(v).supervisorName ?? ''),
    );
    expect(regional.length).toBeGreaterThan(0);
    for (const v of regional) expect(isKosiceMhdLine(lineOf(v))).toBe(false);
  });

  it('rejects DPMP Prešov — another city, ezIsUrban:true but firmaID 1030', () => {
    const presov = synthetic.vehicles.find((v) => lineOf(v).supervisorName === 'DPMP Prešov');
    expect(presov).toBeDefined();
    expect(lineOf(presov!).ezIsUrban).toBe(true); // it IS urban transport…
    expect(lineOf(presov!).firmaID).toBe(1030); // …just not Košice's
    expect(isKosiceMhdLine(lineOf(presov!))).toBe(false);
    expect(toMhdMode(lineOf(presov!))).toBeNull();
  });

  it('is strict — a line with the ezIsUrban flag absent is NOT treated as MHD', () => {
    const flagless = synthetic.vehicles.find((v) => lineOf(v).ezIsUrban === undefined);
    expect(flagless).toBeDefined();
    expect(isKosiceMhdLine(lineOf(flagless!))).toBe(false);
    expect(toMhdMode(lineOf(flagless!))).toBeNull();
  });
});

describe('classifyUbianLine', () => {
  it('classifies tram / bus / night / train from the raw line', () => {
    const byLine = Object.fromEntries(
      synthetic.vehicles.map((v) => [lineOf(v).line, classifyUbianLine(lineOf(v))]),
    );
    expect(byLine['6']).toBe('tram');
    expect(byLine['1']).toBe('tram');
    expect(byLine['71']).toBe('bus');
    expect(byLine['N1']).toBe('night');
    expect(byLine['Os 6432']).toBe('train');
    expect(byLine['Ex 525']).toBe('train');
  });
});

describe('toMhdMode', () => {
  it('maps MHD lines to bus / tram / night, everything else to null', () => {
    const result = synthetic.vehicles.map((v) => ({
      line: lineOf(v).line,
      op: lineOf(v).supervisorName,
      mode: toMhdMode(lineOf(v)),
    }));

    // MHD → a mode
    expect(result.find((r) => r.line === '6')!.mode).toBe('tram');
    expect(result.find((r) => r.line === '71')!.mode).toBe('bus');
    expect(result.find((r) => r.line === 'N1')!.mode).toBe('night');

    // non-MHD → null
    for (const r of result) {
      if (r.op === 'eurobus' || r.op === 'ARRIVA Michalovce' || r.op === 'ŽSSK a.s.') {
        expect(r.mode).toBeNull();
      }
    }
  });

  it('only maps lines that are BOTH urban and firmaID 1000 in the live capture', () => {
    for (const v of live.vehicles) {
      const line = lineOf(v);
      const mode = toMhdMode(line);
      if (mode !== null) {
        expect(line.ezIsUrban).toBe(true);
        expect(line.firmaID).toBe(1000);
      }
    }
  });
});
