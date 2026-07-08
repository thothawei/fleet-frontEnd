import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';

import { api } from './client';

vi.mock('../config', () => ({ API_BASE: '' }));

const mockGetToken = vi.fn(() => 'test-jwt');
const mockClearSession = vi.fn();

vi.mock('../auth/auth', () => ({
  getToken: () => mockGetToken(),
  clearSession: () => mockClearSession(),
}));

describe('api client', () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    mockGetToken.mockReturnValue('test-jwt');
    mockClearSession.mockClear();
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
});
