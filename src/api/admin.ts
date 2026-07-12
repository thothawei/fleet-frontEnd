import { api } from './client';

// ---- 型別（對齊 line-fleet-dispatch 的 handler/admin.go 回應）----

export interface LoginResp {
  admin_id: number;
  name: string;
  token: string;
  role: string;
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
  CreatedAt: string; // 後端回傳的 ISO 時間字串；缺值為空字串
  UpdatedAt: string;
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
  // 金額欄位（分），後端 F5 起提供；顯示時除 100。
  total_revenue_cents: number;
  total_commission_cents: number;
  driver_net_cents: number;
}

// 月營運報表每司機一列（後端 F6）。金額欄位為「分」。
export interface MonthlyReportRow {
  driver_id: number;
  driver_name: string;
  trip_count: number;
  total_revenue_cents: number;
  total_commission_cents: number;
  driver_net_cents: number;
  membership_fee_cents: number;
  owed_to_hq_cents: number; // 應付總公司 = 手續費 + 月會費
}

// 費率設定（後端 F1/F4）。金額為「分」，手續費為基點 bps（1500 = 15%）。
export interface FeeSettings {
  base_fare_cents: number;
  per_km_fare_cents: number;
  min_fare_cents: number;
  commission_bps: number;
  monthly_membership_fee_cents: number;
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

/** 訂單狀態審計（對齊後端 ride_events / D4） */
export interface RideEvent {
  id: number;
  ride_id: number;
  from_status: number | null;
  to_status: number;
  event_type: string;
  actor_role: string;
  actor_id: number | null;
  note: string;
  created_at: string;
}

export interface RideDetail {
  ride: RideFull;
  track_geojson: string;
  events: RideEvent[];
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
  const { data } = await api.get<{ drivers: Record<string, unknown>[] }>('/admin/drivers');
  return (data.drivers ?? []).map(normalizeDriver);
}

/** 兼容後端 PascalCase / snake_case */
export function normalizeDriver(raw: Record<string, unknown>): Driver {
  return {
    ID: num(raw, 'ID', 'id'),
    LineUserID: str(raw, 'LineUserID', 'line_user_id'),
    Name: str(raw, 'Name', 'name'),
    Phone: str(raw, 'Phone', 'phone'),
    Status: num(raw, 'Status', 'status'),
    CreatedAt: str(raw, 'CreatedAt', 'created_at'),
    UpdatedAt: str(raw, 'UpdatedAt', 'updated_at'),
  };
}

export interface RideListFilter {
  status?: number;
  limit?: number;
  offset?: number;
  from?: string; // YYYY-MM-DD，篩 requested_at
  to?: string;
  q?: string; // 上車點地址／訂單 ID 關鍵字
}

export interface RideListResult {
  rides: RideRow[];
  total: number; // 符合條件的總筆數（不受 limit/offset 影響）
  limit: number;
  offset: number;
}

/** 伺服器端分頁查詢訂單：後端 `/admin/rides` 支援 status／日期區間／關鍵字／offset，回應帶 total。 */
export async function fetchRides(filter: RideListFilter = {}): Promise<RideListResult> {
  const params: Record<string, string | number> = {};
  if (filter.status !== undefined) params.status = filter.status;
  if (filter.limit !== undefined) params.limit = filter.limit;
  if (filter.offset !== undefined) params.offset = filter.offset;
  if (filter.from) params.from = filter.from;
  if (filter.to) params.to = filter.to;
  if (filter.q) params.q = filter.q;
  const { data } = await api.get<{
    rides: RideRow[];
    total: number;
    limit: number;
    offset: number;
  }>('/admin/rides', { params });
  return {
    rides: data.rides ?? [],
    total: data.total ?? 0,
    limit: data.limit ?? filter.limit ?? 100,
    offset: data.offset ?? filter.offset ?? 0,
  };
}

export async function fetchRideDetail(id: number): Promise<RideDetail> {
  const { data } = await api.get<{
    ride: Record<string, unknown>;
    track_geojson: string;
    events?: Record<string, unknown>[];
  }>(`/admin/rides/${id}`);
  return {
    ride: normalizeRide(data.ride),
    track_geojson: data.track_geojson,
    events: (data.events ?? []).map(normalizeRideEvent),
  };
}

/** 兼容 PascalCase / snake_case（與 normalizeRide 相同策略） */
export function normalizeRideEvent(raw: Record<string, unknown>): RideEvent {
  return {
    id: num(raw, 'id', 'ID'),
    ride_id: num(raw, 'ride_id', 'RideID'),
    from_status: nullableNum(raw, 'from_status', 'FromStatus'),
    to_status: num(raw, 'to_status', 'ToStatus'),
    event_type: str(raw, 'event_type', 'EventType'),
    actor_role: str(raw, 'actor_role', 'ActorRole'),
    actor_id: nullableNum(raw, 'actor_id', 'ActorID'),
    note: str(raw, 'note', 'Note'),
    created_at: str(raw, 'created_at', 'CreatedAt'),
  };
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

export async function fetchMonthlyReport(month: string): Promise<MonthlyReportRow[]> {
  const { data } = await api.get<{ drivers: MonthlyReportRow[] }>('/admin/reports/monthly', {
    params: { month },
  });
  return data.drivers ?? [];
}

// ---- 會費帳單（F8）----

export interface MembershipInvoice {
  id: number;
  driver_id: number;
  driver_name: string;
  period: string; // YYYY-MM
  amount_cents: number;
  status: 'unpaid' | 'paid';
  paid_at: string | null;
}

/** 會費帳單列表（viewer）；status 省略為全部。 */
export async function fetchMembershipInvoices(
  month: string,
  status?: 'paid' | 'unpaid',
): Promise<MembershipInvoice[]> {
  const params: Record<string, string> = { month };
  if (status) params.status = status;
  const { data } = await api.get<{ invoices: MembershipInvoice[] }>('/admin/membership-invoices', {
    params,
  });
  return data.invoices ?? [];
}

/** 產生當月會費帳單（superadmin，冪等）；回傳新開張數與金額（分）。 */
export async function generateMembershipInvoices(
  month: string,
): Promise<{ created: number; amount_cents: number }> {
  const { data } = await api.post<{ month: string; created: number; amount_cents: number }>(
    '/admin/membership-invoices/generate',
    null,
    { params: { month } },
  );
  return { created: data.created, amount_cents: data.amount_cents };
}

/** 標記帳單已繳/未繳（superadmin）。 */
export async function setMembershipInvoicePaid(id: number, paid: boolean): Promise<void> {
  await api.patch(`/admin/membership-invoices/${id}`, { paid });
}

export async function fetchFeeSettings(): Promise<FeeSettings> {
  const { data } = await api.get<FeeSettings>('/admin/settings/fees');
  return data;
}

export async function updateFeeSettings(body: Partial<FeeSettings>): Promise<FeeSettings> {
  const { data } = await api.put<FeeSettings>('/admin/settings/fees', body);
  return data;
}

export interface DispatchSettings {
  radius_m: number;
  max_drivers: number;
  offer_timeout_sec: number;
  max_attempts: number;
  rate_limit_per_min: number;
}

export async function patchDriverStatus(id: number, enabled: boolean): Promise<Driver> {
  const { data } = await api.patch<{ driver: Driver }>(`/admin/drivers/${id}/status`, { enabled });
  return data.driver;
}

export async function fetchDispatchSettings(): Promise<DispatchSettings> {
  const { data } = await api.get<DispatchSettings>('/admin/settings/dispatch');
  return data;
}

export async function updateDispatchSettings(
  body: Partial<DispatchSettings>,
): Promise<DispatchSettings> {
  const { data } = await api.put<DispatchSettings>('/admin/settings/dispatch', body);
  return data;
}

export async function cancelRideByAdmin(id: number): Promise<string> {
  const { data } = await api.post<{ message: string }>(`/admin/rides/${id}/cancel`);
  return data.message;
}

// ---- RBAC 帳號管理（D6）----

export type AdminUser = {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export async function fetchMe(): Promise<{ id: number; username: string; role: string }> {
  const { data } = await api.get('/admin/me');
  return data as { id: number; username: string; role: string };
}

export async function listAdmins(): Promise<AdminUser[]> {
  const { data } = await api.get('/admin/admins');
  return data.admins as AdminUser[];
}

export async function createAdmin(input: {
  username: string;
  password: string;
  role: string;
}): Promise<void> {
  await api.post('/admin/admins', input);
}

export async function updateAdmin(
  id: number,
  patch: { role?: string; password?: string; is_active?: boolean },
): Promise<void> {
  await api.patch(`/admin/admins/${id}`, patch);
}
