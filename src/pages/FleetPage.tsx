import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Spin } from 'antd';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { fetchFleet } from '../api/admin';
import { useFleetSocket } from '../ws/useFleetSocket';

// 免付費 key 的 OSM raster 圖磚
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const TAIPEI: [number, number] = [121.5654, 25.033];

export default function FleetPage() {
  const { data: snapshot = [], isLoading } = useQuery({
    queryKey: ['fleet'],
    queryFn: fetchFleet,
  });
  const { locations, connected } = useFleetSocket(snapshot);

  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Record<number, maplibregl.Marker>>({});

  // 初始化地圖（一次）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: TAIPEI,
      zoom: 12,
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // 同步司機標記
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<number>();
    for (const loc of locations) {
      seen.add(loc.driver_id);
      const existing = markersRef.current[loc.driver_id];
      if (existing) {
        existing.setLngLat([loc.lng, loc.lat]);
      } else {
        markersRef.current[loc.driver_id] = new maplibregl.Marker({ color: '#1677ff' })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(new maplibregl.Popup().setText(`司機 #${loc.driver_id}`))
          .addTo(map);
      }
    }
    // 移除已離線（不在最新清單）的標記
    for (const idStr of Object.keys(markersRef.current)) {
      const id = Number(idStr);
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }
  }, [locations]);

  return (
    <Card
      title="即時車隊"
      extra={
        <Badge
          status={connected ? 'processing' : 'default'}
          text={connected ? `即時連線中・在線 ${locations.length} 台` : `離線・快照 ${locations.length} 台`}
        />
      }
      styles={{ body: { padding: 0 } }}
    >
      {isLoading ? (
        <div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin />
        </div>
      ) : (
        <div ref={containerRef} style={{ height: 600, width: '100%' }} />
      )}
    </Card>
  );
}
