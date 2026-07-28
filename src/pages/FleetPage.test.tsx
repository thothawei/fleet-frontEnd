import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FleetPage from './FleetPage';
import { renderWithProviders } from '../test/render';

const mockFetchFleet = vi.fn();
const mockFetchDrivers = vi.fn();

// maplibre 被 mock 掉，popup 的 HTML 不會真的進 DOM——所以把它記下來直接驗字串，
// 並記住地圖容器（委派點擊掛在它身上），才能測到「點 popup 連結會導向詳情頁」。
const captured = vi.hoisted(() => ({
  container: null as HTMLElement | null,
  popupHtml: [] as string[],
}));
const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateSpy,
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
vi.mock('maplibre-gl', () => {
  const map = {
    on: vi.fn(),
    once: vi.fn((_event: string, cb: () => void) => cb()),
    remove: vi.fn(),
    fitBounds: vi.fn(),
  };
  const marker = {
    setLngLat: vi.fn().mockReturnThis(),
    setPopup: vi.fn().mockReturnThis(),
    getPopup: vi.fn(() => ({
      setHTML: vi.fn((html: string) => {
        captured.popupHtml.push(html);
      }),
    })),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  return {
    default: {
      Map: vi.fn((opts: { container: HTMLElement }) => {
        captured.container = opts.container;
        return map;
      }),
      Marker: vi.fn(() => marker),
      Popup: vi.fn(function Popup() {
        return {
          setHTML: vi.fn(function (this: unknown, html: string) {
            captured.popupHtml.push(html);
            return this;
          }),
          setText: vi.fn().mockReturnThis(),
        };
      }),
      LngLatBounds: vi.fn(function LngLatBounds() {
        return { extend: vi.fn().mockReturnThis() };
      }),
    },
  };
});

vi.mock('../ws/useFleetSocket', () => ({
  useFleetSocket: (initial: unknown[]) => ({
    locations: initial,
    connected: true,
    reconnecting: false,
    reconnectAttempt: 0,
  }),
}));

vi.mock('../api/admin', () => ({
  fetchFleet: (...args: unknown[]) => mockFetchFleet(...args),
  fetchDrivers: (...args: unknown[]) => mockFetchDrivers(...args),
}));

describe('FleetPage', () => {
  beforeEach(() => {
    captured.container = null;
    captured.popupHtml = [];
    navigateSpy.mockReset();
    mockFetchFleet.mockReset();
    mockFetchDrivers.mockReset();
    mockFetchFleet.mockResolvedValue([{ driver_id: 1, lat: 25.03, lng: 121.56, updated_at: 100 }]);
    mockFetchDrivers.mockResolvedValue([
      { ID: 1, Name: '測試司機', Phone: '', LineUserID: 'u1', Status: 1 },
    ]);
  });

  it('載入車隊快照並顯示連線狀態', async () => {
    renderWithProviders(<FleetPage />);

    expect(screen.getByText('即時車隊')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/即時連線中/)).toBeInTheDocument();
    });

    expect(mockFetchFleet).toHaveBeenCalled();
    expect(mockFetchDrivers).toHaveBeenCalled();
  });

  // popup 是「地圖 → 司機詳情」唯一的入口。它是手組的 HTML 字串，
  // 沒有型別保護，改動 popup 內容時最容易把連結弄掉，所以直接驗字串。
  it('marker popup 帶「查看司機」連結與正確的 driver id', async () => {
    renderWithProviders(<FleetPage />);

    await waitFor(() => {
      expect(captured.popupHtml.length).toBeGreaterThan(0);
    });

    const html = captured.popupHtml.join('\n');
    expect(html).toContain('查看司機');
    expect(html).toContain('data-driver-link="1"');
    // href 要留著：委派點擊靠 JS，JS 掛掉時整頁跳轉是唯一退路
    expect(html).toContain('href="/drivers/1"');
    expect(html).toContain('測試司機');
  });

  it('點 popup 的連結走 SPA 導向而不是整頁跳轉', async () => {
    renderWithProviders(<FleetPage />);

    await waitFor(() => {
      expect(captured.container).not.toBeNull();
    });

    // maplibre 被 mock，popup 不會真的掛進 DOM；此處還原它的效果——
    // 把同一段 HTML 放進地圖容器，驗證委派 handler 真的接得到。
    const container = captured.container as HTMLElement;
    container.insertAdjacentHTML(
      'beforeend',
      '<a href="/drivers/1" data-driver-link="1">查看司機 →</a>',
    );

    const link = container.querySelector('[data-driver-link]') as HTMLElement;
    await userEvent.click(link);

    expect(navigateSpy).toHaveBeenCalledWith('/drivers/1');
  });

  // 反向確認：容器內其他地方的點擊不該觸發導向，否則整張地圖都變成連結
  it('點地圖其他位置不會導向', async () => {
    renderWithProviders(<FleetPage />);

    await waitFor(() => {
      expect(captured.container).not.toBeNull();
    });

    await userEvent.click(captured.container as HTMLElement);

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
