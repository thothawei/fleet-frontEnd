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

管理員帳號由後端環境變數 `ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD` 種子建立。

## 開發

```bash
cp .env.example .env      # 設定後端位址（預設 http://localhost:8080）
npm install
npm run dev               # http://localhost:5173
npm run build             # tsc 嚴格檢查 + production build
```

## 現況與 roadmap

**已完成（本次 scaffold）**：登入、受保護路由、Ant Design 版面、即時車隊地圖、訂單/司機列表、日報表，全部串接後端 API/WS。`npm run build` 通過。

**待辦**：訂單詳情 + 軌跡回放（GeoJSON 畫在地圖，後端 `GET /rides/:id` 已具備）、司機審核啟用/停用（需後端補寫入端點）、派單參數設定、單元/元件測試、bundle code-splitting。
