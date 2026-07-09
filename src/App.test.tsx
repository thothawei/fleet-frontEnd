import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { RequireAuth, RequireRole } from './App';
import { renderWithProviders } from './test/render';
import { clearSession, getRole, saveSession } from './auth/auth';

const mockFetchMe = vi.fn();

vi.mock('./api/admin', () => ({
  fetchMe: (...args: unknown[]) => mockFetchMe(...args),
}));

describe('RequireRole', () => {
  beforeEach(() => {
    clearSession();
  });

  it('角色不足（viewer）時不顯示受保護內容', () => {
    saveSession('tok', '王小明', 'viewer');

    renderWithProviders(
      <RequireRole min="superadmin">
        <div>機密內容</div>
      </RequireRole>,
      { route: '/users' },
    );

    expect(screen.queryByText('機密內容')).not.toBeInTheDocument();
  });

  it('角色足夠（superadmin）時顯示受保護內容', () => {
    saveSession('tok', '王小明', 'superadmin');

    renderWithProviders(
      <RequireRole min="superadmin">
        <div>機密內容</div>
      </RequireRole>,
      { route: '/users' },
    );

    expect(screen.getByText('機密內容')).toBeInTheDocument();
  });
});

describe('RequireAuth bootstrap gate', () => {
  beforeEach(() => {
    clearSession();
    mockFetchMe.mockReset();
  });

  it('未登入時不顯示受保護內容（導向 /login）', () => {
    renderWithProviders(
      <RequireAuth>
        <div>受保護內容</div>
      </RequireAuth>,
    );

    expect(screen.queryByText('受保護內容')).not.toBeInTheDocument();
    expect(mockFetchMe).not.toHaveBeenCalled();
  });

  it('已登入且已有 role 時直接顯示內容，不呼叫 fetchMe', () => {
    saveSession('tok', '王小明', 'dispatcher');

    renderWithProviders(
      <RequireAuth>
        <div>受保護內容</div>
      </RequireAuth>,
    );

    expect(screen.getByText('受保護內容')).toBeInTheDocument();
    expect(mockFetchMe).not.toHaveBeenCalled();
  });

  it('已登入但 role 尚未載入時，先打 fetchMe 補 role；解析完成前不洩漏受保護內容（避免 race condition 誤導向）', async () => {
    saveSession('tok', '王小明'); // 無 role
    let resolveFetchMe!: (v: { id: number; username: string; role: string }) => void;
    mockFetchMe.mockReturnValue(
      new Promise((resolve) => {
        resolveFetchMe = resolve;
      }),
    );

    renderWithProviders(
      <RequireAuth>
        <div>受保護內容</div>
      </RequireAuth>,
    );

    // fetchMe 解析前：不應顯示受保護內容（也不應誤判為需要重新登入）
    expect(screen.queryByText('受保護內容')).not.toBeInTheDocument();
    expect(mockFetchMe).toHaveBeenCalled();

    resolveFetchMe({ id: 1, username: 'admin', role: 'superadmin' });

    await waitFor(() => {
      expect(screen.getByText('受保護內容')).toBeInTheDocument();
    });
    expect(getRole()).toBe('superadmin');
  });

  it('fetchMe 失敗時仍會結束載入狀態並顯示內容（由後端與 RequireRole 把關）', async () => {
    saveSession('tok', '王小明');
    mockFetchMe.mockRejectedValue(new Error('network'));

    renderWithProviders(
      <RequireAuth>
        <div>受保護內容</div>
      </RequireAuth>,
    );

    await waitFor(() => {
      expect(screen.getByText('受保護內容')).toBeInTheDocument();
    });
  });
});
