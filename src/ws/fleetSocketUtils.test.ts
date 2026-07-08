import { describe, expect, it } from 'vitest';

import {
  mergeDriverLocations,
  parseDriverLocationEvent,
  reconnectDelayMs,
} from './fleetSocketUtils';

describe('fleetSocketUtils', () => {
  it('parseDriverLocationEvent 解析有效 payload', () => {
    const loc = parseDriverLocationEvent(
      { type: 'driver.location', payload: { driver_id: 2, lat: 25.03, lng: 121.56 } },
      1_700_000_000,
    );
    expect(loc).toEqual({
      driver_id: 2,
      lat: 25.03,
      lng: 121.56,
      updated_at: 1_700_000_000,
    });
  });

  it('parseDriverLocationEvent 忽略非 location 或無效 id', () => {
    expect(parseDriverLocationEvent({ type: 'ride.assigned' })).toBeNull();
    expect(parseDriverLocationEvent({ type: 'driver.location', payload: { driver_id: 'x' } })).toBeNull();
  });

  it('reconnectDelayMs 指數退避且有上限', () => {
    expect(reconnectDelayMs(0)).toBe(1_000);
    expect(reconnectDelayMs(1)).toBe(2_000);
    expect(reconnectDelayMs(10)).toBe(30_000);
  });

  it('mergeDriverLocations 合併快照', () => {
    const prev = { 1: { driver_id: 1, lat: 1, lng: 2, updated_at: 0 } };
    const merged = mergeDriverLocations(prev, [{ driver_id: 2, lat: 3, lng: 4, updated_at: 1 }]);
    expect(Object.keys(merged)).toHaveLength(2);
    expect(merged[2].lat).toBe(3);
  });
});
