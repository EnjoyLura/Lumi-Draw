import { EditOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Space, Switch, Table, Typography } from "antd";
import { useState } from "react";
import { apiDeleteRatio, apiGetRatios, apiSaveRatio, apiSetRatioEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { nextId, RATIOS, type AdminRatio } from "../data/mock";
import { getRatios } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { SortCtrl } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

interface RatioValues { label: string; desc: string; }
function RatioForm({ item, useMock, onSaved }: { item?: AdminRatio; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav(); const [form] = Form.useForm<RatioValues>(); const [saving, setSaving] = useState(false);
  const save = async (values: RatioValues) => { setSaving(true); try { const payload = { label: values.label.trim(), desc: values.desc.trim() }; if (useMock) { if (item) Object.assign(item, payload); else RATIOS.push({ id: nextId(RATIOS), on: true, ...payload }); } else await apiSaveRatio(item?.id || 0, { id: item?.id || 0, on: item?.on ?? true, ...payload }); closeSheet(); onSaved(); toast(item ? "尺寸比例已保存" : "尺寸比例已新增"); } catch (cause) { toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试"); } finally { setSaving(false); } };
  return <Form form={form} layout="vertical" initialValues={item} onFinish={save} requiredMark={false}><Form.Item label="比例" name="label" rules={[{ required: true, whitespace: true, message: "请输入比例" }]}><Input placeholder="例如：16:9" /></Form.Item><Form.Item label="说明" name="desc"><Input placeholder="例如：宽屏横图" /></Form.Item><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" htmlType="submit" loading={saving}>保存</Button></div></Form>;
}

export function OpsRatio() {
  const { openSheet, toast, confirmDlg } = useNav(); const { useMock } = useAdminSession(); const refresh = useRefresh(); const { data, loading, error, reload } = useAsyncData<AdminRatio[]>(useMock ? null : apiGetRatios, [useMock]); const ratios = useMock ? getRatios() : data ?? [];
  const afterSaved = () => useMock ? refresh() : void reload(); const openForm = (item?: AdminRatio) => openSheet(item ? "编辑尺寸比例" : "新增尺寸比例", <RatioForm item={item} useMock={useMock} onSaved={afterSaved} />);
  const remove = (item: AdminRatio) => confirmDlg("删除尺寸比例", `确认删除「${item.label}」吗？`, () => void (async () => { try { if (useMock) { const index = ratios.findIndex((ratio) => ratio.id === item.id); if (index >= 0) ratios.splice(index, 1); refresh(); } else { await apiDeleteRatio(item.id); await reload(); } toast("尺寸比例已删除"); } catch (cause) { toast(cause instanceof Error ? cause.message : "删除失败，请稍后重试"); } })(), true);
  const move = async (index: number, direction: number) => { moveItem(ratios, index, direction); if (useMock) refresh(); else { try { await Promise.all(ratios.map((ratio, sort) => apiSaveRatio(ratio.id, { ...ratio, sort: sort + 1 }))); await reload(); } catch (cause) { toast(cause instanceof Error ? cause.message : "排序保存失败，请稍后重试"); await reload(); } } };
  const toggleEnabled = async (item: AdminRatio, enabled: boolean) => { try { if (useMock) { item.on = enabled; refresh(); } else { await apiSetRatioEnabled(item.id, enabled); await reload(); } } catch (cause) { toast(cause instanceof Error ? cause.message : "更新状态失败，请稍后重试"); } };
  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="尺寸比例" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新增比例</Button>}><Table<AdminRatio> rowKey="id" loading={loading} dataSource={ratios} pagination={false} locale={{ emptyText: error || "暂无尺寸比例" }} columns={[
    { title: "比例", dataIndex: "label", render: (value) => <Space><span className="lumi-table-icon"><SwapOutlined /></span><Typography.Text strong>{value}</Typography.Text></Space> },
    { title: "说明", dataIndex: "desc" },
    { title: "启用", dataIndex: "on", width: 110, render: (enabled, item) => <Switch size="small" checked={enabled} onChange={(checked) => void toggleEnabled(item, checked)} /> },
    { title: "排序", width: 170, render: (_, __, index) => <Space><Typography.Text type="secondary">{index + 1}</Typography.Text><SortCtrl index={index} len={ratios.length} onMove={(direction) => void move(index, direction)} /></Space> },
    { title: "操作", width: 160, render: (_, item) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(item)}>编辑</Button><Button type="link" danger onClick={() => remove(item)}>删除</Button></Space> }
  ]} /></Card></div>;
}
