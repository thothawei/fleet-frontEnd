import { api } from './client';

// ---- 型別（對齊 line-fleet-dispatch 的 handler/admin.go 回應）----

export interface LoginResp {
  admin_id: number;
  name: string;
  token: string;
}

export interface DriverLoc {
  driver_id: number;
  lat: number;
  lng: number;
  updated_at: number;
}

export interface Driver {
  ID: number;
  LineUserID: string;
  Name: string;
  Phone: string;
  Status: number; // 0=離線 1=待命 2=載客中
}

export interface RideRow {
  id: number;
  customer_id: number;
  driver_id: number | null;
  status: number; // 0 REQUESTED 1 ASSIGNED 2 ACCEPTED 3 PICKED_UP 4 COMPLETED 9 CANCELLED
  pickup_address: string;
  requested_at: string;
  completed_at: string | null;
  distance_m: number | null;
}

export interface DailyReportRow {
  driver_id: number;
  driver_name: string;
  trip_count: number;
  total_distance_m: number;
  avg_pickup_sec: number;
}

// 對齊後端 model.GeoPoint（2026-07-08 後端補了 json tag，欄位改 snake_case）
export interface GeoPoint {
  lat: number;
  lng: number;
}

// 對齊後端 model.Ride（2026-07-08 後端 b226f34 補了 json tag，
// GetByID 序列化輸出改為 snake_case，與 RideRow 用的 AdminRideRow 一致）
export interface RideFull {
  id: number;
  customer_id: number;
  driver_id: number | null;
  status: number;
  pickup_point: GeoPoint;
  pickup_address: string;
  dropoff_point: GeoPoint | null;
  dropoff_address: string;
  requested_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  distance_m: number | null;
  eta_pickup_sec: number | null;
  created_at: string;
  updated_at: string;
}

export interface RideDetail {
  ride: RideFull;
  track_geojson: string;
}

// 軌跡 GeoJSON：admin 端點回傳裸 LineString；司機/乘客端點包成 Feature
export type RideTrackGeoJSON =
  | {
      type: 'Feature';
      properties: { ride_id: number };
      geometry: { type: 'LineString'; coordinates: [number, number][] };
    }
  | { type: 'LineString'; coordinates: [number, number][] };

/** 從 track_geojson 字串取出 [lng, lat] 座標陣列（兼容 LineString / Feature） */
export function parseTrackCoordinates(trackGeojson: string): [number, number][] {
  try {
    const parsed = JSON.parse(trackGeojson) as RideTrackGeoJSON;
    if (parsed.type === 'Feature') return parsed.geometry.coordinates ?? [];
    if (parsed.type === 'LineString') return parsed.coordinates ?? [];
  } catch {
    /* 無效 JSON */
  }
  return [];
}

// ---- 端點 ----

export async function login(username: string, password: string): Promise<LoginResp> {
  const { data } = await api.post<LoginResp>('/admin/login', { username, password });
  return data;
}

export async function fetchFleet(): Promise<DriverLoc[]> {
  const { data } = await api.get<{ drivers: DriverLoc[] }>('/admin/fleet');
  return data.drivers ?? [];
}

export async function fetchDrivers(): Promise<Driver[]> {
  const { data } = await api.get<{ drivers: Driver[] }>('/admin/drivers');
  return data.drivers ?? [];
}

export async function fetchRides(status?: number, limit = 100): Promise<RideRow[]> {
  const params: Record<string, number> = { limit };
  if (status !== undefined) params.status = status;
  const { data } = await api.get<{ rides: RideRow[] }>('/admin/rides', { params });
  return data.rides ?? [];
}

export async function fetchRideDetail(id: number): Promise<RideDetail> {
  const { data } = await api.get<{ ride: Record<string, unknown>; track_geojson: string }>(
    `/admin/rides/${id}`,
  );
  return { ride: normalizeRide(data.ride), track_geojson: data.track_geojson };
}

/** 兼容 b226f34 前後端 PascalCase / snake_case 混用 */
function normalizeRide(raw: Record<string, unknown>): RideFull {
  const pp = (raw.pickup_point ?? raw.PickupPoint) as Record<string, number> | undefined;
  const dp = (raw.dropoff_point ?? raw.DropoffPoint) as Record<string, number> | null | undefined;
  return {
    id: num(raw, 'id', 'ID'),
    customer_id: num(raw, 'customer_id', 'CustomerID'),
    driver_id: nullableNum(raw, 'driver_id', 'DriverID'),
    status: num(raw, 'status', 'Status'),
    pickup_point: { lat: pp?.lat ?? pp?.Lat ?? 0, lng: pp?.lng ?? pp?.Lng ?? 0 },
    pickup_address: str(raw, 'pickup_address', 'PickupAddress'),
    dropoff_point: dp
      ? { lat: dp.lat ?? dp.Lat ?? 0, lng: dp.lng ?? dp.Lng ?? 0 }
      : null,
    dropoff_address: str(raw, 'dropoff_address', 'DropoffAddress'),
    requested_at: str(raw, 'requested_at', 'RequestedAt'),
    accepted_at: nullableStr(raw, 'accepted_at', 'AcceptedAt'),
    picked_up_at: nullableStr(raw, 'picked_up_at', 'PickedUpAt'),
    completed_at: nullableStr(raw, 'completed_at', 'CompletedAt'),
    distance_m: nullableNum(raw, 'distance_m', 'DistanceM'),
    eta_pickup_sec: nullableNum(raw, 'eta_pickup_sec', 'EtaPickupSec'),
    created_at: str(raw, 'created_at', 'CreatedAt'),
    updated_at: str(raw, 'updated_at', 'UpdatedAt'),
  };
}

function pick<T>(raw: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null) return raw[k] as T;
  }
  return undefined;
}

function num(raw: Record<string, unknown>, ...keys: string[]): number {
  return Number(pick(raw, ...keys) ?? 0);
}

function nullableNum(raw: Record<string, unknown>, ...keys: string[]): number | null {
  const v = pick<number>(raw, ...keys);
  return v === undefined ? null : v;
}

function str(raw: Record<string, unknown>, ...keys: string[]): string {
  return String(pick(raw, ...keys) ?? '');
}

function nullableStr(raw: Record<string, unknown>, ...keys: string[]): string | null {
  const v = pick<string>(raw, ...keys);
  return v === undefined ? null : v;
}

export async function fetchDailyReport(date: string): Promise<DailyReportRow[]> {
  const { data } = await api.get<{ drivers: DailyReportRow[] }>('/admin/reports/daily', {
    params: { date },
  });
  return data.drivers ?? [];
}
