# line-fleet-admin — 補強清單

> 建立：2026-07-08 盤點（以程式碼實測為準）。編號沿用後端 repo 的
> [gap-analysis-plan](../../line-fleet-dispatch/docs/2026-07-07-gap-analysis-plan.md)（C=後台前端、D=後端）。
> 每完成一項：實跑驗收 → 勾選回填 → commit + push（main）。

## 現況

- 已完成頁面：登入、即時車隊地圖（MapLibre+WS）、訂單列表、訂單詳情+軌跡回放、司機列表、日報表。
- 全部**唯讀**；無測試；無 code-splitting；視覺未截圖驗證。

## 待補強

- [ ] C2. 司機審核啟用/停用 UI —— **依賴後端 D2**（`PATCH /api/admin/drivers/:id/status`，
      且須配合派單池：停用者不得上線/不被派單，否則是假按鈕）。後端未做前不要先做 UI。
- [ ] C3. 派單參數設定頁 —— **依賴後端 D3**（`GET/PUT /api/admin/settings/dispatch`：逾時秒數、
      搜尋半徑、節流門檻，現為 env/常數）。
- [ ] （後端 P2 一併考慮）後台強制取消訂單按鈕 —— 依賴 `POST /api/admin/rides/:id/cancel`。
- [ ] C4a. 前端測試：關鍵頁 component 測試（登入、訂單列表、詳情）。目前 `src/` 無任何測試、
      package.json 無 test script。
- [ ] C4b. bundle code-splitting：路由層 lazy import（現單包 >500KB，`App.tsx` 無 lazy）。
- [ ] C5. 視覺驗證：用瀏覽器/preview 實際載入各頁截圖確認渲染（含 OrderDetailPage 軌跡回放）。
- [ ] CI：`tsc -b && vite build` + lint 的 pipeline（跨 repo 項 E2）。
