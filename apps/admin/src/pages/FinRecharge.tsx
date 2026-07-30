import { EditOutlined, PlusOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Card, Form, InputNumber, Space, Switch, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { apiDeleteRecharge, apiGetRecharges, apiSaveRecharge, apiSetRechargeEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { nextId, RECHARGE_TIERS, type AdminRecharge } from "../data/mock";
import { getRecharges } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { useRefresh } from "./opsShared";

interface RechargeValues { price: number; credits: number; bonus: number; }
function RechargeForm({ item, useMock, onSaved }: { item?: AdminRecharge; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav(); const [form] = Form.useForm<RechargeValues>(); const [saving, setSaving] = useState(false);
  const save = async (values: RechargeValues) => { setSaving(true); try { const payload = { price: Math.max(0, Number(values.price) || 0), credits: Math.max(0, Number(values.credits) || 0), bonus: Math.max(0, Number(values.bonus) || 0) }; if (useMock) { if (item) Object.assign(item, payload); else RECHARGE_TIERS.push({ id: nextId(RECHARGE_TIERS), on: true, ...payload }); } else await apiSaveRecharge(item?.id || 0, { id: item?.id || 0, on: item?.on ?? true, ...payload }); closeSheet(); onSaved(); toast(item ? "充值档位已保存" : "充值档位已新增"); } catch (cause) { toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试"); } finally { setSaving(false); } };
  return <Form form={form} layout="vertical" initialValues={item} onFinish={save} requiredMark={false}>
    <Form.Item label="价格" name="price" rules={[{ required: true, message: "请输入价格" }]}><InputNumber min={1} precision={0} addonBefore="¥" addonAfter="元" style={{ width: "100%" }} /></Form.Item>
    <Form.Item label="到账积分" name="credits" rules={[{ required: true, message: "请输入到账积分" }]}><InputNumber min={0} precision={0} addonAfter="积分" style={{ width: "100%" }} /></Form.Item>
    <Form.Item label="额外赠送" name="bonus" initialValue={0}><InputNumber min={0} precision={0} addonAfter="积分" style={{ width: "100%" }} /></Form.Item>
    <div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" htmlType="submit" loading={saving}>保存</Button></div>
  </Form>;
}

export function FinRecharge() {
  const { openSheet, toast, confirmDlg } = useNav(); const { useMock } = useAdminSession(); const refresh = useRefresh(); const { data, loading, error, reload } = useAsyncData<AdminRecharge[]>(useMock ? null : apiGetRecharges, [useMock]); const tiers = useMock ? getRecharges() : data ?? [];
  const afterSaved = () => useMock ? refresh() : void reload(); const openForm = (item?: AdminRecharge) => openSheet(item ? "编辑充值档位" : "新增充值档位", <RechargeForm item={item} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (item: AdminRecharge, enabled: boolean) => { try { if (useMock) { item.on = enabled; refresh(); } else { await apiSetRechargeEnabled(item.id, enabled); await reload(); } toast(enabled ? "充值档位已启用" : "充值档位已停用"); } catch (cause) { toast(cause instanceof Error ? cause.message : "更新状态失败，请稍后重试"); } };
  const remove = (item: AdminRecharge) => confirmDlg("删除充值档位", `确认删除 ¥${item.price} 档位吗？`, () => void (async () => { try { if (useMock) { const index = tiers.findIndex((tier) => tier.id === item.id); if (index >= 0) tiers.splice(index, 1); refresh(); } else { await apiDeleteRecharge(item.id); await reload(); } toast("充值档位已删除"); } catch (cause) { toast(cause instanceof Error ? cause.message : "删除失败，请稍后重试"); } })(), true);
  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="积分充值档位" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新增档位</Button>}><Table<AdminRecharge> rowKey="id" loading={loading} dataSource={tiers} pagination={false} locale={{ emptyText: error || "暂无充值档位" }} columns={[
    { title: "充值方案", render: (_, item) => <Space><span className="lumi-table-icon"><WalletOutlined /></span><div><Typography.Text strong>¥{item.price} → {item.credits} 积分</Typography.Text><br />{item.bonus ? <Tag color="green">赠送 {item.bonus} 积分</Tag> : <Typography.Text type="secondary">无赠送积分</Typography.Text>}</div></Space> },
    { title: "兑换比例", width: 180, render: (_, item) => item.price ? `${Math.round(item.credits / item.price)} 积分 / 元` : "—" },
    { title: "状态", dataIndex: "on", width: 110, render: (enabled, item) => <Switch size="small" checked={enabled} onChange={(checked) => void toggle(item, checked)} /> },
    { title: "操作", width: 160, render: (_, item) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(item)}>编辑</Button><Button type="link" danger onClick={() => remove(item)}>删除</Button></Space> }
  ]} /></Card></div>;
}
