import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FeeSettingsPage from './FeeSettingsPage';
import { renderWithProviders } from '../test/render';
import { saveSession, clearSession } from '../auth/auth';

const mockFetchFeeSettings = vi.fn();
const mockUpdateFeeSettings = vi.fn();
// App.useApp() 的 message spy：不渲染真 toast（無 3 秒 timer），直接斷言呼叫
const mockMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };

vi.mock('../api/admin', () => ({
  fetchFeeSettings: (...a: unknown[]) => mockFetchFeeSettings(...a),
  updateFeeSettings: (...a: unknown[]) => mockUpdateFeeSettings(...a),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  const MockApp = Object.assign(({ children }: { children: ReactNode }) => children, {
    useApp: () => ({ message: mockMessage, modal: { confirm: vi.fn() }, notification: {} }),
  });
  return { ...actual, App: MockApp };
});

const defaultFees = {
  base_fare_cents: 8500,
  per_km_fare_cents: 2000,
  min_fare_cents: 8500,
  commission_bps: 1500,
  monthly_membership_fee_cents: 300000,
  lost_item_fee_bps: 1000,
};

describe('FeeSettingsPage', () => {
  beforeEach(() => {
    clearSession();
    mockFetchFeeSettings.mockReset().mockResolvedValue(defaultFees);
    mockUpdateFeeSettings.mockReset().mockResolvedValue(defaultFees);
    mockMessage.success.mockReset();
  });

  it('把後端「分/bps」換算成「元/%」填入表單', async () => {
    saveSession('tok', '管理員', 'superadmin');
    renderWithProviders(<FeeSettingsPage />);

    // 台幣無小數：金額欄位（元）為整數；百分比欄位（%）保留 2 位小數。
    // 2000 分 → 20 元（每公里）、1500 bps → 15 %、300000 分 → 3000 元（月會費）、
    // 1000 bps → 10 %（遺失物處理費）。起步價/最低車資皆 85 元（值重複），故以唯一值驗證。
    expect(await screen.findByDisplayValue('15.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10.00')).toBeInTheDocument();
    // 85 元出現兩次（起步價+最低車資）
    expect(screen.getAllByDisplayValue('85')).toHaveLength(2);
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
    // 等 onSuccess 完整跑完（成功訊息），否則測試會在 React 還有排程工作時就結束
    await vi.waitFor(() => expect(mockMessage.success).toHaveBeenCalledWith('費率設定已更新'));
    const body = mockUpdateFeeSettings.mock.calls[0][0];
    expect(body.commission_bps).toBe(2000); // 20% → 2000 bps
    expect(body.base_fare_cents).toBe(8500); // 85 元 → 8500 分
    expect(body.monthly_membership_fee_cents).toBe(300000);
    expect(body.lost_item_fee_bps).toBe(1000); // 10% → 1000 bps
  });

  it('非 superadmin 時儲存鈕停用', async () => {
    saveSession('tok', '管理員', 'dispatcher');
    renderWithProviders(<FeeSettingsPage />);

    // 先等表單載入（月會費值唯一），再檢查儲存鈕
    await screen.findByDisplayValue('3000');
    expect(screen.getByRole('button', { name: /儲\s*存/ })).toBeDisabled();
  });
});
