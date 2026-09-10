import { backendApi } from '@/constants/config';
import type { ServiceAlert, Vehicle, VehicleDetail } from '@/types';

/**
 * Client for the MHD Košice backend (Railway).
 *
 *   iPhone app ──HTTPS──▶ backend ──▶ Ubian
 *
 * The backend is authoritative: it already filters to Košice MHD
 * (`line.ezIsUrban === true && line.firmaID === 1000`), de-duplicates, derives
 * bearing and normalises every vehicle to the app's `Vehicle` shape, then keeps
 * an in-memory snapshot. So the app just asks for the current data — it applies
 * NO filter of its own and keeps NO cache here (`I)`/`J)` of the migration).
 *
 * Every call: `AbortController` timeout, HTTP-status check, safe JSON parse and
 * a light shape check. On any problem it throws `ApiError`; the caller
 * (`transportService`) catches and falls back to the existing Ubian / sim path.
 * Nothing here can crash the app.
 */

export class ApiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

/** `GET /api/vehicles` envelope — see `backend/src/routes/vehicles.ts`. */
interface VehiclesResponse {
  vehicles: Vehicle[];
  count: number;
  updatedAt: string | null;
  ageMs: number | null;
  stale: boolean;
  warmingUp: boolean;
  source: string;
}

/** `GET /api/vehicles/:id` envelope. */
interface VehicleDetailResponse {
  vehicle: VehicleDetail;
  updatedAt: string | null;
}

/** `GET /api/alerts` envelope — see `backend/src/routes/alerts.ts`. */
interface AlertsResponse {
  alerts: ServiceAlert[];
  count: number;
  updatedAt: string | null;
  ageMs: number | null;
  stale: boolean;
  warmingUp: boolean;
  source: string;
}

/** `GET /api/alerts/:id` envelope. */
interface AlertResponse {
  alert: ServiceAlert;
  updatedAt: string | null;
}

async function apiGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), backendApi.requestTimeoutMs);
  try {
    const res = await fetch(`${backendApi.baseUrl}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (controller.signal.aborted) {
      throw new ApiError(`timeout after ${backendApi.requestTimeoutMs} ms`, err);
    }
    if (err instanceof SyntaxError) throw new ApiError('invalid JSON from backend', err);
    throw new ApiError('network request failed', err);
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeVehicle(v: unknown): v is Vehicle {
  if (v == null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.routeShortName === 'string' &&
    typeof o.mode === 'string' &&
    o.location != null &&
    typeof (o.location as Record<string, unknown>).latitude === 'number' &&
    typeof (o.location as Record<string, unknown>).longitude === 'number'
  );
}

function looksLikeAlert(a: unknown): a is ServiceAlert {
  if (a == null || typeof a !== 'object') return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.type === 'string' &&
    typeof o.status === 'string' &&
    typeof o.description === 'string' &&
    Array.isArray(o.affectedRoutes) &&
    Array.isArray(o.affectedStops)
  );
}

export const apiClient = {
  get baseUrl(): string {
    return backendApi.baseUrl;
  },
  get enabled(): boolean {
    return backendApi.enabled;
  },

  /**
   * Current MHD fleet from the backend snapshot, already in the app's `Vehicle`
   * shape. Throws `ApiError` on network / HTTP / JSON / shape failure.
   */
  async fetchVehicles(): Promise<Vehicle[]> {
    const data = await apiGet<VehiclesResponse>('/api/vehicles');
    if (data == null || !Array.isArray(data.vehicles) || !data.vehicles.every(looksLikeVehicle)) {
      throw new ApiError('unexpected /api/vehicles response shape');
    }
    return data.vehicles;
  },

  /**
   * One vehicle plus its stop timeline. Throws `ApiError` on failure or 404
   * (e.g. the vehicle left the fleet between the list poll and the tap).
   */
  async fetchVehicleDetail(vehicleId: string): Promise<VehicleDetail> {
    const data = await apiGet<VehicleDetailResponse>(
      `/api/vehicles/${encodeURIComponent(vehicleId)}`,
    );
    if (data == null || !looksLikeVehicle(data.vehicle)) {
      throw new ApiError('unexpected /api/vehicles/:id response shape');
    }
    return { ...data.vehicle, timeline: data.vehicle.timeline ?? [] };
  },

  /**
   * Current DPMK service alerts from the backend RSS pipeline. Defaults to
   * non-ended alerts. Throws `ApiError` on network / HTTP / JSON / shape failure.
   */
  async fetchAlerts(): Promise<ServiceAlert[]> {
    const data = await apiGet<AlertsResponse>('/api/alerts');
    if (data == null || !Array.isArray(data.alerts)) {
      throw new ApiError('unexpected /api/alerts response shape');
    }
    return data.alerts.filter(looksLikeAlert);
  },

  /**
   * One DPMK alert by id (the RSS `<guid>` number). Used as a fallback when a
   * detail screen is opened for an alert that is no longer in the list snapshot
   * (e.g. it just ended). Throws `ApiError` on failure or 404.
   */
  async fetchAlert(id: string): Promise<ServiceAlert> {
    const data = await apiGet<AlertResponse>(`/api/alerts/${encodeURIComponent(id)}`);
    if (data == null || !looksLikeAlert(data.alert)) {
      throw new ApiError('unexpected /api/alerts/:id response shape');
    }
    return data.alert;
  },

  /** Liveness probe. Never throws — returns `false` on any problem. */
  async health(): Promise<boolean> {
    try {
      const h = await apiGet<{ ok?: boolean }>('/api/health');
      return h?.ok === true;
    } catch {
      return false;
    }
  },
};
