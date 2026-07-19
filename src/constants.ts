// 訂單狀態（對齊後端 constants/ride.go；tag 色對齊 spec §1.1 語意色）
export const RIDE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '待派單', color: 'warning' },
  1: { label: '已派單', color: 'processing' },
  2: { label: '前往接客', color: 'blue' },
  3: { label: '行程中', color: 'geekblue' },
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

/** 車種顯示名（對齊後端 constants/vehicle.go 的 code） */
export const VEHICLE_TYPE_LABEL: Record<string, string> = {
  sedan: '轎車',
  suv: '休旅車',
  van7: '七人座',
  accessible: '無障礙車',
  pet: '寵物用車',
};

/** 車輛審核狀態（O5，對齊後端 constants.VehicleReview*） */
export const VEHICLE_REVIEW_STATUS: Record<string, { label: string; color: string }> = {
  '': { label: '未填車輛', color: 'default' },
  pending: { label: '待審核', color: 'warning' },
  approved: { label: '已核准', color: 'success' },
  rejected: { label: '已退回', color: 'error' },
};

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
