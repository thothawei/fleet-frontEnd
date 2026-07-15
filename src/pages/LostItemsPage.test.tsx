import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LostItemsPage from './LostItemsPage';
import { renderWithProviders } from '../test/render';

const mockFetch = vi.fn();

vi.mock('../api/admin', () => ({
  fetchLostItems: (...a: unknown[]) => mockFetch(...a),
}));

const ROWS = [
  {
    id: 2,
    ride_id: 8,
    customer_id: 10,
    customer_name: '協尋乘客',
    driver_id: 3,
    driver_name: '協尋司機',
    description: '黑色雨傘',
    fee_cents: 1100,
    fee_bps: 1000,
    status: 'found',
    paid_at: null,
    created_at: '2026-07-14T10:00:00+08:00',
    updated_at: '2026-07-14T11:00:00+08:00',
  },
  {
    id: 1,
    ride_id: 5,
    customer_id: 11,
    customer_name: '王小明',
    driver_id: 3,
    driver_name: '協尋司機',
    description: '藍色背包',
    fee_cents: 800,
    fee_bps: 1000,
    status: 'returned',
    paid_at: '2026-07-13T18:00:00+08:00',
    created_at: '2026-07-13T10:00:00+08:00',
    updated_at: '2026-07-13T18:30:00+08:00',
  },
];

describe('LostItemsPage', () => {
  beforeEach(() => {
    mockFetch.mockReset().mockResolvedValue(ROWS);
  });

  it('顯示協尋單列表、處理費與進行中計數', async () => {
    renderWithProviders(<LostItemsPage />);

    await waitFor(() => expect(screen.getByText('黑色雨傘')).toBeInTheDocument());
    expect(screen.getByText('藍色背包')).toBeInTheDocument();
    expect(screen.getByText('協尋乘客')).toBeInTheDocument();
    expect(screen.getByText('王小明')).toBeInTheDocument();
    // 處理費快照金額（分→整數元 NT$）與 % 呈現
    expect(screen.getByText('NT$ 11')).toBeInTheDocument();
    expect(screen.getByText('NT$ 8')).toBeInTheDocument();
    // found 進行中、returned 不算 → 進行中 1
    expect(screen.getByText('進行中 1')).toBeInTheDocument();
    expect(screen.getByText('總計 2')).toBeInTheDocument();
    expect(screen.getByText('已尋獲')).toBeInTheDocument();
    expect(screen.getByText('已歸還')).toBeInTheDocument();
    // 未帶 status（全部）
    expect(mockFetch).toHaveBeenCalledWith(undefined);
  });

  it('行程欄連到訂單詳情頁', async () => {
    renderWithProviders(<LostItemsPage />);

    await waitFor(() => expect(screen.getByText('黑色雨傘')).toBeInTheDocument());
    const link = screen.getByRole('link', { name: '#8' });
    expect(link).toHaveAttribute('href', '/orders/8');
  });

  it('切換狀態篩選會帶 status 重新查詢', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LostItemsPage />);
    await waitFor(() => expect(screen.getByText('黑色雨傘')).toBeInTheDocument());

    mockFetch.mockResolvedValue([ROWS[0]]);
    await user.click(screen.getByRole('combobox'));
    await user.click(within(document.body).getByText('待尋找'));

    await waitFor(() => expect(mockFetch).toHaveBeenLastCalledWith('open'));
  });

  it('空列表顯示空狀態', async () => {
    mockFetch.mockResolvedValue([]);
    renderWithProviders(<LostItemsPage />);

    await waitFor(() => expect(screen.getByText('尚無協尋單')).toBeInTheDocument());
  });
});
