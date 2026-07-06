# line-fleet-admin — 叫車派遣營運後台（前端）

派遣系統的**營運後台前端**（React + TypeScript + Vite）。純 SPA，透過 REST + WebSocket 取用 Go 後端 [line-fleet-dispatch](https://github.com/thothawei/fleet-dispatch) 的 `/api/admin/*` 與 `/ws`，達成前後端分離。

> 對應總體設計：line-fleet-dispatch 的 `docs/superpowers/specs/2026-07-06-fleet-dual-client-design.md`（§7 後台前端）。

## 技術棧

| 類別 | 選型 |
|---|---|
| 框架 | React 18 + TypeScript + Vite |
| UI | Ant Design v5（`locale=zh_TW`） |
| 資料抓取 | TanStack Query + axios（JWT interceptor） |
| 路由 | react-router-dom（受保護路由） |
| 地圖 | MapLibre GL + OSM raster 圖磚（免付費 key） |
| 即時 | 原生 WebSocket（訂閱後端 admin 廣播事件） |

## 專案結構

```
src/
├── config.ts             # 後端位址（VITE_API_BASE / VITE_WS_BASE）
├── constants.ts          # 訂單/司機狀態對照（對齊後端 constants）
├── auth/auth.ts          # JWT token 存取（localStorage）
├── api/
│   ├── client.ts         # axios 實例：自動帶 JWT、401 導回登入
│   └── admin.ts          # /api/admin/* 端點函式 + 型別
├── ws/useFleetSocket.ts  # WS hook：driver.location 事件即時更新車隊
├── components/AppLayout.tsx  # Ant Design 側欄版面
├── pages/
│   ├── LoginPage.tsx     # POST /api/admin/login
│   ├── FleetPage.tsx     # 即時車隊地圖（GET /fleet 快照 + WS 增量）
│   ├── OrdersPage.tsx    # 訂單列表（GET /rides，可篩狀態）
│   ├── DriversPage.tsx   # 司機列表（GET /drivers）
│   └── ReportsPage.tsx   # 日報表（GET /reports/daily）
└── App.tsx / main.tsx    # 路由 + QueryClient + AntD ConfigProvider
```

## 對接的後端端點（line-fleet-dispatch）

| 頁面 | 後端端點 |
|---|---|
| 登入 | `POST /api/admin/login` |
| 即時車隊 | `GET /api/admin/fleet` + `GET /ws?token=`（`driver.location` 事件） |
| 訂單管理 | `GET /api/admin/rides?status=&limit=` |
| 司機管理 | `GET /api/admin/drivers` |
| 日報表 | `GET /api/admin/reports/daily?date=` |

後台用**帳號 + 密碼**登入。管理員由後端環境變數 `ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD` 種子建立。

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

### 啟動

在 `line-fleet-admin` 目錄：

```bash
npm install

# 方式 A：一次啟動後端 + 前端
npm run dev:all

# 方式 B：分開啟動
npm run dev:backend           # 等同 cd ../line-fleet-dispatch && docker compose up --build -d
npm run dev                   # http://localhost:5173
```

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
npm run build             # tsc 嚴格檢查 + production build
npm run preview           # 預覽打包結果
```

正式部署時 `.env` 需填入後端實際網址，例如：

```
VITE_API_BASE=https://api.example.com
VITE_WS_BASE=wss://api.example.com
```


## 現況與 roadmap

**已完成（本次 scaffold）**：登入、受保護路由、Ant Design 版面、即時車隊地圖、訂單/司機列表、日報表，全部串接後端 API/WS。`npm run build` 通過。

**待辦**：訂單詳情 + 軌跡回放（GeoJSON 畫在地圖，後端 `GET /rides/:id` 已具備）、司機審核啟用/停用（需後端補寫入端點）、派單參數設定、單元/元件測試、bundle code-splitting。
