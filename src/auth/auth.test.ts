import { beforeEach, describe, expect, it } from 'vitest';

import { clearSession, getAdminName, getToken, isLoggedIn, saveSession } from './auth';

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
});
