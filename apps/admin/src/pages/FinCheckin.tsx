import { CalendarOutlined, GiftOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Form, InputNumber, Row, Spin, Statistic, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { apiGetCheckinConfig, apiSaveCheckinConfig, type AdminCheckinConfig } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

const DEFAULT_TIERS = [2, 2, 2, 3, 3, 3, 5].map((c, index) => ({ day: index + 1, c }));
const DEFAULT_CONFIG: AdminCheckinConfig = { base: 2, tiers: DEFAULT_TIERS };

interface CheckinFormValues {
  base: number;
  tiers: Array<{ day: number; c: number }>;
}

export function FinCheckin() {
  const { toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminCheckinConfig>(useMock ? null : apiGetCheckinConfig, [useMock]);
  const [form] = Form.useForm<CheckinFormValues>();
  const [saving, setSaving] = useState(false);
  const config = useMock ? DEFAULT_CONFIG : data ?? DEFAULT_CONFIG;

  useEffect(() => {
    form.setFieldsValue({ base: config.base, tiers: config.tiers });
  }, [config, form]);

  const watchedValues = Form.useWatch([], form);
  const totalPreview = useMemo(() => {
    const values = (watchedValues || form.getFieldsValue(true)) as CheckinFormValues;
    return (values.base || 0) * 7 + (values.tiers || []).reduce((total, item) => total + (item?.c || 0), 0);
  }, [form, watchedValues]);

  const save = async (values: CheckinFormValues) => {
    const normalized = {
      base: Math.max(0, Number(values.base) || 0),
      tiers: DEFAULT_TIERS.map((tier, index) => ({ day: tier.day, c: Math.max(0, Number(values.tiers?.[index]?.c) || 0) }))
    };
    setSaving(true);
    try {
      if (!useMock) {
        await apiSaveCheckinConfig(normalized);
        await reload();
      }
      toast("签到配置已保存");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lumi-admin-page lumi-config-page">
      <Alert showIcon type="info" message="连续签到奖励会叠加每日基础积分；调整后会立即应用到后续签到。" />
      {error ? <Alert showIcon type="error" message="加载签到配置失败" description={error} /> : null}
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={8}>
              <Card title={<><CalendarOutlined /> 每日基础积分</>} className="lumi-config-card">
                <Typography.Paragraph type="secondary">用户每日完成签到即可获得的固定积分。</Typography.Paragraph>
                <Form.Item name="base" rules={[{ required: true, message: "请输入每日基础积分" }]}>
                  <InputNumber min={0} max={100000} precision={0} addonAfter="积分 / 天" style={{ width: "100%" }} />
                </Form.Item>
              </Card>
            </Col>
            <Col xs={24} xl={16}>
              <Card title={<><GiftOutlined /> 连续签到里程碑</>} className="lumi-config-card">
                <Row gutter={[12, 12]}>
                  {DEFAULT_TIERS.map((tier, index) => (
                    <Col key={tier.day} xs={12} sm={8} md={6} xl={3}>
                      <Card size="small" className="lumi-checkin-tier-card">
                        <Typography.Text type="secondary">第 {tier.day} 天</Typography.Text>
                        <Form.Item name={["tiers", index, "c"]} initialValue={tier.c} rules={[{ required: true, message: "必填" }]}>
                          <InputNumber min={0} max={100000} precision={0} addonAfter="分" style={{ width: "100%" }} />
                        </Form.Item>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>
          <Card className="lumi-form-actions-card">
            <Statistic title="按当前规则，连续签到 7 天最多可得" value={totalPreview} suffix="积分" />
            <Button type="primary" htmlType="submit" loading={saving}>保存签到配置</Button>
          </Card>
        </Form>
      </Spin>
    </div>
  );
}
