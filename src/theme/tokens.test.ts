import { describe, expect, it } from 'vitest';

import { antdTheme, BRAND_PRIMARY, SEMANTIC } from './tokens';

describe('theme tokens', () => {
  it('主色為 LINE 綠且掛進 antd theme', () => {
    expect(BRAND_PRIMARY).toBe('#06C755');
    expect(antdTheme.token?.colorPrimary).toBe(BRAND_PRIMARY);
    expect(antdTheme.token?.borderRadius).toBe(8);
  });

  it('語意色齊備', () => {
    expect(SEMANTIC.waiting).toBe('#FAAD14');
    expect(SEMANTIC.active).toBe('#1677FF');
    expect(SEMANTIC.done).toBe(BRAND_PRIMARY);
    expect(SEMANTIC.danger).toBe('#F5222D');
    expect(SEMANTIC.offline).toBe('#8C8C8C');
  });
});
