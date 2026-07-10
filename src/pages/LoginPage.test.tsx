import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LoginPage from './LoginPage';
import { renderWithProviders } from '../test/render';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockSaveSession = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../api/admin', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
}));

vi.mock('../auth/auth', () => ({
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
  isLoggedIn: () => false,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
    mockSaveSession.mockReset();
  });

  it('渲染登入表單', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('Fleet 派遣後台')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('帳號')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密碼')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登 入' })).toBeInTheDocument();
  });

  it('登入成功後儲存 session 並導向首頁', async () => {
    mockLogin.mockResolvedValue({ admin_id: 1, name: '管理員', token: 'tok-abc', role: 'superadmin' });
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByPlaceholderText('帳號'), 'admin');
    await user.type(screen.getByPlaceholderText('密碼'), 'secret');
    await user.click(screen.getByRole('button', { name: '登 入' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'secret');
      expect(mockSaveSession).toHaveBeenCalledWith('tok-abc', '管理員', 'superadmin');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('登入失敗顯示錯誤訊息', async () => {
    mockLogin.mockRejectedValue(new Error('401'));
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByPlaceholderText('帳號'), 'bad');
    await user.type(screen.getByPlaceholderText('密碼'), 'bad');
    await user.click(screen.getByRole('button', { name: '登 入' }));

    await waitFor(() => {
      expect(screen.getByText('登入失敗，請確認帳號密碼')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
