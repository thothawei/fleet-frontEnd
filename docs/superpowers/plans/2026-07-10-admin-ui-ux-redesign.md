# Admin 後台 UI/UX 翻新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 line-fleet-admin 從 AntD 預設樣式升級為 LINE 綠品牌主題，新增營運總覽 Dashboard 首頁，並統一狀態語意色與頁面骨架。

**Architecture:** 純 presentation 層改動——`ConfigProvider` theme tokens 一處定義全站生效；Dashboard 用既有 `/admin/fleet`、`/admin/rides`、`/admin/drivers` API 組合，不需後端新端點；即時車隊地圖從 `/` 移到 `/fleet`。

**Tech Stack:** React 18 + TypeScript + Vite、Ant Design v5（`ConfigProvider` theme）、TanStack Query、MapLibre GL、vitest + @testing-library/react。

**Spec:** `docs/superpowers/specs/2026-07-10-fleet-ui-ux-redesign-design.md`

## Global Constraints

- 品牌主色 `#06C755`（LINE 綠）；圓角 `borderRadius: 8`。
- 狀態語意色三端統一：等待＝琥珀 `#FAAD14`、進行中＝藍 `#1677FF` 系、完成＝綠（primary）、取消／錯誤＝紅 `#F5222D`、離線＝灰。
- 不動任何 API／WS 接線邏輯與後端契約。
- 每個 task 結尾：`npm test` 全過才 commit；工作目錄 `/Users/mac/Documents/line-fleet-admin`，直接在 `main` commit。
- UI 文案改動時同步更新對應 `*.test.tsx` 斷言，不得弱化測試（只改文案字串，不刪 expect）。

---

### Task 1: 品牌 theme tokens + 狀態語意色

**Files:**
- Create: `src/theme/tokens.ts`
- Modify: `src/main.tsx`（`ConfigProvider` 掛 theme）
- Modify: `src/constants.ts`（狀態 tag 色對齊語意色）
- Test: `src/theme/tokens.test.ts`

**Interfaces:**
- Produces: `antdTheme: ThemeConfig`、`BRAND_PRIMARY = '#06C755'`、`SEMANTIC = { waiting, active, done, danger, offline }`（後續 task 的 Dashboard KPI、PageHeader 會 import `BRAND_PRIMARY` / `SEMANTIC`）。

- [ ] **Step 1: 寫失敗測試**

`src/theme/tokens.test.ts`：

```ts
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/theme/tokens.test.ts`
Expected: FAIL（`Cannot find module './tokens'`）

- [ ] **Step 3: 實作 `src/theme/tokens.ts`**

```ts
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
```

- [ ] **Step 4: `src/main.tsx` 掛 theme**

`<ConfigProvider locale={zhTW}>` 改為 `<ConfigProvider locale={zhTW} theme={antdTheme}>`，並加 `import { antdTheme } from './theme/tokens';`。

- [ ] **Step 5: `src/constants.ts` 對齊語意色**

RIDE_STATUS / DRIVER_STATUS 的 `color` 改為（label 全部不動，避免破壞測試斷言）：

```ts
// 訂單狀態（對齊後端 constants/ride.go；tag 色對齊 spec §1.1 語意色）
export const RIDE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '待派單', color: 'warning' },
  1: { label: '已派單', color: 'processing' },
  2: { label: '前往接客', color: 'blue' },
  3: { label: '行程中', color: 'geekblue' },
  4: { label: '已完成', color: 'success' },
  9: { label: '已取消', color: 'error' },
};

// 司機狀態（對齊後端 constants/driver.go）
export const DRIVER_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '離線', color: 'default' },
  1: { label: '待命', color: 'success' },
  2: { label: '載客中', color: 'blue' },
  3: { label: '已停用', color: 'error' },
};
```

（其餘 `DRIVER_STATUS_DISABLED`、`isRideCancellable` 保持原樣。）

- [ ] **Step 6: 全測試 + commit**

Run: `npm test`
Expected: 全過（色值不影響既有 label 斷言）。

```bash
git add src/theme/tokens.ts src/theme/tokens.test.ts src/main.tsx src/constants.ts
git commit -m "feat(theme): LINE 綠品牌 tokens + 狀態語意色（UI/UX 翻新 Task 1）"
```

---

### Task 2: AppLayout 品牌化（亮色側欄＋logo 區＋選單改版）

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Test: `src/components/AppLayout.test.tsx`（更新選單斷言）

**Interfaces:**
- Consumes: `BRAND_PRIMARY`（Task 1）。
- Produces: 選單 key 集合 `['/', '/fleet', '/orders', '/drivers', '/reports', '/settings']`（＋superadmin `/users`）；Task 3 的路由表必須與此一致。

- [ ] **Step 1: 更新測試斷言（先失敗）**

在 `src/components/AppLayout.test.tsx` 既有選單斷言處，加入／改為：

```ts
expect(screen.getByText('營運總覽')).toBeInTheDocument();
expect(screen.getByText('即時車隊')).toBeInTheDocument();
expect(screen.getByText('Fleet 派遣後台')).toBeInTheDocument();
```

Run: `npx vitest run src/components/AppLayout.test.tsx` → Expected: FAIL（尚無「營運總覽」）。

- [ ] **Step 2: 改寫 `AppLayout.tsx`**

```tsx
import { BarChartOutlined, CarOutlined, DashboardOutlined, EnvironmentOutlined, LogoutOutlined, OrderedListOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import { Layout, Menu, Typography, Button } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearSession, getAdminName, getRole } from '../auth/auth';
import { BRAND_PRIMARY } from '../theme/tokens';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '營運總覽' },
  { key: '/fleet', icon: <EnvironmentOutlined />, label: '即時車隊' },
  { key: '/orders', icon: <OrderedListOutlined />, label: '訂單管理' },
  { key: '/drivers', icon: <CarOutlined />, label: '司機管理' },
  { key: '/reports', icon: <BarChartOutlined />, label: '日報表' },
  { key: '/settings', icon: <SettingOutlined />, label: '設定' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    clearSession();
    navigate('/login');
  };

  // 使用者管理僅 superadmin 可見（後端亦有對應權限檢查）
  const items =
    getRole() === 'superadmin'
      ? [...menuItems, { key: '/users', icon: <TeamOutlined />, label: '使用者管理' }]
      : menuItems;

  // /orders/:id 詳情頁時側欄仍高亮「訂單管理」
  const selectedKey = location.pathname.startsWith('/orders') ? '/orders' : location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" breakpoint="lg" collapsedWidth="0">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 24px' }}>
          <span
            style={{
              width: 32, height: 32, borderRadius: 8, background: BRAND_PRIMARY,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}
          >
            🚗
          </span>
          <Typography.Text strong>Fleet 派遣後台</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 24, borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong>叫車派遣營運後台</Typography.Text>
          <span>
            <Typography.Text style={{ marginRight: 16 }}>{getAdminName()}</Typography.Text>
            <Button icon={<LogoutOutlined />} onClick={logout}>登出</Button>
          </span>
        </Header>
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 3: 測試 + commit**

Run: `npm test` → Expected: 全過。

```bash
git add src/components/AppLayout.tsx src/components/AppLayout.test.tsx
git commit -m "feat(layout): 亮色側欄品牌化＋營運總覽選單（Task 2）"
```

---

### Task 3: Dashboard 首頁 + 路由調整

**Files:**
- Create: `src/pages/DashboardPage.tsx`
- Modify: `src/App.tsx`（`/` → Dashboard、`/fleet` → FleetPage）
- Test: `src/pages/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `fetchRides(status?, limit)`、`fetchDrivers()`、`fetchFleet()`（`src/api/admin.ts` 既有）；`SEMANTIC`（Task 1）；`RIDE_STATUS`。
- Produces: route `/` 為 DashboardPage；FleetPage 移至 `/fleet`（與 Task 2 選單 key 對齊）。

- [ ] **Step 1: 寫失敗測試 `src/pages/DashboardPage.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import DashboardPage from './DashboardPage';
import { renderWithProviders } from '../test/render';

const mockFetchRides = vi.fn();
const mockFetchDrivers = vi.fn();
const mockFetchFleet = vi.fn();

vi.mock('../api/admin', () => ({
  fetchRides: (...a: unknown[]) => mockFetchRides(...a),
  fetchDrivers: (...a: unknown[]) => mockFetchDrivers(...a),
  fetchFleet: (...a: unknown[]) => mockFetchFleet(...a),
}));

const today = new Date().toISOString();

describe('DashboardPage', () => {
  beforeEach(() => {
    mockFetchRides.mockReset().mockResolvedValue([
      { id: 1, customer_id: 9, driver_id: 5, status: 4, pickup_address: '台北車站', requested_at: today, completed_at: today, distance_m: 1200 },
      { id: 2, customer_id: 9, driver_id: 5, status: 2, pickup_address: '市政府', requested_at: today, completed_at: null, distance_m: null },
      { id: 3, customer_id: 8, driver_id: null, status: 9, pickup_address: '松山機場', requested_at: today, completed_at: null, distance_m: null },
    ]);
    mockFetchDrivers.mockReset().mockResolvedValue([
      { ID: 1, LineUserID: 'l1', Name: '司機甲', Phone: '0911', Status: 1 },
      { ID: 2, LineUserID: 'l2', Name: '司機乙', Phone: '0912', Status: 0 },
    ]);
    mockFetchFleet.mockReset().mockResolvedValue([]);
  });

  it('顯示 KPI：今日訂單/完成/取消/在線司機/進行中', async () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('營運總覽')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('今日訂單')).toBeInTheDocument();
    });
    // 今日 3 筆、完成 1、取消 1、在線司機 1（Status!=0 且 !=3）、進行中 1（status 1-3）
    expect(screen.getByTestId('kpi-today').textContent).toContain('3');
    expect(screen.getByTestId('kpi-done').textContent).toContain('1');
    expect(screen.getByTestId('kpi-cancelled').textContent).toContain('1');
    expect(screen.getByTestId('kpi-online').textContent).toContain('1');
    expect(screen.getByTestId('kpi-active').textContent).toContain('1');
  });

  it('顯示最近訂單表', async () => {
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('台北車站')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/pages/DashboardPage.test.tsx`
Expected: FAIL（`Cannot find module './DashboardPage'`）

- [ ] **Step 3: 實作 `src/pages/DashboardPage.tsx`**

```tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Empty, Row, Skeleton, Statistic, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';

import { fetchDrivers, fetchFleet, fetchRides, type RideRow } from '../api/admin';
import { RIDE_STATUS, DRIVER_STATUS_DISABLED } from '../constants';
import { SEMANTIC } from '../theme/tokens';

/** requested_at 是否為今天（本地時區） */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const recentColumns = [
  { title: '編號', dataIndex: 'id', render: (id: number) => <Link to={`/orders/${id}`}>#{id}</Link> },
  { title: '上車地址', dataIndex: 'pickup_address', ellipsis: true },
  {
    title: '狀態',
    dataIndex: 'status',
    render: (s: number) => {
      const meta = RIDE_STATUS[s];
      return meta ? <Tag color={meta.color}>{meta.label}</Tag> : s;
    },
  },
  {
    title: '叫車時間',
    dataIndex: 'requested_at',
    render: (t: string) => new Date(t).toLocaleTimeString('zh-TW'),
  },
];

export default function DashboardPage() {
  const { data: rides = [], isLoading: ridesLoading } = useQuery({ queryKey: ['rides', 'dashboard'], queryFn: () => fetchRides(undefined, 200) });
  const { data: drivers = [], isLoading: driversLoading } = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers });
  const { data: fleet = [] } = useQuery({ queryKey: ['fleet'], queryFn: fetchFleet });

  const kpi = useMemo(() => {
    const todayRides = rides.filter((r: RideRow) => isToday(r.requested_at));
    return {
      today: todayRides.length,
      done: todayRides.filter((r) => r.status === 4).length,
      cancelled: todayRides.filter((r) => r.status === 9).length,
      active: rides.filter((r) => r.status >= 1 && r.status <= 3).length,
      online: drivers.filter((d) => d.Status !== 0 && d.Status !== DRIVER_STATUS_DISABLED).length,
    };
  }, [rides, drivers]);

  const loading = ridesLoading || driversLoading;
  const recent = useMemo(() => rides.slice(0, 10), [rides]);

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>營運總覽</Typography.Title>
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={8} lg={4}><Card><Statistic title="今日訂單" value={kpi.today} data-testid="kpi-today" /></Card></Col>
            <Col xs={12} md={8} lg={4}><Card><Statistic title="今日完成" value={kpi.done} valueStyle={{ color: SEMANTIC.done }} data-testid="kpi-done" /></Card></Col>
            <Col xs={12} md={8} lg={4}><Card><Statistic title="今日取消" value={kpi.cancelled} valueStyle={{ color: SEMANTIC.danger }} data-testid="kpi-cancelled" /></Card></Col>
            <Col xs={12} md={8} lg={4}><Card><Statistic title="在線司機" value={kpi.online} valueStyle={{ color: SEMANTIC.active }} data-testid="kpi-online" /></Card></Col>
            <Col xs={12} md={8} lg={4}><Card><Statistic title="進行中行程" value={kpi.active} valueStyle={{ color: SEMANTIC.waiting }} data-testid="kpi-active" /></Card></Col>
            <Col xs={12} md={8} lg={4}><Card><Statistic title="回報位置車輛" value={fleet.length} /></Card></Col>
          </Row>
          <Card
            title="最近訂單"
            extra={<Link to="/orders">全部訂單 →</Link>}
            style={{ marginTop: 16 }}
          >
            <Table
              rowKey="id"
              size="small"
              columns={recentColumns}
              dataSource={recent}
              pagination={false}
              locale={{ emptyText: <Empty description="今天還沒有訂單" /> }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
```

注意：AntD `Statistic` 不透傳 `data-testid` 時，改包一層 `<div data-testid="...">`——以實際測試結果為準修正，**不得改弱測試**。

- [ ] **Step 4: `src/App.tsx` 路由調整**

- 加 `const DashboardPage = lazy(() => import('./pages/DashboardPage'));`
- `<Route path="/" element={<FleetPage />} />` 改為兩條：

```tsx
<Route path="/" element={<DashboardPage />} />
<Route path="/fleet" element={<FleetPage />} />
```

- [ ] **Step 5: 測試 + commit**

Run: `npm test` → Expected: 全過（含既有 FleetPage 測試）。

```bash
git add src/pages/DashboardPage.tsx src/pages/DashboardPage.test.tsx src/App.tsx
git commit -m "feat(dashboard): 營運總覽首頁＋即時車隊移至 /fleet（Task 3）"
```

---

### Task 4: 登入頁品牌化

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Test: `src/pages/LoginPage.test.tsx`（若斷言「🚗 派遣後台登入」需同步改字串）

**Interfaces:**
- Consumes: `BRAND_PRIMARY`（Task 1）。表單欄位、`login()`、`saveSession()` 呼叫完全不動。

- [ ] **Step 1: 改版面（僅外觀）**

`LoginPage.tsx` 的外層 div 與標題區改為：

```tsx
<div
  style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(160deg, ${BRAND_PRIMARY}22 0%, #f5f5f5 55%)`,
  }}
>
  <Card style={{ width: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
    <div style={{ textAlign: 'center', marginBottom: 8 }}>
      <span
        style={{
          width: 48, height: 48, borderRadius: 12, background: BRAND_PRIMARY, fontSize: 26,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        🚗
      </span>
    </div>
    <Typography.Title level={3} style={{ textAlign: 'center', marginTop: 0 }}>
      Fleet 派遣後台
    </Typography.Title>
    <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
      營運管理系統登入
    </Typography.Paragraph>
    {/* 既有 <Form> 區塊原樣保留 */}
  </Card>
</div>
```

並加 `import { BRAND_PRIMARY } from '../theme/tokens';`。

- [ ] **Step 2: 同步測試字串**

`LoginPage.test.tsx` 若斷言舊標題「🚗 派遣後台登入」，改為 `Fleet 派遣後台`（僅字串，expect 結構不動）。

- [ ] **Step 3: 測試 + commit**

Run: `npm test` → Expected: 全過。

```bash
git add src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx
git commit -m "feat(login): 登入頁品牌化（Task 4）"
```

---

### Task 5: 各頁精修（空狀態＋標題列一致性）

**Files:**
- Create: `src/components/PageHeader.tsx`
- Modify: `src/pages/OrdersPage.tsx`、`src/pages/DriversPage.tsx`、`src/pages/ReportsPage.tsx`
- Test: 既有各頁 `*.test.tsx`（標題文字不變即不需改）

**Interfaces:**
- Produces: `<PageHeader title extra? />`——`title: string`、`extra?: ReactNode`。

- [ ] **Step 1: 實作 `src/components/PageHeader.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Typography } from 'antd';

/** 全站統一頁面標題列：左標題、右操作區（spec §4.3） */
export default function PageHeader({ title, extra }: { title: string; extra?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
      {extra}
    </div>
  );
}
```

- [ ] **Step 2: 三頁套用**

各頁把 `Card title="訂單管理"`（或同義寫法）改為：頁面最外層先放 `<PageHeader title="訂單管理" extra={原本的篩選器/操作區} />`，Card 保留但拿掉重複 title；**顯示文字保持「訂單管理」「司機管理」「日報表」不變**（測試斷言依賴）。每頁 `Table` 補：

```tsx
locale={{ emptyText: <Empty description="目前沒有資料" /> }}
```

（`import { Empty } from 'antd';`）

- [ ] **Step 3: 測試 + commit**

Run: `npm test` → Expected: 全過。

```bash
git add src/components/PageHeader.tsx src/pages/OrdersPage.tsx src/pages/DriversPage.tsx src/pages/ReportsPage.tsx
git commit -m "refactor(pages): 統一 PageHeader＋表格空狀態（Task 5）"
```

---

### Task 6: 整體驗收（build＋瀏覽器實測）＋收尾

**Files:**
- Modify: `README.md`（結構段補 `theme/`、`DashboardPage`）、`docs/TODO.md`（記錄本次完成項）

- [ ] **Step 1: 全量驗證**

```bash
npm test        # 全過
npm run build   # tsc -b + vite build 過
npm run lint    # oxlint 過
```

- [ ] **Step 2: 瀏覽器實測**

`npm start`（起後端 docker + vite）後逐頁檢查：登入頁品牌樣式 → `/` Dashboard KPI 有數字 → `/fleet` 地圖正常 → 訂單／司機／日報表 tag 色與空狀態 → 側欄高亮正確（含 `/orders/:id`）。有 `npm run visual:verify` 就一併跑。驗完 `npm run stop` 關乾淨。

- [ ] **Step 3: 文件收尾 + commit + push**

```bash
git add README.md docs/TODO.md
git commit -m "docs: UI/UX 翻新收尾——README 結構與 TODO 回填"
git push
```

---

## Self-Review 紀錄

- Spec 覆蓋：§1.3（Task 1）、§4.1（Task 3）、§4.2（Task 2、4）、§4.3（Task 1、5）、§5 驗收（Task 6）——齊。
- 型別一致：`SEMANTIC`／`BRAND_PRIMARY`／`PageHeader` 介面在各 task 引用一致。
- 無 TBD／佔位。
