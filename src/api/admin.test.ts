import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './client';
import {
  cancelRideByAdmin,
  fetchDispatchSettings,
  fetchRideDetail,
  normalizeDriver,
  parseTrackCoordinates,
  patchDriverStatus,
  updateDispatchSettings,
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
      }),
    ).toEqual({ ID: 1, LineUserID: 'line-1', Name: '司機A', Phone: '0912', Status: 1 });

    expect(
      normalizeDriver({
        id: 2,
        line_user_id: 'line-2',
        name: '司機B',
        phone: '',
        status: 3,
      }),
    ).toEqual({ ID: 2, LineUserID: 'line-2', Name: '司機B', Phone: '', Status: 3 });
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
