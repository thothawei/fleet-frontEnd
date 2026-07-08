import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import ReportsPage from './ReportsPage';
import { renderWithProviders } from '../test/render';

const mockFetchDailyReport = vi.fn();

vi.mock('../api/admin', () => ({
  fetchDailyReport: (...args: unknown[]) => mockFetchDailyReport(...args),
}));

describe('ReportsPage', () => {
  beforeEach(() => {
    mockFetchDailyReport.mockReset();
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
});
