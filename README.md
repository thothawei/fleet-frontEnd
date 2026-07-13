# line-fleet-admin — 叫車派遣營運後台（前端）

派遣系統的**營運後台前端**（React + TypeScript + Vite）。純 SPA，透過 REST + WebSocket 取用 Go 後端 [line-fleet-dispatch](https://github.com/thothawei/fleet-dispatch) 的 `/api/admin/*` 與 `/ws`，達成前後端分離。

> 對應總體設計：line-fleet-dispatch 的 `docs/superpowers/specs/2026-07-06-fleet-dual-client-design.md`（§7 後台前端）。

## 技術棧

| 類別 | 選型 |
|---|---|
| 框架 | React 19 + TypeScript + Vite 8 |
| UI | Ant Design v6（`locale=zh_TW`） |
| 資料抓取 | TanStack Query + axios（JWT interceptor） |
| 路由 | react-router-dom（受保護路由） |
| 地圖 | MapLibre GL + OSM raster 圖磚（免付費 key） |
| 即時 | 原生 WebSocket（訂閱後端 admin 廣播事件） |

## 專案結構

```
src/
├── config.ts             # 後端位址（VITE_API_BASE / VITE_WS_BASE）
├── constants.ts          # 訂單/司機狀態對照（對齊後端 constants）
├── theme/tokens.ts       # LINE 綠品牌 tokens + 狀態語意色（AntD ConfigProvider）
├── auth/auth.ts          # JWT token 存取（localStorage）
├── api/
│   ├── client.ts         # axios 實例：自動帶 JWT、token 過期/401 導回登入
│   └── admin.ts          # /api/admin/* 端點函式 + 型別（含 normalize 兼容大小寫）
├── utils/
│   ├── apiError.ts       # 統一錯誤訊息（後端 error 欄位／逾時／斷線／5xx）
│   ├── money.ts          # 金額格式化（分↔元、NT$）
│   └── csv.ts            # CSV 匯出（RFC 4180 逸出 + UTF-8 BOM）
├── ws/useFleetSocket.ts  # WS hook：driver.location 事件即時更新車隊
├── components/
│   ├── AppLayout.tsx     # 亮色側欄版面（登出二次確認、詳情頁高亮主選單）
│   ├── ErrorBoundary.tsx # 全域 render 例外邊界（antd Result 非白屏）
│   └── PageHeader.tsx    # 全站統一頁面標題列
├── pages/
│   ├── LoginPage.tsx        # POST /api/admin/login（品牌化登入）
│   ├── DashboardPage.tsx    # 營運總覽首頁 `/`（KPI + 最近訂單，Skeleton 載入）
│   ├── FleetPage.tsx        # 即時車隊地圖 `/fleet`（快照 + WS 增量，marker 連司機詳情）
│   ├── OrdersPage.tsx       # 訂單列表 `/orders`（伺服器端分頁／日期／關鍵字查詢）
│   ├── OrderDetailPage.tsx  # 訂單詳情 `/orders/:id`（軌跡回放、狀態時間軸、強制取消）
│   ├── DriversPage.tsx      # 司機列表 `/drivers`（搜尋／狀態篩選、啟停）
│   ├── DriverDetailPage.tsx # 司機詳情 `/drivers/:id`
│   ├── ReportsPage.tsx      # 日報表 `/reports`（含金額欄位、CSV）
│   ├── MonthlyReportPage.tsx# 月營運報表 `/reports/monthly`（應付總公司、CSV）
│   ├── SettingsPage.tsx     # 派單參數設定 `/settings`（dispatcher+）
│   ├── FeeSettingsPage.tsx  # 費率設定 `/settings/fees`（superadmin）
│   └── UsersPage.tsx        # 使用者管理 `/users`（superadmin）
└── App.tsx / main.tsx    # 路由（RequireAuth/RequireRole）+ QueryClient + AntD ConfigProvider + <App>
```

## 對接的後端端點（line-fleet-dispatch）

| 頁面 | 後端端點 |
|---|---|
| 登入 | `POST /api/admin/login` |
| 營運總覽 | `GET /api/admin/rides` + `GET /api/admin/drivers` + `GET /api/admin/fleet`（組合 KPI） |
| 即時車隊 | `GET /api/admin/fleet` + `GET /ws?token=`（`driver.location` 事件） |
| 訂單管理 | `GET /api/admin/rides?status=&limit=&offset=&from=&to=&q=`（回 `total`，伺服器端分頁） |
| 訂單詳情 | `GET /api/admin/rides/:id`（軌跡 GeoJSON + 事件）、`POST /api/admin/rides/:id/cancel` |
| 司機管理 | `GET /api/admin/drivers`、`PATCH /api/admin/drivers/:id/status` |
| 日報表 | `GET /api/admin/reports/daily?date=`（含金額欄位） |
| 月報表 | `GET /api/admin/reports/monthly?month=YYYY-MM` |
| 派單參數 | `GET/PUT /api/admin/settings/dispatch` |
| 費率設定 | `GET/PUT /api/admin/settings/fees`（superadmin） |
| 使用者管理 | `GET/POST /api/admin/admins`、`PATCH /api/admin/admins/:id`（superadmin） |

後台用**帳號 + 密碼**登入；角色分 `viewer`／`dispatcher`／`superadmin`（前端 `RequireRole` + 後端雙重把關）。管理員由後端環境變數 `ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD` 種子建立。

## 快速開始（與 line-fleet-dispatch 串聯）

本專案需搭配同層目錄的 Go 後端 **`../line-fleet-dispatch`**（PostGIS + Redis + Docker Compose），預設跑在 `http://localhost:8080`。

### 前置需求

- Node.js 18+
- Docker Desktop（跑後端）

### 第一次設定

```bash
# 前端
cp .env.example .env          # 開發模式留空即可，走 Vite proxy

# 後端（在 ../line-fleet-dispatch）
cd ../line-fleet-dispatch
cp .env.example .env
# docker-compose 已預設種子管理員 admin/admin（首次啟動且尚無 admin 時自動建立）；
# 要改帳密才需在 .env 設 ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD
```

### 啟動 / 關閉（前後端一起）

在 `line-fleet-admin` 目錄：

```bash
npm install

npm start     # ▶ 一鍵開：後端(docker) + 前端(vite)。按 Ctrl+C 會「一起關」前後端
npm stop      # ■ 強制關：docker compose down + 結束 vite（不論當初怎麼啟動）
```

`npm start` 會先把後端 docker 拉起來（含 build），再啟動前端 vite（前景）；
在此視窗按 **Ctrl+C**，腳本的 trap 會自動 `docker compose down` 並結束 vite，前後端一起收掉。

其他分開操作：`npm run dev`（只前端）、`npm run dev:backend`（只後端，detached）。

瀏覽器開啟 **http://localhost:5173**，用以下帳密登入：

| 欄位 | 值 |
|---|---|
| 帳號 | `admin` |
| 密碼 | `admin` |

### 開發架構（Vite Proxy）

開發模式下，前端與後端透過 **同源 proxy** 串接，避免瀏覽器跨域（CORS）問題：

```
瀏覽器 http://localhost:5173
    │
    ├─ /api/*  ──proxy──►  line-fleet-dispatch :8080
    └─ /ws     ──proxy──►  line-fleet-dispatch :8080
```

對應設定：

- `vite.config.ts`：`/api`、`/ws` 轉發到 `localhost:8080`
- `.env`：`VITE_API_BASE` 與 `VITE_WS_BASE` **留空**（`src/config.ts` 會自動用同源位址）
- 正式部署時改填實際後端 URL，見 `.env.example`

### 驗證

```bash
# 後端健康檢查
curl http://localhost:8080/healthz
# → {"status":"ok"}

# 透過前端 proxy 測登入
curl -X POST http://localhost:5173/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
# → {"admin_id":1,"name":"系統管理員","token":"..."}
```

### 選用：灌測試司機位置

地圖上要有司機點位，可在後端目錄啟動模擬器：

```bash
cd ../line-fleet-dispatch
docker compose --profile simulator up -d simulator
```

### 常見問題

| 症狀 | 解法 |
|---|---|
| 登入回 404 | 後端 Docker 映像檔過舊，執行 `npm run dev:backend` 重建 |
| 登入失敗 | 確認後端種子 `ADMIN_SEED_USERNAME/PASSWORD`（docker-compose 預設 admin/admin），且 DB 尚無其他 admin |
| 地圖無司機 | 啟動 simulator，或等真實司機透過 LIFF 回報位置 |

### 打包

```bash
npm run lint              # oxlint
npm test                  # Vitest 元件/API 測試
npm run build             # tsc 嚴格檢查 + production build
npm run preview           # 預覽打包結果
```

Push 到 `main` 或開 PR 時，GitHub Actions 會自動跑 `lint → test → build`（`.github/workflows/ci.yml`）。

正式部署時 `.env` 需填入後端實際網址，例如：

```
VITE_API_BASE=https://api.example.com
VITE_WS_BASE=wss://api.example.com
```


## 現況與 roadmap

**已完成**（詳見 [`docs/TODO.md`](docs/TODO.md)）：

- **核心瀏覽**：登入、營運總覽 Dashboard、即時車隊地圖、訂單列表＋詳情/軌跡回放、司機列表＋詳情、日/月報表。
- **寫入操作**：司機啟停、派單參數設定、強制取消訂單、費率設定、使用者管理（RBAC）。
- **手續費／會費／報表**（G1–G3）：費率設定頁、日報表金額欄位、月營運報表（應付總公司），與後端 F 系列＋App 端三端對帳通過。
  費率設定頁另含「遺失物協尋處理費（%）」（2026-07-13）——乘客申請協尋時按該趟車資此比例收處理費，金額建單當下快照。
- **訂單伺服器端分頁**：日期／關鍵字／分頁全走後端 `GET /api/admin/rides`（`offset`/`from`/`to`/`q`/`total`）。
- **韌性/品質**：全域 Error Boundary、JWT `exp` 主動登出、統一錯誤處理層（`utils/apiError`）、Skeleton 載入、WS 斷線重連。
- **工程**：路由 code-splitting、Vitest（23 檔 96 tests）、CI（lint→test→build）、antd v6 deprecation 全清（靜態 message/Modal 改 `App.useApp()`）。

**待辦（低優先／依賴外部）**：統一錯誤處理層再涵蓋 query 讀取錯誤、RBAC 多角色細分、審計日誌 UI、i18n、E2E（Playwright/Cypress）、前端 Docker 化與部署 workflow。
