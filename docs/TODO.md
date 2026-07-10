# line-fleet-admin — 缺口清單

> 建立：2026-07-08。最後盤點：2026-07-10（以程式碼實測為準）。
> 編號沿用後端 repo 的 [gap-analysis-plan](../../line-fleet-dispatch/docs/2026-07-07-gap-analysis-plan.md)（C=後台前端、D=後端）。
> 每完成一項：實跑驗收 → 勾選回填 → commit + push（main）。

---

## 現況摘要

| 面向 | 狀態 |
|---|---|
| 核心瀏覽 | ✅ 登入、營運總覽 Dashboard、即時車隊地圖、訂單列表/詳情+軌跡回放（含日期／關鍵字篩選）、司機列表、日報表（可匯出 CSV） |
| 寫入操作 | ✅ 司機啟停、派單參數、強制取消（2026-07-08） |
| 韌性 | ✅ 全域 Error Boundary、JWT `exp` 主動登出（2026-07-10） |
| 測試 | ✅ 19 測試檔／76 tests（含 Dashboard／tokens／csv／ErrorBoundary） |
| CI | ✅ lint + test + build（`.github/workflows/ci.yml`）；2026-07-10 修好 `npm ci` ERESOLVE |
| 視覺驗收 | ✅ C5（2026-07-08）＋ UI/UX 翻新腳本已對齊新路由（`docs/screenshots/ux-2026-07-10/`） |

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

- [x] **Token 過期處理**（2026-07-10）— `auth.ts` 解析 JWT `exp`（只解析不驗簽）：
  `isLoggedIn()` 遇過期 token 清 session；`client.ts` request interceptor 過期即攔下不送出；
  `RequireAuth` 依 `exp` 排到期鬧鐘（delay clamp 到 2^31-1，否則 setTimeout 溢位變立即觸發），
  處理「停在頁面上不發請求、沒有 401 可觸發登出」的情境。
- [x] **已登入導向** — LoginPage 已登入自動導回首頁
- [ ] **登出確認** — 可選，避免誤觸

### 3.4 訂單瀏覽增強

- [ ] **列表分頁/載入更多** — **仍被後端擋住**：`RideRepository.ListRecent(status, limit)`
      只吃 status + limit，沒有 offset（`repository.go:505`）。要真分頁得先開後端 API。
- [x] **日期範圍篩選**（2026-07-10）— 依 `requested_at` 前端篩選（RangePicker）
- [x] **關鍵字搜尋**（2026-07-10）— 上車點地址、訂單 ID
  > 兩者都是 client-side 過濾**已載入的最近 100 筆**，頁面上有明文提示；
  > 後端補 offset／查詢參數後再改成伺服器端篩選。
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
- [x] **匯出 CSV**（2026-07-10）— `src/utils/csv.ts`（RFC 4180 逸出 + UTF-8 BOM 防 Excel 亂碼），
      ReportsPage 匯出鈕；無資料時停用
- [x] **API 錯誤 Alert** — ReportsPage

### 3.8 UI/UX 通用

- [x] **LINE 綠品牌主題** — `src/theme/tokens.ts` + ConfigProvider（2026-07-10）
- [x] **營運總覽 Dashboard** — `/` KPI + 最近訂單；即時車隊移至 `/fleet`（2026-07-10）
- [x] **側欄／登入頁品牌化** — 亮色側欄 logo 區、登入頁漸層卡片（2026-07-10）
- [x] **統一 PageHeader＋表格空狀態** — Orders／Drivers／Reports（2026-07-10）
- [ ] **Skeleton 載入** — 取代部分 `<Spin>` 全頁遮罩（Dashboard 已用 Skeleton）
- [x] **全域 Error Boundary**（2026-07-10）— `components/ErrorBoundary.tsx` 掛在 `main.tsx`
      的 ConfigProvider 內、BrowserRouter 外；顯示 antd Result + 重新載入／回首頁
- [ ] **統一錯誤處理層** — axios / Query 錯誤訊息一致化
- [x] **側欄「設定」入口** — C3 SettingsPage `/settings`
- [x] **響應式地圖高度** — `min(600px, 70vh)` / `min(500px, 60vh)`
- [x] **README 版本校正** — 2026-07-10 改為 React 19 / AntD v6 / Vite 8，對齊 `package.json`

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

## 已解決：SettingsPage 測試在 CI 上的間歇性紅燈（2026-07-10）

**症狀**：CI 上 `check` job 隨機轉紅（run 29093888915、29100547339），本機永遠綠。
後者是一個「只改一個 markdown 檔」的 PR，證明與程式改動無關。

**機制**：`76 tests 全過`，但 vitest 報 `Unhandled Errors → ReferenceError: window is not defined`
（`react-dom` 的 `performWorkUntilDeadline`），來源是 `SettingsPage.test.tsx`，exit code 1。
「提交更新派單參數」只等 `updateDispatchSettings` **被呼叫**就結束，但 mutation 的 `onSuccess`
（`message.success` + `setFieldsValue` + `setQueryData`）在那之後才跑；`message.success` 還會開一個
3 秒自動關閉的 timer。測試環境拆除後這些工作才執行，React 在沒有 `window` 的環境重新排程就爆。
CI 慢於本機，才會踩中這個時間差。

**證明**：在 `waitFor` 之後加探針斷言——`queryByDisplayValue('5000')` 已存在（`onSuccess` 的
`setFieldsValue` 跑了）但 `queryByText('派單參數已更新')` 仍是 null（message portal 尚未渲染），
確認測試結束時仍有未完成的 React 工作。

**修法**：等 `onSuccess` 的可觀察結果（`findByText('派單參數已更新')` + 表單值變 `5000`），
並在 `afterEach` 呼叫 `message.destroy()` 清掉 timer。另把第一個測試的
`getByDisplayValue('3000')` 改成 `findByDisplayValue`——欄位由 `useEffect` 的 `setFieldsValue`
回填，與標題不在同一次 commit，標題出現不代表欄位已填。

> 這是 branch protection 上線第一天就攔下的紅燈：docs-only 的 PR #1 被 CI 擋住無法 merge。
> 在此之前它已經讓 main 紅過一次而沒人擋。

## 下次任務

1. **後端補訂單查詢 API**（擋住前端真分頁）：`GET /api/admin/rides` 目前只有 `status`＋`limit`
   （`internal/repository/repository.go:505` 的 `ListRecent`）。需要 `offset`／日期區間／關鍵字，
   前端才能從「client-side 過濾最近 100 筆」升級為伺服器端查詢。
2. **統一錯誤處理層**：axios / React Query 的錯誤訊息一致化（Error Boundary 只接得住 render 期例外，
   接不住事件處理器與非同步 callback）。
3. **Skeleton 載入**：把剩下的 `<Spin>` 全頁遮罩換成 Skeleton（Dashboard 已是）。
4. ~~三個 repo 的 main 都該開 branch protection~~ ✅ 2026-07-10 完成。本 repo 的 required check 是
   `check`；`enforce_admins: true`，**不能再直推 main**，改走 `gh pr create` → 等 CI 綠 →
   `gh pr merge --squash --delete-branch`。三個 repo 的設定詳見
   `line-fleet-dispatch/docs/STATUS.md`「Git 工作流」。

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
| 2026-07-10 | UI/UX 翻新（Admin） | ✅ | tokens／Dashboard／layout／login／PageHeader；59 tests + build + lint |
| 2026-07-10 | CI 修復（ERESOLVE） | ✅ | `@vitest/coverage-v8@^4` 的 peer 要 vitest@4，專案是 v3 → `npm ci` 失敗，CI 已紅 4 個 commit。降 coverage 到 ^3.2.7；npm ci + lint + 59 tests + build + coverage 全過 |
| 2026-07-10 | README 版本校正 | ✅ | React 19 / AntD v6 / Vite 8 |
| 2026-07-10 | 前端四小項（Token 過期／CSV／Error Boundary／訂單篩選） | ✅ | lint + tsc + 76 tests + build 全綠；再以 Playwright 對真後端跑 15 項真瀏覽器驗收（見下） |

### 2026-07-10 真瀏覽器驗收（Playwright + 後端 docker）

登入 admin/admin，對 `docker compose` 起的真後端（5 筆訂單、1 筆已完成）逐項實跑，15/15 通過：

- **Token 過期**：後端真 token 確實帶 `exp`；塞入過期 JWT 後進 `/orders` → 導回 `/login`，
  且 localStorage token 已清除。
- **訂單篩選**：關鍵字「火車」5→1 筆、訂單 ID「3」→1 筆、清空後還原 5 筆；
  日期範圍 07-11~07-12 → 0 筆（Empty），07-10~07-10 → 5 筆。
- **CSV 匯出**：下載檔名 `日報表-2026-07-10.csv`，開頭有 UTF-8 BOM，
  表頭 `司機ID,司機,趟數,總里程(km),平均接客(分)`、資料列 `1,煙霧測試司機,1,0.00,0.0`。
- **Error Boundary**：暫時讓 ReportsPage 拋錯 → 畫面顯示「頁面發生錯誤」＋重新載入鈕（非白屏），
  驗證完已還原。此項單元測試涵蓋不到 `main.tsx` 的掛載位置，故特地實跑。
- 全程無未攔截的 page error。

---

## 七、手續費／會費／營運報表（2026-07-11 規劃）

> 需求：後台可設「手續費%數」，報表顯示司機營業狀況（營業額）、應付總公司金額，
> 以及車隊會費設定。**本區塊全部依賴後端 F 系列**（見
> [line-fleet-dispatch/docs/TODO.md](../../line-fleet-dispatch/docs/TODO.md)「F. 手續費／會費／營運報表」）：
> 車資／手續費由後端於行程完成時定格計算，前端只負責設定與呈現，**勿在前端算錢**。
>
> 已定案：距離自動計費、手續費+會費並存、會費為月費固定金額、費率快照制、
> 金額單位全系統統一（後端存分、前端顯示除 100）。設定頁僅 superadmin 可見/可寫。

### 待後端 API（阻塞中，就緒後才串）

| 依賴 | 後端端點 | 對應前端 |
|---|---|---|
| 後端 F4 | `GET/PUT /api/admin/settings/fees` | 費率設定頁 |
| 後端 F5 | `GET /api/admin/reports/daily`（加金額欄位） | 報表頁金額欄位 |
| 後端 F6 | `GET /api/admin/reports/monthly?month=YYYY-MM` | 月營運報表 |

### 施作項目

> **實作進度（2026-07-11）**：G1–G3 已完成。tsc/oxlint/vite build 綠、Vitest 86 tests 全過
> （新增 10 案：費率 API、月報表 API、`FeeSettingsPage`、`MonthlyReportPage`）。
> 金額用 `src/utils/money.ts`（分↔元/CSV）；費率表單以元/%輸入、送出換算回分/bps。
> **尚未做**：對 docker 後端的真瀏覽器 E2E（G1 改費率→reload、G2/G3 金額對帳）。

- [x] **G1. 費率設定頁** ✅（新路由 `/settings/fees`，`src/pages/FeeSettingsPage.tsx`）
      表單：起步價/每公里/最低車資（元）、手續費（%）、月會費（元），串後端 F4。
      RBAC：路由包 `RequireRole min="superadmin"`；側欄入口與儲存鈕僅 superadmin
      （`auth.isSuperadmin()`）。表單值以元/%呈現，`toApi`/`toForm` 換算分/bps。

- [x] **G2. 日報表加金額欄位** ✅（`ReportsPage.tsx` + `api/admin.ts`）
      `DailyReportRow` 加 `total_revenue_cents`/`total_commission_cents`/`driver_net_cents`；
      表格加營業額/手續費/司機實得欄（右對齊、`fmtYuan`）；摘要列加營業額；CSV 加三欄。

- [x] **G3. 月營運報表頁** ✅（新路由 `/reports/monthly`，`src/pages/MonthlyReportPage.tsx`）
      月選（DatePicker picker="month"）→ 每司機營業額/手續費/月會費/**應付總公司**/司機實得，
      Table.Summary 底部合計列；摘要 Alert；CSV 匯出。串後端 F6。側欄加「月報表」入口。

### 大資料量對應（前端）

> 報表大資料量的預防在後端（見 dispatch F9）。前端配合點：
> - 月報表／日報表**依賴後端伺服器端聚合**（F5/F6 已是每司機一列，天然有界），勿在前端跨大量原始 rides 自行加總。
> - 報表日期區間 UI 設**合理上限**（對齊後端 F9-4 的查詢跨度上限），避免使用者一次拉超大範圍打爆後端。
> - 訂單逐筆列表改**伺服器端分頁**（待後端 `GET /api/admin/rides` 補 `offset`／日期區間，F9-5），
>   解掉現行「client-side 過濾最近 100 筆」的限制（見「3.4 訂單瀏覽增強」）。

### 驗收方式

- G1：以 superadmin 登入改費率 → PUT 成功 → reload 值保留；非 superadmin 看不到入口（RBAC）。
- G2/G3：對 docker 後端（含已完成行程）實跑，畫面金額與後端加總一致；CSV 欄位正確、UTF-8 BOM。
- 沿用既有 Vitest：補 `ReportsPage`／設定頁的金額欄位與 RBAC 測試。

---

## 參考文件

- 後端總規劃：[line-fleet-dispatch/docs/2026-07-07-gap-analysis-plan.md](../../line-fleet-dispatch/docs/2026-07-07-gap-analysis-plan.md)
- 後端 API 缺口：[line-fleet-dispatch/docs/backend-api-gaps.md](../../line-fleet-dispatch/docs/backend-api-gaps.md)
- 雙端設計規格：[line-fleet-dispatch/docs/superpowers/specs/2026-07-06-fleet-dual-client-design.md](../../line-fleet-dispatch/docs/superpowers/specs/2026-07-06-fleet-dual-client-design.md) §7
