import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './client';
import { fetchRideDetail, parseTrackCoordinates } from './admin';

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
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
