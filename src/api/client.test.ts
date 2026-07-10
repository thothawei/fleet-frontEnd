import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';

import { api } from './client';

vi.mock('../config', () => ({ API_BASE: '' }));

const mockGetToken = vi.fn(() => 'test-jwt');
const mockClearSession = vi.fn();
const mockIsTokenExpired = vi.fn(() => false);

vi.mock('../auth/auth', () => ({
  getToken: () => mockGetToken(),
  clearSession: () => mockClearSession(),
  isTokenExpired: (...args: unknown[]) => mockIsTokenExpired(...(args as [])),
}));

describe('api client', () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    mockGetToken.mockReturnValue('test-jwt');
    mockClearSession.mockClear();
    mockIsTokenExpired.mockReturnValue(false);
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it('request interceptor 帶 Authorization header', async () => {
    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    await api.get('/admin/fleet');

    const config = vi.mocked(api.defaults.adapter).mock.calls[0]?.[0];
    expect(config?.headers?.Authorization).toBe('Bearer test-jwt');
  });

  it('401 清 session 並導向登入', async () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/orders', href: '' },
      writable: true,
    });

    api.defaults.adapter = vi.fn(async () => {
      throw { response: { status: 401 }, config: {}, isAxiosError: true };
    });

    await expect(api.get('/admin/rides')).rejects.toBeTruthy();
    expect(mockClearSession).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });

  it('token 已過期：request 直接被擋下，不送出請求', async () => {
    mockIsTokenExpired.mockReturnValue(true);
    Object.defineProperty(window, 'location', {
      value: { pathname: '/orders', href: '' },
      writable: true,
    });

    const adapter = vi.fn();
    api.defaults.adapter = adapter;

    await expect(api.get('/admin/rides')).rejects.toThrow('登入已過期，請重新登入');
    expect(adapter).not.toHaveBeenCalled();
    expect(mockClearSession).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });
});
