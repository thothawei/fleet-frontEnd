import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, MailOutlined } from '@ant-design/icons';

import { login } from '../api/admin';
import { saveSession } from '../auth/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const resp = await login(values.email, values.password);
      saveSession(resp.token, resp.name);
      navigate('/');
    } catch {
      message.error('登入失敗，請確認帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          🚗 派遣後台登入
        </Typography.Title>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, message: '請輸入 email' }]}>
            <Input prefix={<MailOutlined />} placeholder="email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '請輸入密碼' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密碼" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            登入
          </Button>
        </Form>
      </Card>
    </div>
  );
}
