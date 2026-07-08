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

// 對齊後端 model.GeoPoint（無 json tag，欄位名維持 Go 大寫）
export interface GeoPoint {
  Lat: number;
  Lng: number;
}

// 對齊後端 model.Ride（GetByID 直接序列化 struct，欄位名維持 Go 大寫，
// 與 RideRow 用的 AdminRideRow snake_case 不同，這是後端既有行為，非本次修改範圍）
export interface RideFull {
  ID: number;
  CustomerID: number;
  DriverID: number | null;
  Status: number;
  PickupPoint: GeoPoint;
  PickupAddress: string;
  DropoffPoint: GeoPoint | null;
  DropoffAddress: string;
  RequestedAt: string;
  AcceptedAt: string | null;
  PickedUpAt: string | null;
  CompletedAt: string | null;
  DistanceM: number | null;
  EtaPickupSec: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface RideDetail {
  ride: RideFull;
  track_geojson: string;
}

// 軌跡 GeoJSON（GET /api/admin/rides/:id 回傳的 track_geojson 字串 parse 後的形狀）
export interface RideTrackGeoJSON {
  type: 'Feature';
  properties: { ride_id: number };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
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
  const { data } = await api.get<RideDetail>(`/admin/rides/${id}`);
  return data;
}

export async function fetchDailyReport(date: string): Promise<DailyReportRow[]> {
  const { data } = await api.get<{ drivers: DailyReportRow[] }>('/admin/reports/daily', {
    params: { date },
  });
  return data.drivers ?? [];
}
