// 訂單狀態（對齊後端 constants/ride.go）
export const RIDE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '待派單', color: 'default' },
  1: { label: '已派單', color: 'processing' },
  2: { label: '前往接客', color: 'blue' },
  3: { label: '行程中', color: 'green' },
  4: { label: '已完成', color: 'success' },
  9: { label: '已取消', color: 'error' },
};

// 司機狀態（對齊後端 constants/driver.go）
export const DRIVER_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '離線', color: 'default' },
  1: { label: '待命', color: 'success' },
  2: { label: '載客中', color: 'blue' },
  3: { label: '已停用', color: 'error' },
};

/** 後端 DriverStatusDisabled */
export const DRIVER_STATUS_DISABLED = 3;

/** 後台可強制取消的訂單狀態（已上車/已完成/已取消不可） */
export function isRideCancellable(status: number): boolean {
  return status >= 0 && status <= 2;
}

/** ride_events.event_type 中文標籤（對齊後端 events.Event） */
export const RIDE_EVENT_LABEL: Record<string, string> = {
  'ride.requested': '叫車',
  'ride.assigned': '派單',
  'ride.accepted': '接單',
  'driver.arrived': '司機抵達',
  'ride.picked_up': '上車',
  'ride.completed': '完成',
  'ride.cancelled': '取消',
  'ride.redispatched': '重新派單',
};

export const ACTOR_ROLE_LABEL: Record<string, string> = {
  customer: '乘客',
  driver: '司機',
  admin: '後台',
  system: '系統',
};

export function rideEventLabel(eventType: string): string {
  return RIDE_EVENT_LABEL[eventType] ?? eventType;
}

export function actorRoleLabel(role: string): string {
  return ACTOR_ROLE_LABEL[role] ?? (role || '—');
}
