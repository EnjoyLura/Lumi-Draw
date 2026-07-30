import {
  AuditOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SettingOutlined
} from "@ant-design/icons";
import { Alert, Button, Card, Col, List, Radio, Row, Spin, Switch, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { apiGetSystemSettings, apiSaveSystemSettings, type AdminSystemSettings } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

const MANAGE_ITEMS = [
  { id: "setAudit", label: "审核设置", description: "配置自动审核与人工复核策略", icon: <AuditOutlined />, color: "#d88900" },
  { id: "setSensitive", label: "敏感词管理", description: "维护提示词、标题和评论的敏感内容规则", icon: <SafetyCertificateOutlined />, color: "#d85c7f" },
  { id: "setVersion", label: "版本管理", description: "发布小程序更新说明和强制升级策略", icon: <FileTextOutlined />, color: "#5b9fe8" },
  { id: "setAgreement", label: "协议管理", description: "维护用户协议、隐私政策和社区规则", icon: <FileProtectOutlined />, color: "#8b7fd6" }
];

export function Settings() {
  const { go, toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminSystemSettings>(useMock ? null : apiGetSystemSettings, [useMock]);
  const [reviewMode, setReviewMode] = useState<"auto" | "manual">("manual");
  const [manualReviewEnabled, setManualReviewEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!useMock && data) {
      setReviewMode(data.reviewMode === "auto" ? "auto" : "manual");
      setManualReviewEnabled(data.manualReviewEnabled);
    }
  }, [data, useMock]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      if (!useMock) {
        const saved = await apiSaveSystemSettings({ reviewMode, manualReviewEnabled });
        setReviewMode(saved.reviewMode === "auto" ? "auto" : "manual");
        setManualReviewEnabled(saved.manualReviewEnabled);
        await reload();
      }
      toast("系统设置已保存");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lumi-admin-page lumi-settings-page">
      <Alert showIcon type="info" message="系统级配置会影响创作审核流程，请在调整后确认小程序端体验。" />
      {error ? <Alert showIcon type="error" message="加载系统设置失败" description={error} /> : null}
      <Spin spinning={loading}>
        <Card title={<><SettingOutlined /> 平台审核策略</>} className="lumi-settings-policy-card">
          <Row gutter={[24, 20]} align="middle">
            <Col xs={24} lg={15}>
              <Typography.Text strong>作品审核模式</Typography.Text>
              <Typography.Paragraph type="secondary">自动审核会由内容安全服务先行判定；人工审核会将发布作品进入审核队列。</Typography.Paragraph>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={reviewMode}
                onChange={(event) => {
                  const next = event.target.value as "auto" | "manual";
                  setReviewMode(next);
                  setManualReviewEnabled(next === "manual");
                }}
                options={[{ label: "自动审核", value: "auto" }, { label: "人工审核", value: "manual" }]}
              />
            </Col>
            <Col xs={24} lg={9}>
              <div className="lumi-settings-switch-row">
                <div>
                  <Typography.Text strong>开启人工复核</Typography.Text>
                  <Typography.Paragraph type="secondary">作品发布前由管理员确认。</Typography.Paragraph>
                </div>
                <Switch
                  checked={manualReviewEnabled}
                  onChange={(checked) => {
                    setManualReviewEnabled(checked);
                    setReviewMode(checked ? "manual" : "auto");
                  }}
                />
              </div>
            </Col>
          </Row>
          <div className="lumi-settings-policy-card__footer">
            <Tag color={reviewMode === "manual" ? "gold" : "blue"}>{reviewMode === "manual" ? "当前：人工审核" : "当前：自动审核"}</Tag>
            <Button type="primary" onClick={saveSettings} loading={saving}>保存审核策略</Button>
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="内容与安全" className="lumi-settings-nav-card">
              <List
                dataSource={MANAGE_ITEMS.slice(0, 2)}
                renderItem={(item) => (
                  <List.Item actions={[<Button key="go" type="text" icon={<RightOutlined />} onClick={() => go(item.id, undefined, true)} />]}>
                    <List.Item.Meta
                      avatar={<span className="lumi-settings-nav-card__icon" style={{ background: `${item.color}18`, color: item.color }}>{item.icon}</span>}
                      title={item.label}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="应用治理" className="lumi-settings-nav-card">
              <List
                dataSource={MANAGE_ITEMS.slice(2)}
                renderItem={(item) => (
                  <List.Item actions={[<Button key="go" type="text" icon={<RightOutlined />} onClick={() => go(item.id, undefined, true)} />]}>
                    <List.Item.Meta
                      avatar={<span className="lumi-settings-nav-card__icon" style={{ background: `${item.color}18`, color: item.color }}>{item.icon}</span>}
                      title={item.label}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
