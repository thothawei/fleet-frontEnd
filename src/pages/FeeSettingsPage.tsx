import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Form, InputNumber, Skeleton } from 'antd';

import { fetchFeeSettings, updateFeeSettings, type FeeSettings } from '../api/admin';
import { isSuperadmin } from '../auth/auth';
import { apiError } from '../utils/apiError';

// 表單以「元 / %」為單位（對使用者友善），送出前換算回後端的「分 / bps」。
interface FeeFormValues {
  base_fare: number;
  per_km_fare: number;
  min_fare: number;
  commission_pct: number;
  monthly_membership_fee: number;
  lost_item_fee_pct: number;
  pet_cleaning_fee_pct: number;
}

/** 寵物車清潔費上限（O6 拍板 30%）；後端 DB CHECK `chk_fleet_settings_pet_cleaning_fee_bps` 為最後防線 */
const PET_CLEANING_FEE_MAX_PCT = 30;

function toForm(s: FeeSettings): FeeFormValues {
  return {
    base_fare: s.base_fare_cents / 100,
    per_km_fare: s.per_km_fare_cents / 100,
    min_fare: s.min_fare_cents / 100,
    commission_pct: s.commission_bps / 100,
    monthly_membership_fee: s.monthly_membership_fee_cents / 100,
    lost_item_fee_pct: s.lost_item_fee_bps / 100,
    pet_cleaning_fee_pct: (s.pet_cleaning_fee_bps ?? 0) / 100,
  };
}

function toApi(v: FeeFormValues): Partial<FeeSettings> {
  return {
    base_fare_cents: Math.round(v.base_fare * 100),
    per_km_fare_cents: Math.round(v.per_km_fare * 100),
    min_fare_cents: Math.round(v.min_fare * 100),
    commission_bps: Math.round(v.commission_pct * 100),
    monthly_membership_fee_cents: Math.round(v.monthly_membership_fee * 100),
    lost_item_fee_bps: Math.round(v.lost_item_fee_pct * 100),
    pet_cleaning_fee_bps: Math.round(v.pet_cleaning_fee_pct * 100),
  };
}

export default function FeeSettingsPage() {
  const [form] = Form.useForm<FeeFormValues>();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading, error } = useQuery({
    queryKey: ['fee-settings'],
    queryFn: fetchFeeSettings,
  });

  useEffect(() => {
    if (data) form.setFieldsValue(toForm(data));
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: FeeFormValues) => updateFeeSettings(toApi(values)),
    onSuccess: (updated) => {
      message.success('費率設定已更新');
      form.setFieldsValue(toForm(updated));
      queryClient.setQueryData(['fee-settings'], updated);
    },
    onError: (err) => message.error(apiError(err, '更新失敗')),
  });

  if (isLoading) {
    return (
      <Card title="費率設定">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (error) {
    return <Alert type="error" title="讀取費率設定失敗" showIcon />;
  }

  return (
    <Card title="費率設定">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        title="手續費與會費設定"
        description="變更只影響之後完成的行程；已完成行程沿用當時費率（快照制），歷史報表不受影響。"
      />
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 480 }}
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="base_fare"
          label="起步價（元）"
          rules={[{ required: true, message: '請填寫起步價' }, { type: 'number', min: 0, max: 10000 }]}
        >
          {/* 台幣無小數：金額欄位一律整數元（precision=0） */}
          <InputNumber min={0} max={10000} precision={0} prefix="NT$" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="per_km_fare"
          label="每公里費率（元）"
          rules={[{ required: true, message: '請填寫每公里費率' }, { type: 'number', min: 0, max: 10000 }]}
        >
          <InputNumber min={0} max={10000} precision={0} prefix="NT$" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="min_fare"
          label="最低車資（元）"
          rules={[{ required: true, message: '請填寫最低車資' }, { type: 'number', min: 0, max: 10000 }]}
        >
          <InputNumber min={0} max={10000} precision={0} prefix="NT$" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="commission_pct"
          label="手續費（%）"
          rules={[{ required: true, message: '請填寫手續費百分比' }, { type: 'number', min: 0, max: 100 }]}
        >
          <InputNumber min={0} max={100} precision={2} suffix="%" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="monthly_membership_fee"
          label="月會費（元）"
          rules={[{ required: true, message: '請填寫月會費' }, { type: 'number', min: 0, max: 1000000 }]}
        >
          <InputNumber min={0} max={1000000} precision={0} prefix="NT$" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="lost_item_fee_pct"
          label="遺失物協尋處理費（%）"
          tooltip="乘客申請遺失物協尋時，按該趟車資的此比例收取處理費；金額於建單當下快照，調整不影響既有協尋單。"
          rules={[{ required: true, message: '請填寫遺失物處理費百分比' }, { type: 'number', min: 0, max: 100 }]}
        >
          <InputNumber min={0} max={100} precision={2} suffix="%" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="pet_cleaning_fee_pct"
          label={`寵物車清潔費（%，上限 ${PET_CLEANING_FEE_MAX_PCT}%）`}
          tooltip="依乘客指定的車種加收（不是司機開的車種）：乘客指定「寵物用車」時，按該趟車資的此比例加收清潔費。金額於行程完成當下快照，調整不影響歷史行程。清潔費不計入抽成、不計入營業額，全額歸司機。"
          rules={[
            { required: true, message: '請填寫寵物車清潔費百分比' },
            { type: 'number', min: 0, max: PET_CLEANING_FEE_MAX_PCT, message: `需介於 0 與 ${PET_CLEANING_FEE_MAX_PCT}% 之間` },
          ]}
        >
          <InputNumber
            min={0}
            max={PET_CLEANING_FEE_MAX_PCT}
            precision={2}
            suffix="%"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={!isSuperadmin()}>
            儲存
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
