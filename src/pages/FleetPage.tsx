import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Card, Spin } from 'antd';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { fetchDrivers, fetchFleet } from '../api/admin';
import { DRIVER_STATUS } from '../constants';
import { DEFAULT_MAP_CENTER, MAP_HEIGHT, MAP_STYLE } from '../components/mapStyle';
import { useFleetSocket } from '../ws/useFleetSocket';

function fmtUpdatedAt(sec: number): string {
  return new Date(sec * 1000).toLocaleString('zh-TW');
}

export default function FleetPage() {
  const { data: snapshot = [], isLoading } = useQuery({
    queryKey: ['fleet'],
    queryFn: fetchFleet,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });
  const { locations, connected, reconnecting, reconnectAttempt } = useFleetSocket(snapshot);

  const driverById = useMemo(() => {
    const map = new Map<number, (typeof drivers)[0]>();
    for (const d of drivers) map.set(d.ID, d);
    return map;
  }, [drivers]);

  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Record<number, maplibregl.Marker>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: 12,
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [isLoading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<number>();

    for (const loc of locations) {
      seen.add(loc.driver_id);
      const driver = driverById.get(loc.driver_id);
      const statusMeta = driver ? DRIVER_STATUS[driver.Status] : null;
      const popupHtml = [
        `<strong>${driver?.Name ?? `司機 #${loc.driver_id}`}</strong>`,
        statusMeta ? `狀態：${statusMeta.label}` : '',
        `更新：${fmtUpdatedAt(loc.updated_at)}`,
      ]
        .filter(Boolean)
        .join('<br/>');

      const existing = markersRef.current[loc.driver_id];
      if (existing) {
        existing.setLngLat([loc.lng, loc.lat]);
        existing.getPopup()?.setHTML(popupHtml);
      } else {
        markersRef.current[loc.driver_id] = new maplibregl.Marker({ color: '#1677ff' })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(new maplibregl.Popup().setHTML(popupHtml))
          .addTo(map);
      }
    }

    for (const idStr of Object.keys(markersRef.current)) {
      const id = Number(idStr);
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }

    if (locations.length > 0) {
      const bounds = locations.reduce(
        (b, loc) => b.extend([loc.lng, loc.lat]),
        new maplibregl.LngLatBounds([locations[0].lng, locations[0].lat], [locations[0].lng, locations[0].lat]),
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
    }
  }, [locations, driverById]);

  const statusText = connected
    ? `即時連線中・在線 ${locations.length} 台`
    : reconnecting
      ? `重連中（第 ${reconnectAttempt} 次）・快照 ${locations.length} 台`
      : `離線・快照 ${locations.length} 台`;

  return (
    <Card
      title="即時車隊"
      extra={<Badge status={connected ? 'processing' : 'default'} text={statusText} />}
      styles={{ body: { padding: 0 } }}
    >
      {!connected && (
        <Alert
          type={reconnecting ? 'warning' : 'error'}
          showIcon
          message={reconnecting ? '即時連線中斷，正在自動重連…' : '即時連線已中斷，顯示最後快照'}
          style={{ margin: 16, marginBottom: 0 }}
        />
      )}
      <div
        ref={containerRef}
        style={{ height: MAP_HEIGHT.fleet, width: '100%', position: 'relative' }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.7)',
              zIndex: 1,
            }}
          >
            <Spin />
          </div>
        )}
      </div>
    </Card>
  );
}
