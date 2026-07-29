import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { adminLogin } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { ApiError } from "../data/http";

interface LoginValues {
  username: string;
  password: string;
}

export function AdminLogin() {
  const { onLoggedIn } = useAdminSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async ({ username, password }: LoginValues) => {
    setLoading(true);
    setError("");
    try {
      const token = await adminLogin(username.trim(), password);
      onLoggedIn(token);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lumi-login-page">
      <div className="lumi-login-brand">
        <div className="lumi-login-logo">露</div>
        <div>
          <Typography.Title level={2}>露米绘画AI</Typography.Title>
          <Typography.Text>运营管理后台</Typography.Text>
        </div>
      </div>
      <Card className="lumi-login-card" bordered={false}>
        <Typography.Title level={3}>管理员登录</Typography.Title>
        <Typography.Paragraph type="secondary">
          登录后可管理用户、作品、内容审核与运营配置。
        </Typography.Paragraph>
        {error ? <Alert type="error" showIcon message={error} className="lumi-login-error" /> : null}
        <Form<LoginValues>
          layout="vertical"
          initialValues={{ username: "admin" }}
          requiredMark={false}
          onFinish={(values) => void submit(values)}
        >
          <Form.Item
            label="管理员账号"
            name="username"
            rules={[{ required: true, message: "请输入管理员账号" }]}
          >
            <Input size="large" prefix={<UserOutlined />} placeholder="请输入管理员账号" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="登录密码"
            name="password"
            rules={[{ required: true, message: "请输入登录密码" }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="请输入登录密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Button type="primary" size="large" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form>
        <div className="lumi-login-foot">仅限授权管理员使用</div>
      </Card>
    </div>
  );
}
