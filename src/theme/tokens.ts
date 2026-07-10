import type { ThemeConfig } from 'antd';

/** LINE 綠品牌主色（spec §1.1）——三端統一 */
export const BRAND_PRIMARY = '#06C755';

/** 狀態語意色（spec §1.1）：訂單/司機狀態 tag、KPI 卡共用 */
export const SEMANTIC = {
  waiting: '#FAAD14',
  active: '#1677FF',
  done: BRAND_PRIMARY,
  danger: '#F5222D',
  offline: '#8C8C8C',
} as const;

/** AntD v5 全站主題——只在 main.tsx 掛一次（spec §1.3） */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND_PRIMARY,
    colorLink: BRAND_PRIMARY,
    borderRadius: 8,
  },
  components: {
    Layout: { siderBg: '#ffffff', headerBg: '#ffffff' },
    Menu: {
      itemSelectedBg: '#e6f9ee',
      itemSelectedColor: '#059648',
    },
  },
};
