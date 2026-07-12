import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Modal, Select, Switch, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { createAdmin, listAdmins, updateAdmin, type AdminUser } from '../api/admin';
import { apiError } from '../utils/apiError';

const ROLE_OPTS = [
  { value: 'viewer', label: '檢視者' },
  { value: 'dispatcher', label: '派單員' },
  { value: 'superadmin', label: '超級管理員' },
];

interface CreateAdminForm {
  username: string;
  password: string;
  role: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreateAdminForm>();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: listAdmins,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admins'] });

  const createMut = useMutation({
    mutationFn: createAdmin,
    onSuccess: () => {
      message.success('已建立帳號');
      setOpen(false);
      form.resetFields();
      refresh();
    },
    onError: (err) => message.error(apiError(err, '建立失敗')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<AdminUser> }) =>
      updateAdmin(id, patch),
    onSuccess: () => {
      message.success('已更新');
      refresh();
    },
    onError: (err) => message.error(apiError(err, '更新失敗')),
  });

  const columns: ColumnsType<AdminUser> = [
    { title: '帳號', dataIndex: 'username' },
    {
      title: '角色',
      dataIndex: 'role',
      width: 160,
      render: (role: string, row) => (
        <Select
          size="small"
          value={role}
          options={ROLE_OPTS}
          style={{ width: 130 }}
          onChange={(newRole) => updateMut.mutate({ id: row.id, patch: { role: newRole } })}
        />
      ),
    },
    {
      title: '啟用',
      dataIndex: 'is_active',
      width: 100,
      render: (isActive: boolean, row) => (
        <Switch
          checked={isActive}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          loading={updateMut.isPending && updateMut.variables?.id === row.id}
          onChange={(checked) => updateMut.mutate({ id: row.id, patch: { is_active: checked } })}
        />
      ),
    },
    { title: '建立時間', dataIndex: 'created_at' },
  ];

  const handleCreate = (values: CreateAdminForm) => {
    createMut.mutate(values);
  };

  return (
    <Card title="使用者管理">
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
        新增帳號
      </Button>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={admins}
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 位` }}
        size="middle"
        locale={{ emptyText: '尚無帳號' }}
      />
      <Modal
        title="新增後台帳號"
        open={open}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        confirmLoading={createMut.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="username" label="帳號" rules={[{ required: true, message: '請輸入帳號' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="密碼"
            rules={[
              { required: true, message: '請輸入密碼' },
              { min: 6, message: '密碼至少 6 碼' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '請選擇角色' }]}>
            <Select options={ROLE_OPTS} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
