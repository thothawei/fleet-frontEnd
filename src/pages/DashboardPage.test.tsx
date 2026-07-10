import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import DashboardPage from './DashboardPage';
import { renderWithProviders } from '../test/render';

const mockFetchRides = vi.fn();
const mockFetchDrivers = vi.fn();
const mockFetchFleet = vi.fn();

vi.mock('../api/admin', () => ({
  fetchRides: (...a: unknown[]) => mockFetchRides(...a),
  fetchDrivers: (...a: unknown[]) => mockFetchDrivers(...a),
  fetchFleet: (...a: unknown[]) => mockFetchFleet(...a),
}));

const today = new Date().toISOString();

describe('DashboardPage', () => {
  beforeEach(() => {
    mockFetchRides.mockReset().mockResolvedValue([
      { id: 1, customer_id: 9, driver_id: 5, status: 4, pickup_address: '台北車站', requested_at: today, completed_at: today, distance_m: 1200 },
      { id: 2, customer_id: 9, driver_id: 5, status: 2, pickup_address: '市政府', requested_at: today, completed_at: null, distance_m: null },
      { id: 3, customer_id: 8, driver_id: null, status: 9, pickup_address: '松山機場', requested_at: today, completed_at: null, distance_m: null },
    ]);
    mockFetchDrivers.mockReset().mockResolvedValue([
      { ID: 1, LineUserID: 'l1', Name: '司機甲', Phone: '0911', Status: 1 },
      { ID: 2, LineUserID: 'l2', Name: '司機乙', Phone: '0912', Status: 0 },
    ]);
    mockFetchFleet.mockReset().mockResolvedValue([]);
  });

  it('顯示 KPI：今日訂單/完成/取消/在線司機/進行中', async () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('營運總覽')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('今日訂單')).toBeInTheDocument();
    });
    // 今日 3 筆、完成 1、取消 1、在線司機 1（Status!=0 且 !=3）、進行中 1（status 1-3）
    expect(screen.getByTestId('kpi-today').textContent).toContain('3');
    expect(screen.getByTestId('kpi-done').textContent).toContain('1');
    expect(screen.getByTestId('kpi-cancelled').textContent).toContain('1');
    expect(screen.getByTestId('kpi-online').textContent).toContain('1');
    expect(screen.getByTestId('kpi-active').textContent).toContain('1');
  });

  it('顯示最近訂單表', async () => {
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('台北車站')).toBeInTheDocument();
    });
  });
});
