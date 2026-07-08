import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

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
});
