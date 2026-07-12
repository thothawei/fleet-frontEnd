import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SettingsPage from './SettingsPage';
import { setRole } from '../auth/auth';
import { renderWithProviders } from '../test/render';

const mockFetchDispatchSettings = vi.fn();
const mockUpdateDispatchSettings = vi.fn();
// App.useApp() 的 message spy：不渲染真 toast（無 3 秒 timer），直接斷言呼叫
const mockMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };

vi.mock('../api/admin', async () => {
  const actual = await vi.importActual('../api/admin');
  return {
    ...actual,
    fetchDispatchSettings: (...args: unknown[]) => mockFetchDispatchSettings(...args),
    updateDispatchSettings: (...args: unknown[]) => mockUpdateDispatchSettings(...args),
  };
});

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  const MockApp = Object.assign(({ children }: { children: ReactNode }) => children, {
    useApp: () => ({ message: mockMessage, modal: { confirm: vi.fn() }, notification: {} }),
  });
  return { ...actual, App: MockApp };
});

describe('SettingsPage', () => {
  beforeEach(() => {
    setRole('dispatcher'); // 儲存按鈕需 dispatcher 以上權限才可操作，見 Task 13
    mockFetchDispatchSettings.mockReset();
    mockUpdateDispatchSettings.mockReset();
    mockMessage.success.mockReset();
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

    // 欄位值由 useEffect 的 form.setFieldsValue 回填，與標題不在同一次 commit，
    // 標題出現不代表欄位已填 —— 要等欄位本身
    expect(await screen.findByDisplayValue('3000')).toBeInTheDocument();
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

    // 等 onSuccess 完全跑完（成功訊息 + 表單回填），否則測試會在 React 還有
    // 排程工作時就結束，那些工作會在測試環境拆除後才執行
    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledWith('派單參數已更新');
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
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
