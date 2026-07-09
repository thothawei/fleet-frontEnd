import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UsersPage from './UsersPage';
import { renderWithProviders } from '../test/render';

const mockListAdmins = vi.fn();
const mockCreateAdmin = vi.fn();
const mockUpdateAdmin = vi.fn();

vi.mock('../api/admin', () => ({
  listAdmins: (...args: unknown[]) => mockListAdmins(...args),
  createAdmin: (...args: unknown[]) => mockCreateAdmin(...args),
  updateAdmin: (...args: unknown[]) => mockUpdateAdmin(...args),
}));

describe('UsersPage', () => {
  beforeEach(() => {
    mockListAdmins.mockReset();
    mockCreateAdmin.mockReset();
    mockUpdateAdmin.mockReset();
    mockListAdmins.mockResolvedValue([
      { id: 1, username: 'root', role: 'superadmin', is_active: true, created_at: '2026-07-09' },
      { id: 2, username: 'ops', role: 'dispatcher', is_active: true, created_at: '2026-07-09' },
    ]);
  });

  it('載入並顯示帳號列表', async () => {
    renderWithProviders(<UsersPage />);

    expect(screen.getByText('使用者管理')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('root')).toBeInTheDocument();
    });

    expect(screen.getByText('ops')).toBeInTheDocument();
    expect(mockListAdmins).toHaveBeenCalled();
  });

  it('開啟新增帳號 Modal', async () => {
    mockCreateAdmin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />);

    await waitFor(() => expect(screen.getByText('root')).toBeInTheDocument());

    await user.click(screen.getByText('新增帳號'));

    expect(await screen.findByText('新增後台帳號')).toBeInTheDocument();
  });
});
