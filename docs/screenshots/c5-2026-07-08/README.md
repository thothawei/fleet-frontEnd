# C5 視覺驗證 — 2026-07-08

## 執行方式

```bash
# 需前後端運行中（npm start 或分別 dev + docker）
npm run visual:verify
```

## 結果

| 頁面 | 狀態 | 備註 |
|---|---|---|
| 01-login | ✅ | 登入表單正常 |
| 02-fleet | ✅ | OSM 地圖渲染；在線 0 台（無 simulator） |
| 03-orders | ✅ | 3 筆訂單 |
| 04-order-detail | ✅ | 詳情欄位 + 軌跡地圖 + 播放控制 |
| 05-drivers | ✅ | 3 位司機 |
| 06-reports | ✅ | 1 筆日報 |

**6/6 通過** — 詳見 `report.json`

## 修復項目

驗證過程發現 **FleetPage / OrderDetailPage 地圖空白**：
- 原因：`isLoading` 時地圖容器未掛載，`useEffect([])` 只跑一次，MapLibre 永不初始化
- 修復：容器固定掛載；map init 依賴 `isLoading` / `coordinates.length`

## 截圖

- `01-login.png` — 登入頁
- `02-fleet.png` — 即時車隊地圖
- `03-orders.png` — 訂單列表
- `04-order-detail.png` — 訂單詳情 + 軌跡回放
- `05-drivers.png` — 司機列表
- `06-reports.png` — 日報表
