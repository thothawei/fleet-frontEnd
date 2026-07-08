import { useEffect, useRef, useState } from 'react';

import { WS_BASE } from '../config';
import { getToken } from '../auth/auth';
import type { DriverLoc } from '../api/admin';
import {
  mergeDriverLocations,
  parseDriverLocationEvent,
  reconnectDelayMs,
  type WsEvent,
} from './fleetSocketUtils';

export interface FleetSocketState {
  locations: DriverLoc[];
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
}

// useFleetSocket 連上 /ws（admin 角色），即時更新司機位置表。
// initial 為 REST 車隊快照的初始資料，之後由 driver.location 事件增量更新。
// 斷線時指數退避重連；後端 writePump 會送 WebSocket ping 保活。
export function useFleetSocket(initial: DriverLoc[]): FleetSocketState {
  const [locationsMap, setLocationsMap] = useState<Record<number, DriverLoc>>({});
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const token = getToken();
  const snapshotKeyRef = useRef('');

  // 初始快照灌進 state（以內容比對，避免 [] 新參考觸發無限更新）
  useEffect(() => {
    const key = JSON.stringify(initial);
    if (key === snapshotKeyRef.current) return;
    snapshotKeyRef.current = key;
    setLocationsMap((prev) => mergeDriverLocations(prev, initial));
  }, [initial]);

  useEffect(() => {
    if (!token) return;

    let unmounted = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (unmounted) return;
      const delay = reconnectDelayMs(attempt);
      setReconnecting(true);
      setReconnectAttempt(attempt + 1);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (unmounted) return;
      clearReconnectTimer();

      const ws = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        attempt = 0;
        setConnected(true);
        setReconnecting(false);
        setReconnectAttempt(0);
      };

      ws.onclose = () => {
        if (unmounted) return;
        setConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose 會接著觸發重連
        ws.close();
      };

      ws.onmessage = (msg) => {
        try {
          const ev: WsEvent = JSON.parse(msg.data);
          const loc = parseDriverLocationEvent(ev);
          if (loc) {
            setLocationsMap((prev) => ({ ...prev, [loc.driver_id]: loc }));
          }
        } catch {
          // 忽略非 JSON 訊息
        }
      };
    };

    connect();

    return () => {
      unmounted = true;
      clearReconnectTimer();
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [token]);

  return {
    locations: Object.values(locationsMap),
    connected,
    reconnecting,
    reconnectAttempt,
  };
}
