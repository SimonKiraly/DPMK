/**
 * In-memory latest MHD fleet state.
 *
 * The poller writes it; `/api/vehicles` reads it (zero upstream calls per
 * request). Survives Ubian outages by keeping the last good vehicle list and
 * exposing `stale` / `warmingUp` / `lastError` so clients can react.
 */
import { config } from '../config.js';
import type { FleetSnapshot, Vehicle } from '../types.js';

class FleetStore {
  private vehicles: Vehicle[] = [];
  private updatedAtMs: number | null = null;
  private lastOkAtMs: number | null = null;
  private lastError: string | null = null;
  /**
   * Wall-clock of the most recent `/api/vehicles` request — drives idle-stop.
   * Seeded to boot time so the poller runs for one `idleStopMs` window after
   * startup even before the first client connects.
   */
  private lastDemandMs = Date.now();

  /** Store a successful poll result. */
  setVehicles(vehicles: Vehicle[]): void {
    this.vehicles = vehicles;
    this.updatedAtMs = Date.now();
    this.lastOkAtMs = this.updatedAtMs;
    this.lastError = null;
  }

  /** Record a failed poll — the previous vehicle list is kept as-is. */
  markError(message: string): void {
    this.lastError = message;
  }

  /** Called by the vehicles route on every request. */
  touchDemand(): void {
    this.lastDemandMs = Date.now();
  }

  msSinceDemand(): number {
    return Date.now() - this.lastDemandMs;
  }

  hasData(): boolean {
    return this.updatedAtMs !== null;
  }

  ageMs(): number {
    return this.updatedAtMs === null ? Infinity : Date.now() - this.updatedAtMs;
  }

  /**
   * The current fleet keyed by `Vehicle.id`, handed to the next poll so it can
   * derive heading from the position delta and retain the last heading for
   * vehicles Ubian has not moved yet.
   */
  snapshotById(): Map<string, Vehicle> {
    return new Map(this.vehicles.map((v) => [v.id, v]));
  }

  findVehicle(id: string): Vehicle | undefined {
    return this.vehicles.find((v) => v.id === id);
  }

  read(): FleetSnapshot {
    const age = this.ageMs();
    return {
      vehicles: this.vehicles,
      updatedAt: this.updatedAtMs ? new Date(this.updatedAtMs).toISOString() : null,
      ageMs: age,
      stale: this.updatedAtMs !== null && age > config.poller.staleAfterMs,
      warmingUp: this.updatedAtMs === null,
      lastError: this.lastError,
    };
  }

  health() {
    return {
      fleetCount: this.vehicles.length,
      updatedAt: this.updatedAtMs ? new Date(this.updatedAtMs).toISOString() : null,
      lastOkAt: this.lastOkAtMs ? new Date(this.lastOkAtMs).toISOString() : null,
      ageMs: this.ageMs(),
      lastError: this.lastError,
    };
  }

  /** Test helper. */
  _reset(): void {
    this.vehicles = [];
    this.updatedAtMs = null;
    this.lastOkAtMs = null;
    this.lastError = null;
    this.lastDemandMs = Date.now();
  }
}

export const fleet = new FleetStore();
