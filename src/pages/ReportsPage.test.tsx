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
    expect(csv).toContain('1,測試司機,2,5.00,2.0');
  });

  it('沒有資料時匯出鈕停用', async () => {
    mockFetchDailyReport.mockResolvedValue([]);
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /匯出 CSV/ })).toBeDisabled();
    });
  });
});
