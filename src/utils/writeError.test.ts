import { describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { QueryClient } from '@tanstack/react-query';

import { handleWriteError, isUncertainWrite } from './writeError';

function axiosErr(status?: number, body?: { error?: string }, code?: string): AxiosError {
  const err = new AxiosError('boom', code);
  if (status !== undefined) {
    err.response = {
      status,
      statusText: '',
      data: body ?? {},
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
  }
  return err;
}

/** 假的 queryClient：只需要記下 invalidateQueries 收到哪些 key。 */
function fakeClient() {
  const calls: unknown[] = [];
  const client = {
    invalidateQueries: (arg: { queryKey: unknown }) => {
      calls.push(arg.queryKey);
      return Promise.resolve();
    },
  } as unknown as QueryClient;
  return { client, calls };
}

describe('isUncertainWrite', () => {
  it('連線類（逾時／完全沒回應）＝結果不明', () => {
    expect(isUncertainWrite(axiosErr(undefined, undefined, 'ECONNABORTED'))).toBe(true);
    expect(isUncertainWrite(axiosErr())).toBe(true);
  });

  it('409 也算結果不明——多半是上一次其實已經生效', () => {
    expect(isUncertainWrite(axiosErr(409, { error: '訂單狀態已變更，無法取消' }))).toBe(true);
  });

  it('明確的失敗不算：400／403／500 都是後端有回答', () => {
    expect(isUncertainWrite(axiosErr(400))).toBe(false);
    expect(isUncertainWrite(axiosErr(403))).toBe(false);
    expect(isUncertainWrite(axiosErr(500))).toBe(false);
  });

  it('不是 axios 錯誤就不算', () => {
    expect(isUncertainWrite(new Error('程式壞了'))).toBe(false);
  });
});

describe('handleWriteError', () => {
  it('逾時：重讀指定的 query，而且訊息不可以說「失敗」', () => {
    const { client, calls } = fakeClient();
    const notify = { warning: vi.fn(), error: vi.fn() };

    handleWriteError(axiosErr(undefined, undefined, 'ECONNABORTED'), '取消失敗', {
      notify,
      queryClient: client,
      invalidate: [['ride', 30], ['rides']],
    });

    expect(calls).toEqual([['ride', 30], ['rides']]);
    expect(notify.error).not.toHaveBeenCalled();
    const msg = notify.warning.mock.calls[0][0] as string;
    expect(msg).toContain('可能已經生效');
    expect(msg).toContain('已重新整理');
    // 這條是本次修正的重點：不能再讓操作者以為「什麼都沒發生，再按一次就好」
    expect(msg).not.toContain('失敗');
    expect(msg).not.toContain('請稍後再試');
  });

  it('409：一樣重讀，並且把後端說的原因原樣帶出來', () => {
    const { client, calls } = fakeClient();
    const notify = { warning: vi.fn(), error: vi.fn() };

    handleWriteError(axiosErr(409, { error: '訂單狀態已變更，無法取消' }), '取消失敗', {
      notify,
      queryClient: client,
      invalidate: [['ride', 30]],
    });

    expect(calls).toEqual([['ride', 30]]);
    expect(notify.warning.mock.calls[0][0]).toContain('訂單狀態已變更，無法取消');
    expect(notify.warning.mock.calls[0][0]).toContain('已重新整理');
  });

  it('明確的失敗：照原本行為顯示原因，且**不動畫面**（免得蓋掉他正在看的東西）', () => {
    const { client, calls } = fakeClient();
    const notify = { warning: vi.fn(), error: vi.fn() };

    handleWriteError(axiosErr(400, { error: '參數錯誤' }), '取消失敗', {
      notify,
      queryClient: client,
      invalidate: [['ride', 30]],
    });

    expect(calls).toEqual([]);
    expect(notify.warning).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith('參數錯誤');
  });
});
