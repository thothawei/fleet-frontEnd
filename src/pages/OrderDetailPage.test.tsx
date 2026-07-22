import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';

import OrderDetailPage from './OrderDetailPage';
import { setRole } from '../auth/auth';
import { renderWithProviders } from '../test/render';

const mockFetchRideDetail = vi.fn();
const mockCancelRideByAdmin = vi.fn();
const mockFetchRideMessages = vi.fn();

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

vi.mock('maplibre-gl', () => {
  const marker = {
    setLngLat: vi.fn().mockReturnThis(),
    setPopup: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
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
      Popup: vi.fn(() => ({ setText: vi.fn().mockReturnThis() })),
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
    fetchRideMessages: (...args: unknown[]) => mockFetchRideMessages(...args),
  };
});

describe('OrderDetailPage', () => {
  beforeEach(() => {
    mockFetchRideDetail.mockReset();
    mockCancelRideByAdmin.mockReset();
    mockFetchRideMessages.mockReset().mockResolvedValue([]);
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

  it('顯示行程對話稽核紀錄', async () => {
    mockFetchRideMessages.mockResolvedValue([
      { id: 1, ride_id: 1, sender_role: 'customer', sender_id: 10, body: '司機你好，我在 7-11 門口', created_at: '2026-07-06T14:53:14+08:00' },
      { id: 2, ride_id: 1, sender_role: 'driver', sender_id: 2, body: '好的，兩分鐘到', created_at: '2026-07-06T14:53:20+08:00' },
    ]);

    renderWithProviders(<OrderDetailPage />, { route: '/orders/1', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('司機你好，我在 7-11 門口')).toBeInTheDocument();
    });
    expect(screen.getByText('好的，兩分鐘到')).toBeInTheDocument();
    // 狀態時間軸的 actor Tag 也會出現「乘客 #10」，故限定在對話卡片內查
    const chatCard = screen
      .getByText(/行程對話（稽核） · 2 則/)
      .closest('.ant-card') as HTMLElement;
    expect(within(chatCard).getByText('乘客 #10')).toBeInTheDocument();
    expect(within(chatCard).getByText('司機 #2')).toBeInTheDocument();
  });

  it('無對話紀錄顯示空狀態', async () => {
    renderWithProviders(<OrderDetailPage />, { route: '/orders/1', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('訂單 #1')).toBeInTheDocument();
    });
    expect(screen.getByText('此行程無對話紀錄')).toBeInTheDocument();
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

  it('viewer 角色時強制取消按鈕停用', async () => {
    setRole('viewer');
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

    expect(screen.getByRole('button', { name: /強制取消/ })).toBeDisabled();
  });

  it('已完成訂單不顯示強制取消', async () => {
    renderWithProviders(<OrderDetailPage />, { route: '/orders/1', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('訂單 #1')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /強制取消/ })).not.toBeInTheDocument();
  });

  it('顯示乘客指定車種與司機當時的車輛快照（兩者是不同欄位）', async () => {
    mockFetchRideDetail.mockResolvedValue({
      ride: {
        id: 3,
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
        distance_m: 3000,
        eta_pickup_sec: 100,
        // 乘客要寵物車、實際派來的也是寵物車，但這是兩個獨立欄位
        required_vehicle_type: 'pet',
        driver_vehicle_type: 'pet',
        driver_plate_number: 'PET-0001',
        fare_amount_cents: 20000,
        commission_amount_cents: 3000,
        cleaning_fee_cents: 4000,
        driver_net_amount_cents: 21000,
        created_at: '2026-07-06T14:53:13+08:00',
        updated_at: '2026-07-06T14:53:16+08:00',
      },
      track_geojson: '{"type":"LineString","coordinates":[]}',
      events: [],
      stops: [],
    });

    renderWithProviders(<OrderDetailPage />, { route: '/orders/3', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('訂單 #3')).toBeInTheDocument();
    });
    expect(screen.getByText('乘客指定車種')).toBeInTheDocument();
    expect(screen.getByText('當時車輛（快照）')).toBeInTheDocument();
    expect(screen.getByText('PET-0001')).toBeInTheDocument();
    // 客服要能解釋「為什麼這筆多收了清潔費」→ 車資與清潔費必須分項看得到
    expect(screen.getByText('NT$ 200')).toBeInTheDocument();
    expect(screen.getByText('NT$ 40')).toBeInTheDocument();
  });

  it('未指定車種／未加收清潔費時不編故事', async () => {
    mockFetchRideDetail.mockResolvedValue({
      ride: {
        id: 4,
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
        distance_m: 3000,
        eta_pickup_sec: 100,
        required_vehicle_type: '',
        driver_vehicle_type: 'sedan',
        driver_plate_number: 'ABC-1234',
        fare_amount_cents: 20000,
        commission_amount_cents: 3000,
        // 後端未加收時不帶此鍵：null ＝沒加收，不是「加收 0 元」
        cleaning_fee_cents: null,
        driver_net_amount_cents: 17000,
        created_at: '2026-07-06T14:53:13+08:00',
        updated_at: '2026-07-06T14:53:16+08:00',
      },
      track_geojson: '{"type":"LineString","coordinates":[]}',
      events: [],
      stops: [],
    });

    renderWithProviders(<OrderDetailPage />, { route: '/orders/4', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('訂單 #4')).toBeInTheDocument();
    });
    expect(screen.getByText('不指定')).toBeInTheDocument();
    expect(screen.getByText('未加收')).toBeInTheDocument();
  });

  it('多停靠點行程列出全程，跳過的站標示不計費', async () => {
    mockFetchRideDetail.mockResolvedValue({
      ride: {
        id: 5,
        customer_id: 10,
        driver_id: 2,
        status: 3,
        pickup_point: { lat: 25.033, lng: 121.5654 },
        pickup_address: '台北101',
        dropoff_point: null,
        dropoff_address: '',
        requested_at: '2026-07-06T14:53:13+08:00',
        accepted_at: '2026-07-06T14:53:16+08:00',
        picked_up_at: '2026-07-06T14:53:16+08:00',
        completed_at: null,
        distance_m: null,
        eta_pickup_sec: 100,
        required_vehicle_type: '',
        driver_vehicle_type: 'van7',
        driver_plate_number: 'VAN-0007',
        fare_amount_cents: null,
        commission_amount_cents: null,
        cleaning_fee_cents: null,
        driver_net_amount_cents: null,
        created_at: '2026-07-06T14:53:13+08:00',
        updated_at: '2026-07-06T14:53:16+08:00',
      },
      track_geojson: '{"type":"LineString","coordinates":[]}',
      events: [],
      stops: [
        {
          id: 11, seq: 1, kind: 'pickup', lat: 25.033, lng: 121.5654,
          passenger_label: 'A', address: '台北101',
          arrived_at: '2026-07-06T14:53:20+08:00', skipped_at: null,
        },
        {
          id: 12, seq: 2, kind: 'pickup', lat: 25.04, lng: 121.56,
          passenger_label: 'B', address: '國父紀念館',
          arrived_at: null, skipped_at: '2026-07-06T14:55:00+08:00',
        },
        {
          id: 13, seq: 3, kind: 'dropoff', lat: 25.0478, lng: 121.517,
          passenger_label: 'A', address: '台北車站',
          arrived_at: null, skipped_at: null,
        },
      ],
    });

    renderWithProviders(<OrderDetailPage />, { route: '/orders/5', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('停靠點（3 站）')).toBeInTheDocument();
    });
    expect(screen.getByText(/1\. 乘客 A 上車/)).toBeInTheDocument();
    expect(screen.getByText(/2\. 乘客 B 上車/)).toBeInTheDocument();
    expect(screen.getByText(/3\. 乘客 A 下車/)).toBeInTheDocument();
    // 跳過的站不計入車資，後台要看得出來，否則客服對不上金額
    expect(screen.getByText('已跳過（不計費）')).toBeInTheDocument();
    expect(screen.getByText('已到達')).toBeInTheDocument();
    expect(screen.getByText('待處理')).toBeInTheDocument();
    // 沒有軌跡但有停靠點時，地圖仍要出現（只是說明它只畫停靠點）
    expect(screen.getByText('尚無軌跡資料，地圖僅顯示停靠點位置')).toBeInTheDocument();
  });

  it('單點訂單不顯示停靠點區塊', async () => {
    renderWithProviders(<OrderDetailPage />, { route: '/orders/1', path: '/orders/:id' });

    await waitFor(() => {
      expect(screen.getByText('訂單 #1')).toBeInTheDocument();
    });
    expect(screen.queryByText(/^停靠點（/)).not.toBeInTheDocument();
  });
});
