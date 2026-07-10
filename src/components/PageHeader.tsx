import type { ReactNode } from 'react';
import { Typography } from 'antd';

/** 全站統一頁面標題列：左標題、右操作區（spec §4.3） */
export default function PageHeader({ title, extra }: { title: string; extra?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
      {extra}
    </div>
  );
}
