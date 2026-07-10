import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OrdersPage from './OrdersPage';
import { renderWithProviders } from '../test/render';

const mockFetchRides = vi.fn();

vi.mock('../api/admin', () => ({
  fetchRides: (...args: unknown[]) => mockFetchRides(...args),
}));

describe('OrdersPage', () => {
  beforeEach(() => {
    mockFetchRides.mockReset();
    mockFetchRides.mockResolvedValue([
      {
        id: 1,
        customer_id: 10,
        driver_id: 2,
        status: 4,
        pickup_address: '台北101',
        requested_at: '2026-07-06T14:53:13+08:00',
        completed_at: '2026-07-06T14:53:16+08:00',
        distance_m: 1500,
      },
      {
        id: 2,
        customer_id: 11,
        driver_id: null,
        status: 0,
        pickup_address: '高雄車站',
        requested_at: '2026-07-07T09:00:00+08:00',
        completed_at: null,
        distance_m: null,
      },
    ]);
  });

  it('載入並顯示訂單列表', async () => {
    renderWithProviders(<OrdersPage />);

    expect(screen.getByText('訂單管理')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('台北101')).toBeInTheDocument();
    });

    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(mockFetchRides).toHaveBeenCalled();
  });

  it('關鍵字搜尋上車點：只留下符合的列', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('台北101')).toBeInTheDocument();
    });
    expect(screen.getByText('高雄車站')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('搜尋訂單 ID / 上車點'), '高雄');

    await waitFor(() => {
      expect(screen.queryByText('台北101')).not.toBeInTheDocument();
    });
    expect(screen.getByText('高雄車站')).toBeInTheDocument();
  });

  it('關鍵字搜尋訂單 ID', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('台北101')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('搜尋訂單 ID / 上車點'), '2');

    await waitFor(() => {
      expect(screen.queryByText('台北101')).not.toBeInTheDocument();
    });
    expect(screen.getByText('高雄車站')).toBeInTheDocument();
  });

  it('標示篩選僅適用於已載入的最近訂單', async () => {
    renderWithProviders(<OrdersPage />);
    expect(
      screen.getByText(/日期與關鍵字在最近 100 筆訂單內篩選/),
    ).toBeInTheDocument();
  });
});
