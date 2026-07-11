import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { apiError } from './apiError';

function axiosErr(opts: {
  status?: number;
  data?: unknown;
  code?: string;
  withResponse?: boolean;
}): AxiosError {
  const err = new AxiosError('boom', opts.code);
  err.request = {};
  if (opts.withResponse !== false && opts.status !== undefined) {
    err.response = {
      status: opts.status,
      statusText: '',
      data: opts.data,
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
  }
  return err;
}

describe('apiError', () => {
  it('優先用後端回傳的 error 欄位', () => {
    expect(apiError(axiosErr({ status: 400, data: { error: '帳號已存在' } }), 'fallback')).toBe(
      '帳號已存在',
    );
  });

  it('逾時回逾時訊息', () => {
    expect(apiError(axiosErr({ code: 'ECONNABORTED', withResponse: false }), 'fallback')).toBe(
      '請求逾時，請稍後再試',
    );
  });

  it('無回應（斷線）回連線訊息', () => {
    expect(apiError(axiosErr({ withResponse: false }), 'fallback')).toBe(
      '無法連線到伺服器，請檢查網路',
    );
  });

  it('5xx 但無 error 欄位回伺服器錯誤', () => {
    expect(apiError(axiosErr({ status: 502, data: {} }), 'fallback')).toBe(
      '伺服器發生錯誤，請稍後再試',
    );
  });

  it('4xx 無 error 欄位退回 fallback', () => {
    expect(apiError(axiosErr({ status: 404, data: {} }), '找不到')).toBe('找不到');
  });

  it('非 axios 錯誤退回 fallback', () => {
    expect(apiError(new Error('random'), 'fallback')).toBe('fallback');
    expect(apiError('string error', 'fallback')).toBe('fallback');
  });
});
