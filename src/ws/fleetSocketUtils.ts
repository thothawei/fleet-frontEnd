import type { DriverLoc } from '../api/admin';

/** 後端 WS 事件形狀（對齊 events/event.go） */
export interface WsEvent {
  type: string;
  ride_id?: number;
  payload?: Record<string, unknown>;
}

export const WS_BACKOFF = {
  initialMs: 1_000,
  maxMs: 30_000,
} as const;

/** 計算第 n 次重連延遲（指數退避，上限 maxMs） */
export function reconnectDelayMs(attempt: number, initialMs = WS_BACKOFF.initialMs, maxMs = WS_BACKOFF.maxMs): number {
  return Math.min(initialMs * 2 ** attempt, maxMs);
}

/** 解析 driver.location 事件；無效則回 null */
export function parseDriverLocationEvent(ev: WsEvent, nowSec = Math.floor(Date.now() / 1000)): DriverLoc | null {
  if (ev.type !== 'driver.location' || !ev.payload) return null;
  const id = Number(ev.payload.driver_id);
  const lat = Number(ev.payload.lat);
  const lng = Number(ev.payload.lng);
  if (Number.isNaN(id) || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { driver_id: id, lat, lng, updated_at: nowSec };
}

/** 合併 REST 快照與 WS 增量 */
export function mergeDriverLocations(
  prev: Record<number, DriverLoc>,
  snapshot: DriverLoc[],
): Record<number, DriverLoc> {
  const next = { ...prev };
  for (const d of snapshot) next[d.driver_id] = d;
  return next;
}
