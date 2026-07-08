import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import FleetPage from './FleetPage';
import { renderWithProviders } from '../test/render';

const mockFetchFleet = vi.fn();
const mockFetchDrivers = vi.fn();

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
    getPopup: vi.fn(() => ({ setHTML: vi.fn() })),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  return {
    default: {
      Map: vi.fn(() => map),
      Marker: vi.fn(() => marker),
      Popup: vi.fn(function Popup() {
        return { setHTML: vi.fn().mockReturnThis(), setText: vi.fn().mockReturnThis() };
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
});
