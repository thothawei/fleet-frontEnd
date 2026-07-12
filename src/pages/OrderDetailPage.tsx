/// <reference types="geojson" />
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Card, Descriptions, Tag, Spin, Empty, Button, Space, Slider, Alert, Breadcrumb, Timeline, Tooltip } from 'antd';
import { ArrowLeftOutlined, CaretRightOutlined, PauseOutlined, StopOutlined } from '@ant-design/icons';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { cancelRideByAdmin, fetchRideDetail, parseTrackCoordinates } from '../api/admin';
import { canDispatch } from '../auth/auth';
import { actorRoleLabel, isRideCancellable, RIDE_STATUS, rideEventLabel } from '../constants';

import { DEFAULT_MAP_CENTER, MAP_HEIGHT, MAP_STYLE } from '../components/mapStyle';
import { apiError } from '../utils/apiError';
const TRACK_SOURCE_ID = 'ride-track';
const TRACK_LAYER_ID = 'ride-track-line';
const PLAYBACK_INTERVAL_MS = 300;

function fmtTime(t: string | null): string {
  return t ? new Date(t).toLocaleString('zh-TW') : '—';
}


export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const rideId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => fetchRideDetail(rideId),
    enabled: Number.isFinite(rideId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelRideByAdmin(rideId),
    onSuccess: (msg) => {
      message.success(msg || '訂單已取消');
      queryClient.invalidateQueries({ queryKey: ['ride', rideId] });
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
    onError: (err) => message.error(apiError(err, '取消失敗')),
  });

  const confirmCancel = () => {
    modal.confirm({
      title: '強制取消此訂單？',
      content: '已上車的訂單無法取消。此操作會通知相關司機與乘客。',
      okText: '確認取消',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: () => cancelMutation.mutateAsync(),
    });
  };

  const coordinates = useMemo(
    () => (data?.track_geojson ? parseTrackCoordinates(data.track_geojson) : []),
    [data],
  );

  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);

  // 初始化地圖（容器固定掛載，資料載入後建立）
  useEffect(() => {
    if (isLoading || !containerRef.current || mapRef.current) return;
    if (containerRef.current.clientHeight === 0) return;
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
  }, [isLoading, coordinates.length]);

  // 軌跡區塊高度變更時重算地圖尺寸
  useEffect(() => {
    mapRef.current?.resize();
  }, [coordinates.length]);

  // 軌跡載入後畫線 + 移動車輛 marker 到起點、視角置中
  useEffect(() => {
    const map = mapRef.current;
    if (!map || coordinates.length === 0) return;

    const drawTrack = () => {
      const lineFeature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates },
      };
      if (map.getSource(TRACK_SOURCE_ID)) {
        (map.getSource(TRACK_SOURCE_ID) as maplibregl.GeoJSONSource).setData(lineFeature);
      } else {
        map.addSource(TRACK_SOURCE_ID, { type: 'geojson', data: lineFeature });
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
  }, [coordinates]);

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
        <Alert type="error" title="找不到訂單或讀取失敗" showIcon />
      </Card>
    );
  }

  const { ride } = data;
  const statusMeta = RIDE_STATUS[ride.status] ?? { label: String(ride.status), color: 'default' };
  const canCancel = isRideCancellable(ride.status);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Breadcrumb
        items={[
          { title: <a onClick={() => navigate('/orders')}>訂單管理</a> },
          { title: `#${ride.id}` },
        ]}
      />
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
          返回訂單列表
        </Button>
        {canCancel && (
          <Tooltip title={canDispatch() ? '' : '權限不足'}>
            <Button
              danger
              icon={<StopOutlined />}
              loading={cancelMutation.isPending}
              disabled={!canDispatch()}
              onClick={confirmCancel}
            >
              強制取消
            </Button>
          </Tooltip>
        )}
      </Space>

      <Card title={`訂單 #${ride.id}`}>
        <Descriptions
          bordered
          size="small"
          column={2}
          items={[
            { key: 'status', label: '狀態', children: <Tag color={statusMeta.color}>{statusMeta.label}</Tag> },
            { key: 'customer', label: '乘客 ID', children: ride.customer_id },
            { key: 'driver', label: '司機 ID', children: ride.driver_id ?? '—' },
            { key: 'distance', label: '里程(m)', children: ride.distance_m ?? '—' },
            { key: 'pickup_addr', label: '上車地址', children: ride.pickup_address || '—' },
            {
              key: 'pickup_point',
              label: '上車座標',
              children: `${ride.pickup_point.lat.toFixed(6)}, ${ride.pickup_point.lng.toFixed(6)}`,
            },
            { key: 'dropoff_addr', label: '下車地址', children: ride.dropoff_address || '—' },
            {
              key: 'dropoff_point',
              label: '下車座標',
              children: ride.dropoff_point
                ? `${ride.dropoff_point.lat.toFixed(6)}, ${ride.dropoff_point.lng.toFixed(6)}`
                : '—',
            },
            { key: 'requested_at', label: '叫車時間', children: fmtTime(ride.requested_at) },
            { key: 'accepted_at', label: '接單時間', children: fmtTime(ride.accepted_at) },
            { key: 'picked_up_at', label: '上車時間', children: fmtTime(ride.picked_up_at) },
            { key: 'completed_at', label: '完成時間', children: fmtTime(ride.completed_at) },
            { key: 'eta', label: '預估接客秒數', children: ride.eta_pickup_sec ?? '—' },
          ]}
        />
      </Card>

      <Card title="狀態時間軸">
        {(data.events ?? []).length === 0 ? (
          <Empty description="尚無審計事件" />
        ) : (
          <Timeline
            items={(data.events ?? []).map((ev) => {
              const fromMeta =
                ev.from_status == null
                  ? null
                  : (RIDE_STATUS[ev.from_status] ?? { label: String(ev.from_status) });
              const toMeta = RIDE_STATUS[ev.to_status] ?? { label: String(ev.to_status) };
              const actor =
                ev.actor_id != null
                  ? `${actorRoleLabel(ev.actor_role)} #${ev.actor_id}`
                  : actorRoleLabel(ev.actor_role);
              return {
                key: String(ev.id),
                content: (
                  <Space orientation="vertical" size={0}>
                    <Space wrap>
                      <strong>{rideEventLabel(ev.event_type)}</strong>
                      {fromMeta && <Tag>{fromMeta.label}</Tag>}
                      {fromMeta && <span>→</span>}
                      <Tag color={toMeta.color}>{toMeta.label}</Tag>
                      <Tag>{actor}</Tag>
                    </Space>
                    <span style={{ color: '#666', fontSize: 12 }}>
                      {fmtTime(ev.created_at)}
                      {ev.note ? ` · ${ev.note}` : ''}
                    </span>
                  </Space>
                ),
              };
            })}
          />
        )}
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
          style={{ height: coordinates.length === 0 ? 0 : MAP_HEIGHT.track, width: '100%', overflow: 'hidden' }}
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
