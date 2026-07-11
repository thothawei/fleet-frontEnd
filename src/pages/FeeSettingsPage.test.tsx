import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';

import FeeSettingsPage from './FeeSettingsPage';
import { renderWithProviders } from '../test/render';
import { saveSession, clearSession } from '../auth/auth';

const mockFetchFeeSettings = vi.fn();
const mockUpdateFeeSettings = vi.fn();

vi.mock('../api/admin', () => ({
  fetchFeeSettings: (...a: unknown[]) => mockFetchFeeSettings(...a),
  updateFeeSettings: (...a: unknown[]) => mockUpdateFeeSettings(...a),
}));

const defaultFees = {
  base_fare_cents: 8500,
  per_km_fare_cents: 2000,
  min_fare_cents: 8500,
  commission_bps: 1500,
  monthly_membership_fee_cents: 300000,
};

describe('FeeSettingsPage', () => {
  beforeEach(() => {
    clearSession();
    mockFetchFeeSettings.mockReset().mockResolvedValue(defaultFees);
    mockUpdateFeeSettings.mockReset().mockResolvedValue(defaultFees);
  });

  // message.success 會開一個 3 秒自動關閉的 timer，不清掉的話 teardown 後才觸發，
  // React 在無 window 環境重新排程 → vitest 報 unhandled error 並 exit 1（CI 較慢更易踩中）。
  afterEach(() => {
    message.destroy();
  });

  it('把後端「分/bps」換算成「元/%」填入表單', async () => {
    saveSession('tok', '管理員', 'superadmin');
    renderWithProviders(<FeeSettingsPage />);

    // 2000 分 → 20 元（每公里）、1500 bps → 15 %、300000 分 → 3000 元（月會費）
    // 起步價/最低車資皆 85.00（值重複），故以這三個唯一值驗證。
    expect(await screen.findByDisplayValue('15.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3000.00')).toBeInTheDocument();
    // 85.00 出現兩次（起步價+最低車資）
    expect(screen.getAllByDisplayValue('85.00')).toHaveLength(2);
  });

  it('儲存時把「元/%」換算回「分/bps」送出', async () => {
    saveSession('tok', '管理員', 'superadmin');
    const user = userEvent.setup();
    renderWithProviders(<FeeSettingsPage />);

    const commission = await screen.findByDisplayValue('15.00');
    await user.clear(commission);
    await user.type(commission, '20');
    await user.click(await screen.findByRole('button', { name: /儲\s*存/ }));

    await vi.waitFor(() => expect(mockUpdateFeeSettings).toHaveBeenCalled());
    // 等 onSuccess 完整跑完（訊息 portal + 表單回填），否則測試會在 React 還有排程工作時就結束
    expect(await screen.findByText('費率設定已更新')).toBeInTheDocument();
    const body = mockUpdateFeeSettings.mock.calls[0][0];
    expect(body.commission_bps).toBe(2000); // 20% → 2000 bps
    expect(body.base_fare_cents).toBe(8500); // 85 元 → 8500 分
    expect(body.monthly_membership_fee_cents).toBe(300000);
  });

  it('非 superadmin 時儲存鈕停用', async () => {
    saveSession('tok', '管理員', 'dispatcher');
    renderWithProviders(<FeeSettingsPage />);

    // 先等表單載入（月會費值唯一），再檢查儲存鈕
    await screen.findByDisplayValue('3000.00');
    expect(screen.getByRole('button', { name: /儲\s*存/ })).toBeDisabled();
  });
});
