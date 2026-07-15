import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MembershipInvoicesPage from './MembershipInvoicesPage';
import { renderWithProviders } from '../test/render';
import { saveSession, clearSession } from '../auth/auth';

const mockFetch = vi.fn();
const mockGenerate = vi.fn();
const mockSetPaid = vi.fn();
const mockMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };

vi.mock('../api/admin', () => ({
  fetchMembershipInvoices: (...a: unknown[]) => mockFetch(...a),
  generateMembershipInvoices: (...a: unknown[]) => mockGenerate(...a),
  setMembershipInvoicePaid: (...a: unknown[]) => mockSetPaid(...a),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  const MockApp = Object.assign(({ children }: { children: ReactNode }) => children, {
    useApp: () => ({ message: mockMessage, modal: { confirm: vi.fn() }, notification: {} }),
  });
  return { ...actual, App: MockApp };
});

const ROWS = [
  { id: 1, driver_id: 1, driver_name: '司機甲', period: '2026-07', amount_cents: 300000, status: 'unpaid', paid_at: null },
  { id: 2, driver_id: 2, driver_name: '司機乙', period: '2026-07', amount_cents: 300000, status: 'paid', paid_at: '2026-07-05T10:00:00+08:00' },
];

describe('MembershipInvoicesPage', () => {
  beforeEach(() => {
    mockFetch.mockReset().mockResolvedValue(ROWS);
    mockGenerate.mockReset().mockResolvedValue({ created: 3, amount_cents: 300000 });
    mockSetPaid.mockReset().mockResolvedValue(undefined);
    mockMessage.success.mockReset();
  });

  it('顯示會費帳單列表與未繳/已繳計數', async () => {
    saveSession('tok', '管理員', 'superadmin');
    renderWithProviders(<MembershipInvoicesPage />);

    await waitFor(() => expect(screen.getByText('司機甲')).toBeInTheDocument());
    expect(screen.getByText('司機乙')).toBeInTheDocument();
    expect(screen.getAllByText('NT$ 3,000')).toHaveLength(2);
    expect(screen.getByText('未繳 1')).toBeInTheDocument();
    expect(screen.getByText('已繳 1')).toBeInTheDocument();
  });

  it('superadmin 產生本月帳單', async () => {
    saveSession('tok', '管理員', 'superadmin');
    const user = userEvent.setup();
    renderWithProviders(<MembershipInvoicesPage />);
    await waitFor(() => expect(screen.getByText('司機甲')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /產生本月帳單/ }));
    // Popconfirm 確認（antd 兩字中文按鈕會插空格 → /確\s*定/）
    await user.click(await screen.findByRole('button', { name: /確\s*定/ }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/)));
    await waitFor(() => expect(mockMessage.success).toHaveBeenCalledWith('已產生 3 筆會費帳單'));
  });

  it('superadmin 標記已繳送出 paid=true', async () => {
    saveSession('tok', '管理員', 'superadmin');
    const user = userEvent.setup();
    renderWithProviders(<MembershipInvoicesPage />);
    await waitFor(() => expect(screen.getByText('司機甲')).toBeInTheDocument());

    // 司機甲（未繳）該列的「標記已繳」
    const row = screen.getByText('司機甲').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: '標記已繳' }));
    // Popconfirm 確認（antd 兩字中文按鈕會插空格 → /確\s*定/）
    await user.click(await screen.findByRole('button', { name: /確\s*定/ }));

    await waitFor(() => expect(mockSetPaid).toHaveBeenCalledWith(1, true));
  });

  it('viewer 看不到產生按鈕與操作欄', async () => {
    clearSession();
    saveSession('tok', '檢視者', 'viewer');
    renderWithProviders(<MembershipInvoicesPage />);
    await waitFor(() => expect(screen.getByText('司機甲')).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: /產生本月帳單/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '標記已繳' })).not.toBeInTheDocument();
  });
});
