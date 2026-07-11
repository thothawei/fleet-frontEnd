import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './client';
import {
  cancelRideByAdmin,
  createAdmin,
  fetchDispatchSettings,
  fetchFeeSettings,
  fetchMe,
  fetchMonthlyReport,
  fetchRideDetail,
  listAdmins,
  normalizeDriver,
  parseTrackCoordinates,
  patchDriverStatus,
  updateAdmin,
  updateDispatchSettings,
  updateFeeSettings,
} from './admin';

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

describe('parseTrackCoordinates', () => {
  it('解析 admin 端點回傳的裸 LineString', () => {
    const raw = JSON.stringify({
      type: 'LineString',
      coordinates: [
        [121.567, 25.035],
        [121.568, 25.036],
      ],
    });
    expect(parseTrackCoordinates(raw)).toEqual([
      [121.567, 25.035],
      [121.568, 25.036],
    ]);
  });

  it('解析 Feature 包裝格式', () => {
    const raw = JSON.stringify({
      type: 'Feature',
      properties: { ride_id: 1 },
      geometry: {
        type: 'LineString',
        coordinates: [[121.5, 25.0]],
      },
    });
    expect(parseTrackCoordinates(raw)).toEqual([[121.5, 25.0]]);
  });

  it('無效 JSON 回傳空陣列', () => {
    expect(parseTrackCoordinates('not-json')).toEqual([]);
  });
});

describe('normalizeDriver', () => {
  it('兼容 PascalCase 與 snake_case', () => {
    expect(
      normalizeDriver({
        ID: 1,
        LineUserID: 'line-1',
        Name: '司機A',
        Phone: '0912',
        Status: 1,
        CreatedAt: '2026-07-11T13:09:08+08:00',
        UpdatedAt: '2026-07-11T16:46:44+08:00',
      }),
    ).toEqual({
      ID: 1,
      LineUserID: 'line-1',
      Name: '司機A',
      Phone: '0912',
      Status: 1,
      CreatedAt: '2026-07-11T13:09:08+08:00',
      UpdatedAt: '2026-07-11T16:46:44+08:00',
    });

    expect(
      normalizeDriver({
        id: 2,
        line_user_id: 'line-2',
        name: '司機B',
        phone: '',
        status: 3,
        created_at: '2026-07-10T00:00:00Z',
        updated_at: '2026-07-10T01:00:00Z',
      }),
    ).toEqual({
      ID: 2,
      LineUserID: 'line-2',
      Name: '司機B',
      Phone: '',
      Status: 3,
      CreatedAt: '2026-07-10T00:00:00Z',
      UpdatedAt: '2026-07-10T01:00:00Z',
    });
  });

  it('缺時間欄位時回空字串', () => {
    const d = normalizeDriver({ ID: 3, LineUserID: 'l', Name: 'C', Phone: '', Status: 0 });
    expect(d.CreatedAt).toBe('');
    expect(d.UpdatedAt).toBe('');
  });
});

describe('fetchRideDetail', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('正規化 PascalCase ride 為 snake_case', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        ride: {
          ID: 1,
          CustomerID: 2,
          DriverID: 3,
          Status: 4,
          PickupPoint: { Lat: 25.034, Lng: 121.566 },
          PickupAddress: '台北101',
          DropoffPoint: null,
          DropoffAddress: '',
          RequestedAt: '2026-07-06T10:00:00+08:00',
          AcceptedAt: '2026-07-06T10:01:00+08:00',
          PickedUpAt: null,
          CompletedAt: '2026-07-06T10:30:00+08:00',
          DistanceM: 1200,
          EtaPickupSec: 100,
          CreatedAt: '2026-07-06T10:00:00+08:00',
          UpdatedAt: '2026-07-06T10:30:00+08:00',
        },
        track_geojson: '{"type":"LineString","coordinates":[[121.567,25.035]]}',
      },
    });

    const detail = await fetchRideDetail(1);

    expect(detail.ride.id).toBe(1);
    expect(detail.ride.customer_id).toBe(2);
    expect(detail.ride.status).toBe(4);
    expect(detail.ride.pickup_point).toEqual({ lat: 25.034, lng: 121.566 });
    expect(detail.ride.pickup_address).toBe('台北101');
    expect(parseTrackCoordinates(detail.track_geojson)).toHaveLength(1);
    expect(detail.events).toEqual([]);
  });

  it('正規化 events 並保留時間序', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        ride: {
          id: 3,
          customer_id: 1,
          driver_id: 2,
          status: 2,
          pickup_point: { lat: 25.0, lng: 121.5 },
          pickup_address: 'A',
          dropoff_point: null,
          dropoff_address: '',
          requested_at: '2026-07-08T10:00:00+08:00',
          accepted_at: '2026-07-08T10:01:00+08:00',
          picked_up_at: null,
          completed_at: null,
          distance_m: null,
          eta_pickup_sec: 60,
          created_at: '2026-07-08T10:00:00+08:00',
          updated_at: '2026-07-08T10:01:00+08:00',
        },
        track_geojson: '{"type":"LineString","coordinates":[]}',
        events: [
          {
            id: 1,
            ride_id: 3,
            from_status: null,
            to_status: 0,
            event_type: 'ride.requested',
            actor_role: 'customer',
            actor_id: 1,
            note: 'app',
            created_at: '2026-07-08T10:00:00+08:00',
          },
          {
            ID: 2,
            RideID: 3,
            FromStatus: 0,
            ToStatus: 1,
            EventType: 'ride.assigned',
            ActorRole: 'system',
            ActorID: null,
            Note: 'dispatch_offer',
            CreatedAt: '2026-07-08T10:00:05+08:00',
          },
        ],
      },
    });

    const detail = await fetchRideDetail(3);
    expect(detail.events).toHaveLength(2);
    expect(detail.events[0].event_type).toBe('ride.requested');
    expect(detail.events[0].from_status).toBeNull();
    expect(detail.events[1].event_type).toBe('ride.assigned');
    expect(detail.events[1].from_status).toBe(0);
    expect(detail.events[1].actor_role).toBe('system');
  });

  it('snake_case ride 原樣保留', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        ride: {
          id: 9,
          customer_id: 1,
          driver_id: null,
          status: 0,
          pickup_point: { lat: 25.0, lng: 121.5 },
          pickup_address: '測試',
          dropoff_point: null,
          dropoff_address: '',
          requested_at: '2026-07-06T10:00:00+08:00',
          accepted_at: null,
          picked_up_at: null,
          completed_at: null,
          distance_m: null,
          eta_pickup_sec: null,
          created_at: '2026-07-06T10:00:00+08:00',
          updated_at: '2026-07-06T10:00:00+08:00',
        },
        track_geojson: '{"type":"LineString","coordinates":[]}',
      },
    });

    const detail = await fetchRideDetail(9);
    expect(detail.ride.id).toBe(9);
    expect(detail.ride.pickup_address).toBe('測試');
  });
});

describe('P2 admin write APIs', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('patchDriverStatus', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { driver: { ID: 1, Name: 'A', Phone: '', LineUserID: 'U1', Status: 3 } },
    });
    const driver = await patchDriverStatus(1, false);
    expect(api.patch).toHaveBeenCalledWith('/admin/drivers/1/status', { enabled: false });
    expect(driver.Status).toBe(3);
  });

  it('fetchDispatchSettings', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { radius_m: 3000, max_drivers: 5, offer_timeout_sec: 20, max_attempts: 3, rate_limit_per_min: 5 },
    });
    const settings = await fetchDispatchSettings();
    expect(settings.radius_m).toBe(3000);
  });

  it('updateDispatchSettings', async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: { radius_m: 5000, max_drivers: 5, offer_timeout_sec: 20, max_attempts: 3, rate_limit_per_min: 5 },
    });
    const settings = await updateDispatchSettings({ radius_m: 5000 });
    expect(api.put).toHaveBeenCalledWith('/admin/settings/dispatch', { radius_m: 5000 });
    expect(settings.radius_m).toBe(5000);
  });

  it('cancelRideByAdmin', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: '已取消' } });
    const msg = await cancelRideByAdmin(9);
    expect(api.post).toHaveBeenCalledWith('/admin/rides/9/cancel');
    expect(msg).toBe('已取消');
  });
});

describe('RBAC admin APIs', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('fetchMe 回傳含 role 的當前登入者資訊', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { id: 1, username: 'admin1', role: 'superadmin' },
    });
    const me = await fetchMe();
    expect(api.get).toHaveBeenCalledWith('/admin/me');
    expect(me.role).toBe('superadmin');
    expect(me.id).toBe(1);
    expect(me.username).toBe('admin1');
  });

  it('listAdmins 解出 data.admins 為 AdminUser[]', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        admins: [
          {
            id: 1,
            username: 'admin1',
            role: 'superadmin',
            is_active: true,
            created_at: '2026-07-01T00:00:00+08:00',
          },
        ],
      },
    });
    const admins = await listAdmins();
    expect(api.get).toHaveBeenCalledWith('/admin/admins');
    expect(admins).toEqual([
      {
        id: 1,
        username: 'admin1',
        role: 'superadmin',
        is_active: true,
        created_at: '2026-07-01T00:00:00+08:00',
      },
    ]);
  });

  it('createAdmin 呼叫 POST /admin/admins', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    await createAdmin({ username: 'newadmin', password: 'pw123456', role: 'dispatcher' });
    expect(api.post).toHaveBeenCalledWith('/admin/admins', {
      username: 'newadmin',
      password: 'pw123456',
      role: 'dispatcher',
    });
  });

  it('updateAdmin 呼叫 PATCH /admin/admins/:id', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    await updateAdmin(2, { is_active: false });
    expect(api.patch).toHaveBeenCalledWith('/admin/admins/2', { is_active: false });
  });
});

describe('費率設定與月報表 API（G 系列）', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('fetchFeeSettings 呼叫 GET /admin/settings/fees', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        base_fare_cents: 8500,
        per_km_fare_cents: 2000,
        min_fare_cents: 8500,
        commission_bps: 1500,
        monthly_membership_fee_cents: 300000,
      },
    });
    const fees = await fetchFeeSettings();
    expect(api.get).toHaveBeenCalledWith('/admin/settings/fees');
    expect(fees.commission_bps).toBe(1500);
  });

  it('updateFeeSettings 呼叫 PUT /admin/settings/fees', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} });
    await updateFeeSettings({ commission_bps: 2000 });
    expect(api.put).toHaveBeenCalledWith('/admin/settings/fees', { commission_bps: 2000 });
  });

  it('fetchMonthlyReport 帶 month 參數並回 drivers', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        month: '2026-07',
        drivers: [
          {
            driver_id: 1,
            driver_name: '甲',
            trip_count: 3,
            total_revenue_cents: 27000,
            total_commission_cents: 4050,
            driver_net_cents: 22950,
            membership_fee_cents: 300000,
            owed_to_hq_cents: 304050,
          },
        ],
      },
    });
    const rows = await fetchMonthlyReport('2026-07');
    expect(api.get).toHaveBeenCalledWith('/admin/reports/monthly', { params: { month: '2026-07' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].owed_to_hq_cents).toBe(304050);
  });

  it('fetchMonthlyReport 無 drivers 時回空陣列', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} });
    const rows = await fetchMonthlyReport('2026-07');
    expect(rows).toEqual([]);
  });
});
