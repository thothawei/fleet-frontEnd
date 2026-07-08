/// <reference types="geojson" />
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Descriptions, Tag, Spin, Empty, Button, Space, Slider, Alert } from 'antd';
import { ArrowLeftOutlined, CaretRightOutlined, PauseOutlined } from '@ant-design/icons';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { fetchRideDetail, type RideTrackGeoJSON } from '../api/admin';
import { RIDE_STATUS } from '../constants';

// 免付費 key 的 OSM raster 圖磚（與 FleetPage 相同寫法）
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
const TRACK_SOURCE_ID = 'ride-track';
const TRACK_LAYER_ID = 'ride-track-line';
const PLAYBACK_INTERVAL_MS = 300;

function fmtTime(t: string | null): string {
  return t ? new Date(t).toLocaleString('zh-TW') : '—';
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rideId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => fetchRideDetail(rideId),
    enabled: Number.isFinite(rideId),
  });

  const track = useMemo<RideTrackGeoJSON | null>(() => {
    if (!data?.track_geojson) return null;
    try {
      return JSON.parse(data.track_geojson) as RideTrackGeoJSON;
    } catch {
      return null;
    }
  }, [data]);

  const coordinates = useMemo(() => track?.geometry?.coordinates ?? [], [track]);

  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);

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

  // 軌跡載入後畫線 + 移動車輛 marker 到起點、視角置中
  useEffect(() => {
    const map = mapRef.current;
    if (!map || coordinates.length === 0) return;

    const drawTrack = () => {
      if (map.getSource(TRACK_SOURCE_ID)) {
        (map.getSource(TRACK_SOURCE_ID) as maplibregl.GeoJSONSource).setData(track as GeoJSON.Feature);
      } else {
        map.addSource(TRACK_SOURCE_ID, { type: 'geojson', data: track as GeoJSON.Feature });
        map.addLayer({
          id: TRACK_LAYER_ID,
          type: 'line',
          source: TRACK_SOURCE_ID,
          paint: { 'line-color': '#1677ff', 'line-width': 4 },
        });
      }

      if (!vehicleMarkerRef.current) {
        vehicleMarkerRef.current = new maplibregl.Marker({ color: '#f5222d' })
          .setLngLat(coordinates[0])
          .addTo(map);
      } else {
        vehicleMarkerRef.current.setLngLat(coordinates[0]);
      }

      const bounds = coordinates.reduce(
        (b, c) => b.extend(c as [number, number]),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
      );
      map.fitBounds(bounds, { padding: 40, maxZoom: 16 });
    };

    if (map.isStyleLoaded()) {
      drawTrack();
    } else {
      map.once('load', drawTrack);
    }
  }, [track, coordinates]);

  // 播放：以 timer 沿座標陣列移動 marker
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setStep((prev) => {
        const next = prev + 1;
        if (next >= coordinates.length) {
          setPlaying(false);
          return prev;
        }
        return next;
      });
    }, PLAYBACK_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, coordinates.length]);

  // step 變動時同步 marker 位置
  useEffect(() => {
    const coord = coordinates[step];
    if (coord && vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLngLat(coord);
    }
  }, [step, coordinates]);

  if (isLoading) {
    return (
      <Card>
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <Alert type="error" message="找不到訂單或讀取失敗" showIcon />
      </Card>
    );
  }

  const { ride } = data;
  const statusMeta = RIDE_STATUS[ride.Status] ?? { label: String(ride.Status), color: 'default' };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
        返回訂單列表
      </Button>

      <Card title={`訂單 #${ride.ID}`}>
        <Descriptions
          bordered
          size="small"
          column={2}
          items={[
            { key: 'status', label: '狀態', children: <Tag color={statusMeta.color}>{statusMeta.label}</Tag> },
            { key: 'customer', label: '乘客 ID', children: ride.CustomerID },
            { key: 'driver', label: '司機 ID', children: ride.DriverID ?? '—' },
            { key: 'distance', label: '里程(m)', children: ride.DistanceM ?? '—' },
            { key: 'pickup_addr', label: '上車地址', children: ride.PickupAddress || '—' },
            {
              key: 'pickup_point',
              label: '上車座標',
              children: `${ride.PickupPoint.Lat.toFixed(6)}, ${ride.PickupPoint.Lng.toFixed(6)}`,
            },
            { key: 'dropoff_addr', label: '下車地址', children: ride.DropoffAddress || '—' },
            {
              key: 'dropoff_point',
              label: '下車座標',
              children: ride.DropoffPoint
                ? `${ride.DropoffPoint.Lat.toFixed(6)}, ${ride.DropoffPoint.Lng.toFixed(6)}`
                : '—',
            },
            { key: 'requested_at', label: '叫車時間', children: fmtTime(ride.RequestedAt) },
            { key: 'accepted_at', label: '接單時間', children: fmtTime(ride.AcceptedAt) },
            { key: 'picked_up_at', label: '上車時間', children: fmtTime(ride.PickedUpAt) },
            { key: 'completed_at', label: '完成時間', children: fmtTime(ride.CompletedAt) },
            { key: 'eta', label: '預估接客秒數', children: ride.EtaPickupSec ?? '—' },
          ]}
        />
      </Card>

      <Card
        title="軌跡回放"
        extra={
          coordinates.length > 0 && (
            <Space>
              <Button
                icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
                onClick={() => {
                  if (!playing && step >= coordinates.length - 1) setStep(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? '暫停' : '播放'}
              </Button>
              <span>
                {step + 1} / {coordinates.length}
              </span>
            </Space>
          )
        }
        styles={{ body: { padding: 0 } }}
      >
        {coordinates.length === 0 && (
          <div style={{ padding: 16 }}>
            <Empty description="尚無軌跡資料" />
          </div>
        )}
        {/* 地圖容器固定掛載，避免軌跡資料非同步到位時因 DOM 節點替換導致 ref 失聯 */}
        <div
          ref={containerRef}
          style={{ height: coordinates.length === 0 ? 0 : 500, width: '100%', overflow: 'hidden' }}
        />
        {coordinates.length > 0 && (
          <div style={{ padding: '12px 24px' }}>
            <Slider
              min={0}
              max={Math.max(coordinates.length - 1, 0)}
              value={step}
              onChange={(v) => {
                setPlaying(false);
                setStep(v);
              }}
            />
          </div>
        )}
      </Card>
    </Space>
  );
}
