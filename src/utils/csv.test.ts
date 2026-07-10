import { describe, expect, it, vi } from 'vitest';

import { downloadCsv, toCsv } from './csv';

describe('toCsv', () => {
  it('表頭與資料列以 CRLF 串接', () => {
    expect(toCsv(['a', 'b'], [[1, 2]])).toBe('a,b\r\n1,2');
  });

  it('逸出逗號、雙引號、換行', () => {
    const csv = toCsv(['x'], [['台北,101']]);
    expect(csv).toBe('x\r\n"台北,101"');
    expect(toCsv(['x'], [['他說"嗨"']])).toBe('x\r\n"他說""嗨"""');
    expect(toCsv(['x'], [['第一行\n第二行']])).toBe('x\r\n"第一行\n第二行"');
  });

  it('null / undefined 輸出空字串', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,');
  });
});

describe('downloadCsv', () => {
  it('建立帶 BOM 的 Blob 並觸發 <a download> 點擊', () => {
    // jsdom 的 Blob 沒有 text()，直接攔建構參數比讀回內容可靠
    const blobParts: unknown[][] = [];
    class FakeBlob {
      constructor(parts: unknown[]) {
        blobParts.push(parts);
      }
    }
    vi.stubGlobal('Blob', FakeBlob);

    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadCsv('報表.csv', 'a,b\r\n1,2');

    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    // 點擊後應把暫時的 <a> 從 DOM 移除
    expect(document.querySelector('a[download]')).toBeNull();
    expect(blobParts).toEqual([['\uFEFFa,b\r\n1,2']]);

    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
