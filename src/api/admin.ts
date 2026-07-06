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

export interface RideDetail {
  ride: Record<string, unknown>;
  track_geojson: string;
}

// ---- 端點 ----

export async function login(email: string, password: string): Promise<LoginResp> {
  const { data } = await api.post<LoginResp>('/admin/login', { email, password });
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
