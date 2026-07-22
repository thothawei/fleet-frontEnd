import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DriversPage from './DriversPage';
import { setRole } from '../auth/auth';
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

  it('viewer 角色時帳號 Switch 停用', async () => {
    setRole('viewer');
    renderWithProviders(<DriversPage />);

    await waitFor(() => {
      expect(screen.getByText('煙霧測試司機')).toBeInTheDocument();
    });

    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('車種篩選：選寵物用車只留寵物車司機，選「未填車輛」只留沒填的', async () => {
    const user = userEvent.setup();
    mockFetchDrivers.mockResolvedValue([
      { ID: 1, Name: '轎車司機', Phone: '0911', LineUserID: 'l1', Status: 1, VehicleType: 'sedan', PlateNumber: 'AAA-1111', VehicleReviewStatus: 'approved', VehicleReviewNote: '' },
      { ID: 2, Name: '寵物車司機', Phone: '0922', LineUserID: 'l2', Status: 1, VehicleType: 'pet', PlateNumber: 'PET-0001', VehicleReviewStatus: 'approved', VehicleReviewNote: '' },
      // 沒填車輛的司機接不了單（O3/O5 gate），是實際會被找的一群，不能只給五個車種而漏掉
      { ID: 3, Name: '未填車輛司機', Phone: '0933', LineUserID: 'l3', Status: 0, VehicleType: '', PlateNumber: '', VehicleReviewStatus: '', VehicleReviewNote: '' },
    ]);

    renderWithProviders(<DriversPage />);
    await waitFor(() => {
      expect(screen.getByText('轎車司機')).toBeInTheDocument();
    });

    // 兩個 Select：第一個是狀態、第二個是車種
    const vehicleSelect = () => screen.getAllByRole('combobox')[1];

    await user.click(vehicleSelect());
    await user.click(await screen.findByTitle('寵物用車'));
    await waitFor(() => {
      expect(screen.queryByText('轎車司機')).not.toBeInTheDocument();
    });
    expect(screen.getByText('寵物車司機')).toBeInTheDocument();

    await user.click(vehicleSelect());
    await user.click(await screen.findByTitle('未填車輛'));
    await waitFor(() => {
      expect(screen.getByText('未填車輛司機')).toBeInTheDocument();
    });
    expect(screen.queryByText('寵物車司機')).not.toBeInTheDocument();
  });
});
