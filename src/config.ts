// 讀取環境變數的後端位址（Vite 於 build 時注入 import.meta.env）
// 開發模式留空 → 走 Vite proxy（同源 /api、/ws）；正式部署填完整後端 URL
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';
export const WS_BASE =
  import.meta.env.VITE_WS_BASE ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    : 'ws://localhost:5173');
