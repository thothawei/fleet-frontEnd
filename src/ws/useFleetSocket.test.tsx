import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useFleetSocket } from './useFleetSocket';

type WsHandler = (ev?: unknown) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  onopen: WsHandler | null = null;
  onclose: WsHandler | null = null;
  onmessage: WsHandler | null = null;
  onerror: WsHandler | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.onclose?.({});
  }

  static latest(): MockWebSocket {
    return MockWebSocket.instances.at(-1)!;
  }
}

vi.mock('../config', () => ({ WS_BASE: 'ws://test' }));
vi.mock('../auth/auth', () => ({ getToken: () => 'test-token' }));
vi.mock('./fleetSocketUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./fleetSocketUtils')>();
  return { ...actual, reconnectDelayMs: () => 0 };
});

describe('useFleetSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('連線成功並套用初始快照', () => {
    const initial = [{ driver_id: 1, lat: 25.03, lng: 121.56, updated_at: 100 }];
    const { result } = renderHook(() => useFleetSocket(initial));

    act(() => {
      MockWebSocket.latest().onopen?.({});
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.locations).toHaveLength(1);
  });

  it('收到 driver.location 更新位置', () => {
    const { result } = renderHook(() => useFleetSocket([]));

    act(() => {
      MockWebSocket.latest().onopen?.({});
      MockWebSocket.latest().onmessage?.({
        data: JSON.stringify({
          type: 'driver.location',
          payload: { driver_id: 3, lat: 25.1, lng: 121.6 },
        }),
      });
    });

    expect(result.current.locations[0]?.driver_id).toBe(3);
  });

  it('斷線後自動重連', async () => {
    const { result } = renderHook(() => useFleetSocket([]));

    act(() => {
      MockWebSocket.latest().onopen?.({});
    });
    expect(result.current.connected).toBe(true);

    act(() => {
      MockWebSocket.latest().close();
    });
    expect(result.current.reconnecting).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2);
  });
});
