import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SettingsPage from './SettingsPage';
import { setRole } from '../auth/auth';
import { renderWithProviders } from '../test/render';

const mockFetchDispatchSettings = vi.fn();
const mockUpdateDispatchSettings = vi.fn();

vi.mock('../api/admin', async () => {
  const actual = await vi.importActual('../api/admin');
  return {
    ...actual,
    fetchDispatchSettings: (...args: unknown[]) => mockFetchDispatchSettings(...args),
    updateDispatchSettings: (...args: unknown[]) => mockUpdateDispatchSettings(...args),
  };
});

describe('SettingsPage', () => {
  beforeEach(() => {
    setRole('dispatcher'); // 儲存按鈕需 dispatcher 以上權限才可操作，見 Task 13
    mockFetchDispatchSettings.mockReset();
    mockUpdateDispatchSettings.mockReset();
    mockFetchDispatchSettings.mockResolvedValue({
      radius_m: 3000,
      max_drivers: 5,
      offer_timeout_sec: 20,
      max_attempts: 3,
      rate_limit_per_min: 5,
    });
    mockUpdateDispatchSettings.mockResolvedValue({
      radius_m: 5000,
      max_drivers: 5,
      offer_timeout_sec: 20,
      max_attempts: 3,
      rate_limit_per_min: 5,
    });
  });

  it('載入並顯示派單參數表單', async () => {
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('派單參數設定')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
  });

  it('提交更新派單參數', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /儲\s*存/ }));

    await waitFor(() => {
      expect(mockUpdateDispatchSettings).toHaveBeenCalledWith({
        radius_m: 3000,
        max_drivers: 5,
        offer_timeout_sec: 20,
        max_attempts: 3,
        rate_limit_per_min: 5,
      });
    });
  });

  it('viewer 角色時儲存按鈕停用', async () => {
    setRole('viewer');
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /儲\s*存/ })).toBeDisabled();
  });
});
