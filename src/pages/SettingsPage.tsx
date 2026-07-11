import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, InputNumber, message, Skeleton } from 'antd';

import {
  fetchDispatchSettings,
  updateDispatchSettings,
  type DispatchSettings,
} from '../api/admin';
import { canDispatch } from '../auth/auth';
import { apiError } from '../utils/apiError';

const FIELD_RULES = {
  radius_m: { min: 100, max: 50000, label: '搜尋半徑（公尺）' },
  max_drivers: { min: 1, max: 20, label: '每趟最多派幾位司機' },
  offer_timeout_sec: { min: 5, max: 120, label: '派單逾時（秒）' },
  max_attempts: { min: 1, max: 10, label: '最大重派次數' },
  rate_limit_per_min: { min: 1, max: 30, label: '叫車限流（次/分）' },
} as const;

export default function SettingsPage() {
  const [form] = Form.useForm<DispatchSettings>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dispatch-settings'],
    queryFn: fetchDispatchSettings,
  });

  useEffect(() => {
    if (data) form.setFieldsValue(data);
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: DispatchSettings) => updateDispatchSettings(values),
    onSuccess: (updated) => {
      message.success('派單參數已更新');
      form.setFieldsValue(updated);
      queryClient.setQueryData(['dispatch-settings'], updated);
    },
    onError: (err) => message.error(apiError(err, '更新失敗')),
  });

  if (isLoading) {
    return (
      <Card title="派單參數設定">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (error) {
    return <Alert type="error" message="讀取派單參數失敗" showIcon />;
  }

  return (
    <Card title="派單參數設定">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        message="執行期設定"
        description="變更立即生效；後端重啟後會還原為 .env 預設值。"
      />
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 480 }}
        onFinish={(values) => mutation.mutate(values)}
      >
        {(Object.keys(FIELD_RULES) as (keyof DispatchSettings)[]).map((key) => {
          const { min, max, label } = FIELD_RULES[key];
          return (
            <Form.Item
              key={key}
              name={key}
              label={label}
              rules={[
                { required: true, message: `請填寫${label}` },
                { type: 'number', min, max, message: `範圍 ${min}–${max}` },
              ]}
            >
              <InputNumber min={min} max={max} style={{ width: '100%' }} />
            </Form.Item>
          );
        })}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            disabled={!canDispatch()}
          >
            儲存
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
