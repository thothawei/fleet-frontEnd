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
};
