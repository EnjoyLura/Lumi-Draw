import { CrownOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, InputNumber, Spin, Table, Typography } from "antd";
import { useEffect, useState } from "react";
import { apiGetCreatorTitles, apiSaveCreatorTitles, type AdminCreatorTitleTier } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

const DEFAULT_TIERS: AdminCreatorTitleTier[] = [{ minWorks: 0, name: "画布新星" }, { minWorks: 1, name: "灵感画师" }, { minWorks: 10, name: "创意达人" }, { minWorks: 30, name: "风格主理人" }, { minWorks: 50, name: "光影大师" }, { minWorks: 100, name: "星耀艺术家" }];

export function OpsCreatorTitle() {
  const { useMock } = useAdminSession(); const { toast } = useNav(); const { data, loading, error } = useAsyncData(useMock ? null : apiGetCreatorTitles, [useMock]); const [tiers, setTiers] = useState<AdminCreatorTitleTier[]>(DEFAULT_TIERS); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!useMock && data) setTiers(data.tiers); }, [data, useMock]);
  const update = (index: number, patch: Partial<AdminCreatorTitleTier>) => setTiers((previous) => previous.map((tier, current) => current === index ? { ...tier, ...patch } : tier));
  const save = async () => { const normalized = tiers.map((tier) => ({ name: tier.name.trim(), minWorks: Math.max(0, Math.floor(Number(tier.minWorks) || 0)) })); if (normalized.some((tier) => !tier.name) || normalized.some((tier, index) => index > 0 && tier.minWorks <= normalized[index - 1].minWorks)) { toast("请保证称号名不为空，作品数量逐档递增"); return; } setSaving(true); try { if (!useMock) await apiSaveCreatorTitles(normalized); toast("创作者称号已保存"); } catch (cause) { toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试"); } finally { setSaving(false); } };
  return <div className="lumi-admin-page"><Alert showIcon type="info" message="用户发布作品达到对应数量后自动升级称号，保存后立即生效。" />{error ? <Alert showIcon type="error" message="加载称号配置失败" description={error} /> : null}<Spin spinning={loading}><Card className="lumi-table-card" title="创作者称号阶梯" extra={<Button type="primary" icon={<SaveOutlined />} onClick={() => void save()} loading={saving}>保存配置</Button>}><Table rowKey={(_, index) => String(index)} dataSource={tiers} pagination={false} columns={[
    { title: "等级", width: 100, render: (_, __, index) => <Typography.Text strong>Lv.{index + 1}</Typography.Text> },
    { title: "称号", render: (_, tier, index) => <Input value={tier.name} maxLength={12} onChange={(event) => update(index, { name: event.target.value })} prefix={<CrownOutlined style={{ color: "#d88900" }} />} /> },
    { title: "解锁条件", width: 260, render: (_, tier, index) => <InputNumber min={0} value={tier.minWorks} onChange={(value) => update(index, { minWorks: Number(value) || 0 })} addonBefore="已发布作品 ≥" addonAfter="件" style={{ width: "100%" }} /> }
  ]} /></Card></Spin></div>;
}
