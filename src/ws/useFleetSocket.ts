import { useEffect, useRef, useState } from 'react';

import { WS_BASE } from '../config';
import { getToken } from '../auth/auth';
import type { DriverLoc } from '../api/admin';

// 後端事件形狀（對齊 events/event.go）
interface WsEvent {
  type: string;
  ride_id?: number;
  payload?: Record<string, unknown>;
}

// useFleetSocket 連上 /ws（admin 角色），即時更新司機位置表。
// initial 為 REST 車隊快照的初始資料，之後由 driver.location 事件增量更新。
export function useFleetSocket(initial: DriverLoc[]) {
  const [locations, setLocations] = useState<Record<number, DriverLoc>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // 初始快照灌進 state
  useEffect(() => {
    const map: Record<number, DriverLoc> = {};
    for (const d of initial) map[d.driver_id] = d;
    setLocations(map);
  }, [initial]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (msg) => {
      try {
        const ev: WsEvent = JSON.parse(msg.data);
        if (ev.type === 'driver.location' && ev.payload) {
          const id = Number(ev.payload.driver_id);
          const lat = Number(ev.payload.lat);
          const lng = Number(ev.payload.lng);
          if (!Number.isNaN(id)) {
            setLocations((prev) => ({
              ...prev,
              [id]: { driver_id: id, lat, lng, updated_at: Math.floor(Date.now() / 1000) },
            }));
          }
        }
      } catch {
        // 忽略非 JSON 訊息
      }
    };

    return () => ws.close();
  }, []);

  return { locations: Object.values(locations), connected };
}
