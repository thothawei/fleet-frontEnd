/// <reference types="geojson" />
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Card, Descriptions, Tag, Spin, Empty, Button, Space, Slider, Alert, Breadcrumb, Timeline, Tooltip } from 'antd';
import { ArrowLeftOutlined, CaretRightOutlined, PauseOutlined, StopOutlined } from '@ant-design/icons';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  cancelRideByAdmin,
  fetchRideDetail,
  fetchRideMessages,
  parseTrackCoordinates,
  type RideStop,
} from '../api/admin';
import { canDispatch } from '../auth/auth';
import {
  actorRoleLabel,
  isRideCancellable,
  RIDE_STATUS,
  rideEventLabel,
  VEHICLE_TYPE_LABEL,
} from '../constants';

import { DEFAULT_MAP_CENTER, MAP_HEIGHT, MAP_STYLE } from '../components/mapStyle';
import { apiError } from '../utils/apiError';
import { fmtYuan } from '../utils/money';
const TRACK_SOURCE_ID = 'ride-track';
const TRACK_LAYER_ID = 'ride-track-line';
const PLAYBACK_INTERVAL_MS = 300;

/** 停靠點 marker 色：待處理＝藍、已到達＝綠、已跳過＝灰（沒去過的地方不該搶眼） */
const STOP_MARKER_COLOR = { pending: '#1677ff', arrived: '#52c41a', skipped: '#bfbfbf' };

function fmtTime(t: string | null): string {
  return t ? new Date(t).toLocaleString('zh-TW') : '—';
}

/** 車種 code → 顯示名；'' 為乘客未指定 */
function vehicleTypeText(code: string): string {
  if (!code) return '不指定';
  return VEHICLE_TYPE_LABEL[code] ?? code;
}

/** 停靠點處理狀態；arrived_at／skipped_at 互斥，皆無＝待處理 */
function stopState(s: RideStop): 'arrived' | 'skipped' | 'pending' {
  if (s.skipped_at) return 'skipped';
  if (s.arrived_at) return 'arrived';
  return 'pending';
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

  // 行程對話稽核（admin 唯讀）；後端 GET /api/rides/:id/messages
  const { data: messages = [] } = useQuery({
    queryKey: ['ride-messages', rideId],
    queryFn: () => fetchRideMessages(rideId),
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
  const stops = useMemo(() => data?.stops ?? [], [data]);
  // 只有停靠點、還沒有軌跡的行程（尚未開始跑）也要看得到地圖
  const showMap = coordinates.length > 0 || stops.length > 0;

  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
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
      // marker 掛在被 remove 的 map 上，ref 留著會在下次繪製時重複疊加
      stopMarkersRef.current = [];
      vehicleMarkerRef.current = null;
    };
  }, [isLoading, showMap]);

  // 軌跡區塊高度變更時重算地圖尺寸
  useEffect(() => {
    mapRef.current?.resize();
  }, [showMap]);

  // 軌跡載入後畫線 + 移動車輛 marker 到起點；停靠點各自落 marker；視角框住全部點
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showMap) return;

    const draw = () => {
      if (coordinates.length > 0) {
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
      }

      // 多停靠點（N）：每站一個 marker，popup 說明是誰、上車還是下車、處理了沒。
      // 每次重畫先清空，避免資料更新後舊 marker 疊在圖上。
      stopMarkersRef.current.forEach((m) => m.remove());
      stopMarkersRef.current = stops.map((s) => {
        const state = stopState(s);
        const kindText = s.kind === 'pickup' ? '上車' : '下車';
        const stateText =
          state === 'arrived' ? `已到達 ${fmtTime(s.arrived_at)}`
          : state === 'skipped' ? `已跳過 ${fmtTime(s.skipped_at)}`
          : '待處理';
        return new maplibregl.Marker({ color: STOP_MARKER_COLOR[state] })
          .setLngLat([s.lng, s.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 24 }).setText(
              `${s.seq}. ${s.passenger_label ? `乘客 ${s.passenger_label} ` : ''}${kindText}` +
                `${s.address ? `／${s.address}` : ''}／${stateText}`,
            ),
          )
          .addTo(map);
      });

      const points: [number, number][] = [
        ...coordinates,
        ...stops.map((s) => [s.lng, s.lat] as [number, number]),
      ];
      if (points.length === 0) return;
      const bounds = points.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(points[0], points[0]),
      );
      map.fitBounds(bounds, { padding: 40, maxZoom: 16 });
    };

    if (map.isStyleLoaded()) {
      draw();
    } else {
      map.once('load', draw);
    }
  }, [coordinates, stops, showMap]);

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
    <Space orientation="vertical" style={{ width: '100%' }} size={16}>
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
            {
              // P1：乘客「要求」什麼車。這是清潔費加收與否的依據，
              // 客服要靠它解釋「為什麼這筆多收了清潔費」。
              key: 'required_vehicle_type',
              label: '乘客指定車種',
              children: ride.required_vehicle_type ? (
                <Tag color={ride.required_vehicle_type === 'pet' ? 'orange' : 'blue'}>
                  {vehicleTypeText(ride.required_vehicle_type)}
                </Tag>
              ) : (
                '不指定'
              ),
            },
            {
              // O7：接單當下定格的司機車輛。與上一欄是**兩回事**——
              // 前者是乘客要什麼車，後者是實際派來哪台；司機日後換車也不會動到這筆。
              key: 'driver_vehicle',
              label: '當時車輛（快照）',
              children: ride.driver_vehicle_type || ride.driver_plate_number ? (
                <Space size={8}>
                  <span>{vehicleTypeText(ride.driver_vehicle_type)}</span>
                  <span style={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                    {ride.driver_plate_number || '—'}
                  </span>
                </Space>
              ) : (
                '—'
              ),
            },
            ...(ride.fare_amount_cents != null
              ? [
                  { key: 'fare', label: '車資', children: fmtYuan(ride.fare_amount_cents) },
                  {
                    // 後端未加收時不帶此欄（null）；null ＝沒加收，不是 0 元的加收
                    key: 'cleaning_fee',
                    label: '寵物車清潔費',
                    children:
                      ride.cleaning_fee_cents != null ? fmtYuan(ride.cleaning_fee_cents) : '未加收',
                  },
                  {
                    key: 'commission',
                    label: '手續費',
                    children:
                      ride.commission_amount_cents != null
                        ? fmtYuan(ride.commission_amount_cents)
                        : '—',
                  },
                  {
                    key: 'driver_net',
                    label: '司機實得',
                    children:
                      ride.driver_net_amount_cents != null
                        ? fmtYuan(ride.driver_net_amount_cents)
                        : '—',
                  },
                ]
              : []),
          ]}
        />
      </Card>

      {/* 多停靠點（N）：單點訂單沒有 stops，整塊不顯示（不留一張空卡片） */}
      {stops.length > 0 && (
        <Card title={`停靠點（${stops.length} 站）`}>
          <Timeline
            items={stops.map((s) => {
              const state = stopState(s);
              const kindText = s.kind === 'pickup' ? '上車' : '下車';
              return {
                key: String(s.id),
                color:
                  state === 'arrived' ? 'green' : state === 'skipped' ? 'gray' : 'blue',
                content: (
                  <Space orientation="vertical" size={0}>
                    <Space wrap>
                      <strong
                        style={{
                          // 跳過＝乘客沒出現、司機沒去，且不計入車資；刪除線讓它一眼與其他站分開
                          textDecoration: state === 'skipped' ? 'line-through' : undefined,
                        }}
                      >
                        {s.seq}. {s.passenger_label ? `乘客 ${s.passenger_label} ` : ''}
                        {kindText}
                      </strong>
                      {state === 'arrived' && <Tag color="success">已到達</Tag>}
                      {state === 'skipped' && <Tag>已跳過（不計費）</Tag>}
                      {state === 'pending' && <Tag color="processing">待處理</Tag>}
                    </Space>
                    <span>{s.address || '（無地址）'}</span>
                    <span style={{ color: '#666', fontSize: 12 }}>
                      {s.lat.toFixed(6)}, {s.lng.toFixed(6)}
                      {state === 'arrived' ? ` · ${fmtTime(s.arrived_at)}` : ''}
                      {state === 'skipped' ? ` · ${fmtTime(s.skipped_at)}` : ''}
                    </span>
                  </Space>
                ),
              };
            })}
          />
        </Card>
      )}

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

      <Card title={`行程對話（稽核）${messages.length > 0 ? ` · ${messages.length} 則` : ''}`}>
        {messages.length === 0 ? (
          <Empty description="此行程無對話紀錄" />
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {messages.map((m) => {
              const isDriver = m.sender_role === 'driver';
              return (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <Space size={8} wrap>
                    <Tag color={isDriver ? 'blue' : 'green'}>
                      {isDriver ? '司機' : '乘客'} #{m.sender_id}
                    </Tag>
                    <span style={{ color: '#666', fontSize: 12 }}>{fmtTime(m.created_at)}</span>
                  </Space>
                  <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        title={stops.length > 0 ? '軌跡回放與停靠點' : '軌跡回放'}
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
        {!showMap && (
          <div style={{ padding: 16 }}>
            <Empty description="尚無軌跡資料" />
          </div>
        )}
        {coordinates.length === 0 && stops.length > 0 && (
          <div style={{ padding: '12px 24px 0' }}>
            <Alert
              type="info"
              showIcon
              title="尚無軌跡資料，地圖僅顯示停靠點位置"
            />
          </div>
        )}
        {/* 地圖容器固定掛載，避免軌跡資料非同步到位時因 DOM 節點替換導致 ref 失聯 */}
        <div
          ref={containerRef}
          style={{ height: showMap ? MAP_HEIGHT.track : 0, width: '100%', overflow: 'hidden' }}
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
