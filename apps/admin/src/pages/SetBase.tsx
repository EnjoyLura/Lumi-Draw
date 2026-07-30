import { GiftOutlined, HeartOutlined, RocketOutlined, UserAddOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Form, InputNumber, Row, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { apiGetCreditsConfig, apiSaveCreditsConfig, type AdminCreditsConfig } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

type CreditField = "registerGift" | "publishReward" | "favoriteReward" | "inviteReward";

const CREDIT_ITEMS: Array<{ key: CreditField; label: string; description: string; icon: React.ReactNode; color: string }> = [
  { key: "registerGift", label: "新用户赠礼", description: "用户首次完成注册后发放", icon: <GiftOutlined />, color: "#5b9fe8" },
  { key: "publishReward", label: "发布作品奖励", description: "作品成功发布后发放", icon: <RocketOutlined />, color: "#22a06b" },
  { key: "favoriteReward", label: "收藏互动奖励", description: "用户收藏作品时发放", icon: <HeartOutlined />, color: "#d85c7f" },
  { key: "inviteReward", label: "邀请奖励", description: "被邀请用户完成注册后发放", icon: <UserAddOutlined />, color: "#8b7fd6" }
];

const DEFAULT_CONFIG: AdminCreditsConfig = { registerGift: 50, publishReward: 2, favoriteReward: 0, inviteReward: 10 };

export function SetBase() {
  const { toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminCreditsConfig>(useMock ? null : apiGetCreditsConfig, [useMock]);
  const [form] = Form.useForm<AdminCreditsConfig>();
  const [saving, setSaving] = useState(false);
  const config = useMock ? DEFAULT_CONFIG : data ?? DEFAULT_CONFIG;

  useEffect(() => {
    form.setFieldsValue(config);
  }, [config, form]);

  const save = async (values: AdminCreditsConfig) => {
    setSaving(true);
    try {
      if (!useMock) {
        await apiSaveCreditsConfig(values);
        await reload();
      }
      toast("积分基础配置已保存");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lumi-admin-page lumi-config-page">
      <Alert showIcon type="info" message="积分变更会直接影响新用户、作品发布与邀请活动的成本，请确认后保存。" />
      {error ? <Alert showIcon type="error" message="加载积分配置失败" description={error} /> : null}
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Row gutter={[16, 16]}>
            {CREDIT_ITEMS.map((item) => (
              <Col key={item.key} xs={24} md={12} xl={6}>
                <Card className="lumi-config-value-card">
                  <div className="lumi-config-value-card__head">
                    <span className="lumi-config-value-card__icon" style={{ background: `${item.color}18`, color: item.color }}>{item.icon}</span>
                    <div>
                      <Typography.Text strong>{item.label}</Typography.Text>
                      <Typography.Paragraph type="secondary">{item.description}</Typography.Paragraph>
                    </div>
                  </div>
                  <Form.Item name={item.key} rules={[{ required: true, message: "请输入积分数量" }]}>
                    <InputNumber min={0} max={100000} precision={0} addonAfter="积分" style={{ width: "100%" }} />
                  </Form.Item>
                </Card>
              </Col>
            ))}
          </Row>
          <Card className="lumi-form-actions-card">
            <Button type="primary" htmlType="submit" loading={saving}>保存积分配置</Button>
          </Card>
        </Form>
      </Spin>
    </div>
  );
}
