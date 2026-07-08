import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import OrderDetailPage from './OrderDetailPage';
import { renderWithProviders } from '../test/render';

const mockFetchRideDetail = vi.fn();
const mockCancelRideByAdmin = vi.fn();

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

vi.mock('maplibre-gl', () => {
  const marker = {
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
  };
  const map = {
    on: vi.fn(),
    once: vi.fn((_event: string, cb: () => void) => cb()),
    remove: vi.fn(),
    isStyleLoaded: vi.fn(() => true),
    getSource: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    fitBounds: vi.fn(),
  };
  return {
    default: {
      Map: vi.fn(() => map),
      Marker: vi.fn(() => marker),
      LngLatBounds: vi.fn(function LngLatBounds() {
        return { extend: vi.fn().mockReturnThis() };
      }),
    },
  };
});

vi.mock('../api/admin', async () => {
  const actual = await vi.importActual('../api/admin');
  return {
    ...actual,
    fetchRideDetail: (...args: unknown[]) => mockFetchRideDetail(...args),
    cancelRideByAdmin: (...args: unknown[]) => mockCancelRideByAdmin(...args),
  };
});

describe('OrderDetailPage', () => {
  beforeEach(() => {
    mockFetchRideDetail.mockReset();
    mockCancelRideByAdmin.mockReset();
    mockCancelRideByAdmin.mockResolvedValue('訂單已取消');
    mockFetchRideDetail.mockResolvedValue({
      ride: {
        id: 1,
        customer_id: 10,
        driver_id: 2,
        status: 4,
        pickup_point: { lat: 25.034, lng: 121.566 },
        pickup_address: '台北101',
        dropoff_point: null,
        dropoff_address: '',
        requested_at: '2026-07-06T14:53:13+08:00',
        accepted_at: '2026-07-06T14:53:16+08:00',
        picked_up_at: '2026-07-06T14:53:16+08:00',
        completed_at: '2026-07-06T14:53:16+08:00',
        distance_m: 0,
        eta_pickup_sec: 100,
        created_at: '2026-07-06T14:53:13+08:00',
        updated_at: '2026-07-06T14:53:16+08:00',
      },
      track_geojson: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [121.567, 25.035],
          [121.568, 25.036],
        ],
      }),
      events: [
        {
          id: 1,
          ride_id: 1,
          from_status: null,
          to_status: 0,
          event_type: 'ride.requested',
          actor_role: 'customer',
          actor_id: 10,
          note: 'app',
          created_at: '2026-07-06T14:53:13+08:00',
        },
        {
          id: 2,
          ride_id: 1,
          from_status: 0,
          to_status: 1,
          event_type: 'ride.assigned',
          actor_role: 'system',
          actor_id: null,
          note: 'dispatch_offer',
          created_at: '2026-07-06T14:53:14+08:00',
        },
        {
          id: 3,
          ride_id: 1,
          from_status: 1,
          to_status: 2,
          event_type: 'ride.accepted',
          actor_role: 'driver',
          actor_id: 2,
          note: '',
          created_at: '2026-07-06T14:53:16+08:00',
        },
      ],
    });
  });

  it('顯示訂單詳情與軌跡回放控制', async () => {
    renderWithProviders(<OrderDetailPage />, { route: '/orders/1', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('訂單 #1')).toBeInTheDocument();
    });

    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('台北101')).toBeInTheDocument();
    expect(screen.getByText('狀態時間軸')).toBeInTheDocument();
    expect(screen.getByText('叫車')).toBeInTheDocument();
    expect(screen.getByText('派單')).toBeInTheDocument();
    expect(screen.getByText('接單')).toBeInTheDocument();
    expect(screen.getByText('軌跡回放')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /播放/ })).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('讀取失敗顯示錯誤', async () => {
    mockFetchRideDetail.mockRejectedValue(new Error('404'));

    renderWithProviders(<OrderDetailPage />, { route: '/orders/999', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('找不到訂單或讀取失敗')).toBeInTheDocument();
    });
  });

  it('進行中訂單顯示強制取消按鈕', async () => {
    mockFetchRideDetail.mockResolvedValue({
      ride: {
        id: 2,
        customer_id: 10,
        driver_id: 2,
        status: 1,
        pickup_point: { lat: 25.034, lng: 121.566 },
        pickup_address: '台北101',
        dropoff_point: null,
        dropoff_address: '',
        requested_at: '2026-07-06T14:53:13+08:00',
        accepted_at: null,
        picked_up_at: null,
        completed_at: null,
        distance_m: null,
        eta_pickup_sec: 100,
        created_at: '2026-07-06T14:53:13+08:00',
        updated_at: '2026-07-06T14:53:13+08:00',
      },
      track_geojson: '{"type":"LineString","coordinates":[]}',
      events: [],
    });

    renderWithProviders(<OrderDetailPage />, { route: '/orders/2', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /強制取消/ })).toBeInTheDocument();
    });
  });

  it('已完成訂單不顯示強制取消', async () => {
    renderWithProviders(<OrderDetailPage />, { route: '/orders/1', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('訂單 #1')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /強制取消/ })).not.toBeInTheDocument();
  });
});
