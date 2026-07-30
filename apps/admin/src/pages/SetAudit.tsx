import { AuditOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Row, Spin, Switch, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { apiGetReviewSettings, apiSaveReviewSettings, type AdminReviewSettings } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

interface AuditControl { key: keyof AdminReviewSettings; title: string; description: string; icon: React.ReactNode; color: string; disabled?: boolean; }

export function SetAudit() {
  const { toast } = useNav(); const { useMock } = useAdminSession(); const { data, loading, error, reload } = useAsyncData<AdminReviewSettings>(useMock ? null : apiGetReviewSettings, [useMock]);
  const [settings, setSettings] = useState<AdminReviewSettings>({ wxTextSecCheckEnabled: true, wxImageSecCheckEnabled: true, manualReviewEnabled: true, autoPublishAfterPass: false }); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!useMock && data) setSettings(data); }, [data, useMock]);
  const controls: AuditControl[] = [
    { key: "wxTextSecCheckEnabled", title: "文本内容安全审核", description: "提示词、标题、描述等文字内容将进入安全检测。", icon: <SafetyCertificateOutlined />, color: "#5b9fe8" },
    { key: "wxImageSecCheckEnabled", title: "图片内容安全审核", description: "生成图、上传图与发布图将进入图片安全检测。", icon: <SafetyCertificateOutlined />, color: "#d85c7f" },
    { key: "manualReviewEnabled", title: "人工审核", description: "作品通过机器审核后仍需管理员确认发布。", icon: <AuditOutlined />, color: "#d88900" },
    { key: "autoPublishAfterPass", title: "机器审核通过后自动发布", description: "仅在关闭人工审核时可用。", icon: <CheckCircleOutlined />, color: "#22a06b", disabled: settings.manualReviewEnabled }
  ];
  const toggle = (key: keyof AdminReviewSettings, checked: boolean) => setSettings((previous) => key === "manualReviewEnabled" ? { ...previous, manualReviewEnabled: checked, autoPublishAfterPass: checked ? false : previous.autoPublishAfterPass } : { ...previous, [key]: checked });
  const save = async () => { setSaving(true); try { if (!useMock) { await apiSaveReviewSettings(settings); await reload(); } toast("审核设置已保存"); } catch (cause) { toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试"); } finally { setSaving(false); } };
  return <div className="lumi-admin-page lumi-config-page"><Alert showIcon type="warning" message="审核策略会直接影响作品是否可发布，请确认业务规则后保存。" />{error ? <Alert showIcon type="error" message="加载审核设置失败" description={error} /> : null}<Spin spinning={loading}><Row gutter={[16, 16]}>{controls.map((control) => <Col key={control.key} xs={24} md={12}><Card className="lumi-audit-control-card"><span className="lumi-config-value-card__icon" style={{ background: `${control.color}18`, color: control.color }}>{control.icon}</span><div><Typography.Text strong>{control.title}</Typography.Text><Typography.Paragraph type="secondary">{control.description}</Typography.Paragraph></div><Switch checked={settings[control.key]} disabled={control.disabled} onChange={(checked) => toggle(control.key, checked)} /></Card></Col>)}</Row><Card className="lumi-form-actions-card"><Tag color={settings.manualReviewEnabled ? "gold" : "green"}>{settings.manualReviewEnabled ? "当前：人工审核" : "当前：机器审核自动发布"}</Tag><Button type="primary" onClick={save} loading={saving}>保存审核策略</Button></Card></Spin></div>;
}
