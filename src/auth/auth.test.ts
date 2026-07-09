import { beforeEach, describe, expect, it } from 'vitest';

import {
  canDispatch,
  clearSession,
  getAdminName,
  getRole,
  getToken,
  isLoggedIn,
  saveSession,
  setRole,
} from './auth';

describe('auth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saveSession / getToken / getAdminName', () => {
    saveSession('tok-abc', '管理員A');
    expect(getToken()).toBe('tok-abc');
    expect(getAdminName()).toBe('管理員A');
    expect(isLoggedIn()).toBe(true);
  });

  it('clearSession 清除登入狀態', () => {
    saveSession('tok', 'name');
    clearSession();
    expect(getToken()).toBeNull();
    expect(isLoggedIn()).toBe(false);
    expect(getAdminName()).toBe('管理員');
  });

  it('saveSession 存 role、getRole 取回', () => {
    saveSession('t', '管理員', 'dispatcher');
    expect(getRole()).toBe('dispatcher');
  });

  it('setRole 覆寫 role', () => {
    saveSession('t', '管理員', 'viewer');
    setRole('superadmin');
    expect(getRole()).toBe('superadmin');
  });

  it('canDispatch：viewer 為 false，dispatcher/superadmin 為 true，未登入為 false', () => {
    setRole('viewer');
    expect(canDispatch()).toBe(false);

    setRole('dispatcher');
    expect(canDispatch()).toBe(true);

    setRole('superadmin');
    expect(canDispatch()).toBe(true);

    localStorage.clear();
    expect(canDispatch()).toBe(false);
  });
});
