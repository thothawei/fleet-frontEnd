# line-fleet-admin — 缺口清單

> 建立：2026-07-08。最後盤點：2026-07-08（以程式碼實測為準）。
> 編號沿用後端 repo 的 [gap-analysis-plan](../../line-fleet-dispatch/docs/2026-07-07-gap-analysis-plan.md)（C=後台前端、D=後端）。
> 每完成一項：實跑驗收 → 勾選回填 → commit + push（main）。

---

## 現況摘要

| 面向 | 狀態 |
|---|---|
| 核心瀏覽 | ✅ 登入、即時車隊地圖、訂單列表/詳情+軌跡回放、司機列表、日報表 |
| 寫入操作 | ✅ 司機啟停、派單參數、強制取消（2026-07-08） |
| 測試 | 🟡 7 個測試檔；缺 Fleet/Reports/WS |
| CI | ✅ lint + test + build（`.github/workflows/ci.yml`） |
| 視覺驗收 | ✅ C5 完成（6/6 頁，`docs/screenshots/c5-2026-07-08/`） |

**一句話**：「看」已齊全；「管」核心寫入（C2/C3/強制取消）已串接 P2 API。

---

## 一、已完成 ✅

- [x] **C2. 司機審核啟用/停用 UI** — `DriversPage.tsx`：Switch + 停用確認 + `patchDriverStatus`
- [x] **C3. 派單參數設定頁** — `SettingsPage.tsx`：GET/PUT dispatch settings 表單
- [x] **後台強制取消訂單** — `OrderDetailPage.tsx`：進行中訂單「強制取消」+ Modal 確認
- [x] **側欄「設定」入口** — `/settings` 路由 + AppLayout 選單

- [x] **C1. 訂單詳情 + 軌跡回放** — `OrderDetailPage.tsx`：MapLibre 軌跡線、播放/暫停/Slider 回放
- [x] **C4a. 前端測試** — Vitest + Testing Library（`npm test`）：`admin.test.ts`、`LoginPage`、`OrdersPage`、`OrderDetailPage`
- [x] **C4b. Bundle code-splitting** — 路由 lazy import（`App.tsx` Suspense + dynamic import）
- [x] **CI pipeline** — `.github/workflows/ci.yml`（oxlint → vitest → `tsc -b && vite build`）
- [x] **C5. 視覺驗證** — `npm run visual:verify`；6/6 頁截圖（`docs/screenshots/c5-2026-07-08/`）
- [x] **後端欄位兼容** — `normalizeRide` / `parseTrackCoordinates` 兼容 PascalCase/snake_case 與 LineString/Feature GeoJSON（2026-07-08 修復）
- [x] **D4 狀態時間軸** — `OrderDetailPage` 顯示 `events`（叫車→派單→接單…），`fetchRideDetail` 正規化

---

## 二、待後端 API（阻塞中，勿先做 UI）

> P2 後端 API 已就緒（2026-07-08）；C2/C3/強制取消前端已串接 ✅。D4 `events` 前端已串接 ✅。

| 編號 | 項目 | 後端端點 | 狀態 |
|---|---|---|---|
| C2 | 司機審核啟用/停用 UI | `PATCH /api/admin/drivers/:id/status` | ✅ |
| C3 | 派單參數設定頁 | `GET/PUT /api/admin/settings/dispatch` | ✅ |
| — | 後台強制取消訂單 | `POST /api/admin/rides/:id/cancel` | ✅ |

---

## 三、前端可獨立補強（不依賴後端新 API）

### 3.1 品質與測試

- [x] **C5. 視覺驗證** ✅ 2026-07-08
  - 腳本：`npm run visual:verify`（Playwright 載入 6 頁截圖）
  - 證據：`docs/screenshots/c5-2026-07-08/`（6/6 通過 + `report.json`）
  - 修復：FleetPage / OrderDetailPage 地圖容器 loading 期間未掛載導致 MapLibre 永不初始化
- [x] **補 FleetPage 測試** — `FleetPage.test.tsx`
- [x] **補 DriversPage 測試** — 列表渲染、啟停 Switch mutation
- [x] **補 ReportsPage 測試** — `ReportsPage.test.tsx`
- [x] **補 useFleetSocket 測試** — `useFleetSocket.test.tsx` + `fleetSocketUtils.test.ts`
- [x] **補 auth.ts / client.ts 測試** — `auth.test.ts`、`client.test.ts`
- [x] **Coverage script** — `npm run test:coverage`

### 3.2 WebSocket 韌性

- [x] **斷線自動重連** — 指數退避 + token 依賴（`useFleetSocket`）
- [x] **Heartbeat** — 依後端 writePump WebSocket ping
- [x] **連線錯誤提示** — FleetPage Alert + Badge 重連狀態

### 3.3 認證體驗

- [ ] **Token 過期處理** — JWT exp 解析待做（401 interceptor 已有）
- [x] **已登入導向** — LoginPage 已登入自動導回首頁
- [ ] **登出確認** — 可選，避免誤觸

### 3.4 訂單瀏覽增強

- [ ] **列表分頁/載入更多** — 現 `limit=100` 硬編碼，無 offset；後端若支援再串
- [ ] **日期範圍篩選** — 依 `requested_at` 篩選
- [ ] **關鍵字搜尋** — 上車點地址、訂單 ID
- [x] **顯示 completed_at** — OrdersPage 新增欄位
- [x] **詳情頁麵包屑** — OrderDetailPage Breadcrumb
- [x] **空列表 Empty 狀態** — OrdersPage / DriversPage locale

### 3.5 車隊地圖增強

- [x] **Marker popup 資訊** — 姓名、狀態、更新時間
- [ ] **點擊司機連動** — 導向司機列表或詳情
- [x] **共用 Map 元件** — `src/components/mapStyle.ts`
- [x] **地圖視野** — fitBounds 依司機點位

### 3.6 司機管理增強

- [x] **normalizeDriver** — `fetchDrivers` 兼容 PascalCase/snake_case
- [ ] **搜尋/篩選** — 姓名、電話、狀態
- [ ] **司機詳情頁** — `/drivers/:id`（後端若有單筆端點再串；否則用列表資料）

### 3.7 報表增強

- [x] **全站摘要列** — ReportsPage 合計趟數/里程
- [ ] **匯出 CSV** — 前端產生，不需後端
- [x] **API 錯誤 Alert** — ReportsPage

### 3.8 UI/UX 通用

- [ ] **Skeleton 載入** — 取代部分 `<Spin>` 全頁遮罩
- [ ] **全域 Error Boundary** — 避免白屏
- [ ] **統一錯誤處理層** — axios / Query 錯誤訊息一致化
- [x] **側欄「設定」入口** — C3 SettingsPage `/settings`
- [x] **響應式地圖高度** — `min(600px, 70vh)` / `min(500px, 60vh)`
- [ ] **README 版本校正** — 文件寫 Ant Design v5 / React 18，`package.json` 為 antd ^6 / React ^19

---

## 四、進階 / 低優先（產品化階段）

| 項目 | 說明 | 依賴 |
|---|---|---|
| 訂單即時狀態 | WS 訂閱 `ride.*` 事件，詳情/列表自動更新 | 後端 WS 事件定義 |
| RBAC 多角色 | 不同管理員權限分級 | D6 + `POST/GET/DELETE /api/admin/admins` |
| 審計日誌 UI | 顯示 `ride_events` 時間軸 | D4 ride_events 表 |
| 密碼修改 / 帳號管理 | 後台自我服務 | 後端帳號 API |
| 國際化 i18n | 多語系框架 | 無 |
| React Query Devtools | 開發除錯 | 無 |
| E2E 測試 | Playwright/Cypress 端到端 | 無 |
| 視覺回歸測試 | Percy/Chromatic 等 | 無 |
| Bundle 分析 | `rollup-plugin-visualizer` | 無 |
| 前端 Docker 化 | 靜態檔 + nginx 映像 | E3 部署策略 |
| Deploy workflow | GitHub Actions 自動部署 | E3 |
| PWA / offline | 可選 | 無 |
| Runtime config | 非 build-time 注入 `VITE_*` | 部署架構決策 |

---

## 五、建議執行順序

```
1. ~~C5 視覺驗證~~ ✅ 已完成
2. ~~C2/C3/強制取消~~ ✅ 已完成（2026-07-08）
3. WS 重連 + 測試補齊（Fleet/Reports/WS）
4. 訂單/地圖/報表 UX 小改（不依賴後端）
5. 產品化項（RBAC、審計、E2E、部署）
```

---

## 六、驗收紀錄

| 日期 | 項目 | 結果 | 備註 |
|---|---|---|---|
| 2026-07-08 | C1 訂單詳情軌跡 | ✅ | snake_case 正規化、GeoJSON 兼容 |
| 2026-07-08 | C4a 測試 | ✅ | 4 測試檔通過 |
| 2026-07-08 | C4b code-splitting | ✅ | 路由 lazy import |
| 2026-07-08 | CI | ✅ | lint + test + build |
| 2026-07-08 | C5 視覺驗證 | ✅ | 6/6 頁截圖通過；修復地圖初始化 bug |
| 2026-07-08 | C2/C3/強制取消 | ✅ | 串接 P2 admin write APIs；21 tests pass |

---

## 參考文件

- 後端總規劃：[line-fleet-dispatch/docs/2026-07-07-gap-analysis-plan.md](../../line-fleet-dispatch/docs/2026-07-07-gap-analysis-plan.md)
- 後端 API 缺口：[line-fleet-dispatch/docs/backend-api-gaps.md](../../line-fleet-dispatch/docs/backend-api-gaps.md)
- 雙端設計規格：[line-fleet-dispatch/docs/superpowers/specs/2026-07-06-fleet-dual-client-design.md](../../line-fleet-dispatch/docs/superpowers/specs/2026-07-06-fleet-dual-client-design.md) §7
