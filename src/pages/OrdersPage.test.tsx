import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OrdersPage from './OrdersPage';
import { renderWithProviders } from '../test/render';

const mockFetchRides = vi.fn();

vi.mock('../api/admin', () => ({
  fetchRides: (...args: unknown[]) => mockFetchRides(...args),
}));

interface Filter {
  status?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

const ALL = [
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
];

describe('OrdersPage', () => {
  beforeEach(() => {
    mockFetchRides.mockReset();
    // 模擬伺服器端查詢：依 status／q 過濾、依 limit/offset 分頁、回傳 total
    mockFetchRides.mockImplementation((filter: Filter = {}) => {
      let rows = ALL;
      if (filter.status !== undefined) rows = rows.filter((r) => r.status === filter.status);
      if (filter.q) {
        rows = rows.filter(
          (r) => String(r.id).includes(filter.q!) || r.pickup_address.includes(filter.q!),
        );
      }
      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? 20;
      return Promise.resolve({
        rides: rows.slice(offset, offset + limit),
        total: rows.length,
        limit,
        offset,
      });
    });
  });

  it('載入並顯示訂單列表，總筆數來自後端', async () => {
    renderWithProviders(<OrdersPage />);

    expect(screen.getByText('訂單管理')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('台北101')).toBeInTheDocument();
    });
    expect(screen.getByText('高雄車站')).toBeInTheDocument();
    expect(screen.getByText('共 2 筆')).toBeInTheDocument();

    // 首次查詢帶伺服器端分頁參數
    expect(mockFetchRides).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });

  it('關鍵字搜尋以伺服器端查詢（帶 q），表格反映後端結果', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('台北101')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('搜尋訂單 ID / 上車點'), '高雄');

    await waitFor(() => {
      expect(mockFetchRides).toHaveBeenCalledWith(expect.objectContaining({ q: '高雄' }));
    });
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
      expect(mockFetchRides).toHaveBeenCalledWith(expect.objectContaining({ q: '2' }));
    });
    await waitFor(() => {
      expect(screen.queryByText('台北101')).not.toBeInTheDocument();
    });
    expect(screen.getByText('高雄車站')).toBeInTheDocument();
  });
});
