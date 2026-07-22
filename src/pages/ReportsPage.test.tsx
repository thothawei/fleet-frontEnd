import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ReportsPage from './ReportsPage';
import { renderWithProviders } from '../test/render';

const mockFetchDailyReport = vi.fn();
const mockDownloadCsv = vi.fn();

vi.mock('../api/admin', () => ({
  fetchDailyReport: (...args: unknown[]) => mockFetchDailyReport(...args),
}));

vi.mock('../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/csv')>()),
  downloadCsv: (...args: unknown[]) => mockDownloadCsv(...args),
}));

describe('ReportsPage', () => {
  beforeEach(() => {
    mockFetchDailyReport.mockReset();
    mockDownloadCsv.mockReset();
    mockFetchDailyReport.mockResolvedValue([
      {
        driver_id: 1,
        driver_name: '測試司機',
        trip_count: 2,
        total_distance_m: 5000,
        avg_pickup_sec: 120,
        // O6：清潔費不進營業額、不進抽成，但含在實得裡（170 − 25 + 30 = 175）
        total_revenue_cents: 17000,
        total_commission_cents: 2500,
        total_cleaning_fee_cents: 3000,
        driver_net_cents: 17500,
      },
    ]);
  });

  it('顯示日報表與合計摘要', async () => {
    renderWithProviders(<ReportsPage />);

    expect(screen.getByText('日報表')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('測試司機')).toBeInTheDocument();
    });

    expect(screen.getByText(/合計：2 趟/)).toBeInTheDocument();
    expect(mockFetchDailyReport).toHaveBeenCalled();
  });

  it('匯出 CSV：檔名帶日期、內容為換算後的 km / 分鐘', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('測試司機')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /匯出 CSV/ }));

    expect(mockDownloadCsv).toHaveBeenCalledOnce();
    const [filename, csv] = mockDownloadCsv.mock.calls[0] as [string, string];
    expect(filename).toMatch(/^日報表-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain('司機ID,司機,趟數,總里程(km),平均接客(分)');
    expect(csv).toContain('清潔費(元)');
    expect(csv).toContain('1,測試司機,2,5.00,2.0,170,25,30,175');
  });

  it('清潔費分項讓「營業額 − 手續費 + 清潔費 = 實得」對得起來', async () => {
    renderWithProviders(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('測試司機')).toBeInTheDocument();
    });
    // 少了這一欄，170 − 25 = 145 對不上實得 175（月報表早就有，日報表原本漏了）
    expect(screen.getAllByText('NT$ 30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NT$ 175').length).toBeGreaterThan(0);
  });

  it('沒有資料時匯出鈕停用', async () => {
    mockFetchDailyReport.mockResolvedValue([]);
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /匯出 CSV/ })).toBeDisabled();
    });
  });
});
