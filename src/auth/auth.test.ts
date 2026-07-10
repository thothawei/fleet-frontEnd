import { beforeEach, describe, expect, it } from 'vitest';

import {
  canDispatch,
  clearSession,
  getAdminName,
  getRole,
  getToken,
  getTokenExpiry,
  isLoggedIn,
  isTokenExpired,
  saveSession,
  setRole,
} from './auth';

/** 組一個只有 payload 有意義的假 JWT（不簽章，前端本來就只解析不驗簽） */
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${b64}.signature`;
}

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

describe('JWT 過期處理', () => {
  const future = Math.floor(Date.now() / 1000) + 3600;
  const past = Math.floor(Date.now() / 1000) - 1;

  beforeEach(() => {
    localStorage.clear();
  });

  it('getTokenExpiry 解析 exp', () => {
    expect(getTokenExpiry(fakeJwt({ exp: future }))).toBe(future);
  });

  it('無法解析的 token 回 null，且不算過期', () => {
    expect(getTokenExpiry('tok-abc')).toBeNull();
    expect(getTokenExpiry('a.!!!not-base64!!!.c')).toBeNull();
    expect(getTokenExpiry(fakeJwt({ sub: 1 }))).toBeNull();
    expect(getTokenExpiry(null)).toBeNull();

    expect(isTokenExpired('tok-abc')).toBe(false);
    expect(isTokenExpired(fakeJwt({ sub: 1 }))).toBe(false);
  });

  it('isTokenExpired 依 exp 判斷', () => {
    expect(isTokenExpired(fakeJwt({ exp: future }))).toBe(false);
    expect(isTokenExpired(fakeJwt({ exp: past }))).toBe(true);
  });

  it('isLoggedIn 遇到過期 token 回 false 並清掉 session', () => {
    saveSession(fakeJwt({ exp: past }), '管理員', 'viewer');
    expect(isLoggedIn()).toBe(false);
    expect(getToken()).toBeNull();
    expect(getRole()).toBe('');
  });

  it('isLoggedIn 對未過期 token 維持登入', () => {
    saveSession(fakeJwt({ exp: future }), '管理員', 'viewer');
    expect(isLoggedIn()).toBe(true);
    expect(getToken()).not.toBeNull();
  });
});
