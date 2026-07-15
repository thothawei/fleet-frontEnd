import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MonthlyReportPage from './MonthlyReportPage';
import { renderWithProviders } from '../test/render';

const mockFetchMonthlyReport = vi.fn();
const mockDownloadCsv = vi.fn();

vi.mock('../api/admin', () => ({
  fetchMonthlyReport: (...a: unknown[]) => mockFetchMonthlyReport(...a),
}));

vi.mock('../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/csv')>()),
  downloadCsv: (...a: unknown[]) => mockDownloadCsv(...a),
}));

describe('MonthlyReportPage', () => {
  beforeEach(() => {
    mockFetchMonthlyReport.mockReset();
    mockDownloadCsv.mockReset();
    mockFetchMonthlyReport.mockResolvedValue([
      {
        driver_id: 1,
        driver_name: '測試司機',
        trip_count: 3,
        total_revenue_cents: 27000,
        total_commission_cents: 4000,
        driver_net_cents: 23000,
        membership_fee_cents: 300000,
        owed_to_hq_cents: 304000,
      },
    ]);
  });

  it('顯示月報表與應付總公司金額', async () => {
    renderWithProviders(<MonthlyReportPage />);

    expect(screen.getByText('月營運報表')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('測試司機')).toBeInTheDocument();
    });
    // 台幣整數元：27000 分 → NT$ 270 營業額；304000 分 → NT$ 3,040 應付總公司
    expect(screen.getAllByText('NT$ 270').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NT$ 3,040').length).toBeGreaterThan(0);
  });

  it('匯出 CSV：檔名帶月份、含金額欄位', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MonthlyReportPage />);

    await waitFor(() => {
      expect(screen.getByText('測試司機')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /匯出 CSV/ }));

    expect(mockDownloadCsv).toHaveBeenCalledOnce();
    const [filename, csv] = mockDownloadCsv.mock.calls[0] as [string, string];
    expect(filename).toMatch(/^月報表-\d{4}-\d{2}\.csv$/);
    expect(csv).toContain('應付總公司(元)');
    expect(csv).toContain('1,測試司機,3,270,40,3000,3040,230');
  });

  it('沒有資料時匯出鈕停用', async () => {
    mockFetchMonthlyReport.mockResolvedValue([]);
    renderWithProviders(<MonthlyReportPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /匯出 CSV/ })).toBeDisabled();
    });
  });
});
