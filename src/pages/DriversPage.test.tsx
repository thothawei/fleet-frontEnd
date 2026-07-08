import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import DriversPage from './DriversPage';
import { renderWithProviders } from '../test/render';

const mockFetchDrivers = vi.fn();

vi.mock('../api/admin', () => ({
  fetchDrivers: (...args: unknown[]) => mockFetchDrivers(...args),
  patchDriverStatus: vi.fn(),
}));

describe('DriversPage', () => {
  beforeEach(() => {
    mockFetchDrivers.mockReset();
    mockFetchDrivers.mockResolvedValue([
      { ID: 1, Name: '煙霧測試司機', Phone: '0912', LineUserID: 'line-1', Status: 1 },
    ]);
  });

  it('載入並顯示司機列表與狀態 Tag', async () => {
    renderWithProviders(<DriversPage />);

    expect(screen.getByText('司機管理')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('煙霧測試司機')).toBeInTheDocument();
    });

    expect(screen.getByText('待命')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(mockFetchDrivers).toHaveBeenCalled();
  });
});
