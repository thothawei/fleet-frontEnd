// 讀取環境變數的後端位址（Vite 於 build 時注入 import.meta.env）
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'ws://localhost:8080';
