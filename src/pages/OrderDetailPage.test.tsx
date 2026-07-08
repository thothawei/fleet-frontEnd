import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import OrderDetailPage from './OrderDetailPage';
import { renderWithProviders } from '../test/render';

const mockFetchRideDetail = vi.fn();

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
  };
});

describe('OrderDetailPage', () => {
  beforeEach(() => {
    mockFetchRideDetail.mockReset();
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
    });
  });

  it('顯示訂單詳情與軌跡回放控制', async () => {
    renderWithProviders(<OrderDetailPage />, { route: '/orders/1', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('訂單 #1')).toBeInTheDocument();
    });

    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('台北101')).toBeInTheDocument();
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
});
