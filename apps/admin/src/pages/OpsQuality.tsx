import { EditOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Space, Switch, Table, Typography } from "antd";
import { useState } from "react";
import { apiDeleteQuality, apiGetQualities, apiSaveQuality, apiSetQualityEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { nextId, QUALITIES, type AdminQuality } from "../data/mock";
import { getQualities } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { SortCtrl } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

interface QualityValues { label: string; pixel: string; mult: number; }
function QualityForm({ item, useMock, onSaved }: { item?: AdminQuality; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<QualityValues>();
  const [saving, setSaving] = useState(false);
  const save = async (values: QualityValues) => {
    setSaving(true);
    try {
      const payload = { label: values.label.trim(), pixel: values.pixel.trim(), mult: Number(values.mult) || 0 };
      if (useMock) {
        if (item) Object.assign(item, payload);
        else QUALITIES.push({ id: nextId(QUALITIES), on: true, ...payload });
      } else await apiSaveQuality(item?.id || 0, { id: item?.id || 0, on: item?.on ?? true, ...payload });
      closeSheet(); onSaved(); toast(item ? "分辨率档位已保存" : "分辨率档位已新增");
    } catch (cause) { toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试"); }
    finally { setSaving(false); }
  };
  return <Form form={form} layout="vertical" initialValues={item} onFinish={save} requiredMark={false}>
    <Form.Item label="档位名称" name="label" rules={[{ required: true, whitespace: true, message: "请输入档位名称" }]}><Input placeholder="例如：超清 2K" /></Form.Item>
    <Form.Item label="像素规格" name="pixel" rules={[{ required: true, whitespace: true, message: "请输入像素规格" }]}><Input placeholder="例如：2048px 或 2560×1440" /></Form.Item>
    <Form.Item label="积分倍率" name="mult" rules={[{ required: true, message: "请输入积分倍率" }]}><InputNumber min={0} step={0.1} precision={1} addonAfter="倍" style={{ width: "100%" }} /></Form.Item>
    <div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" htmlType="submit" loading={saving}>保存</Button></div>
  </Form>;
}

export function OpsQuality() {
  const { openSheet, toast, confirmDlg } = useNav(); const { useMock } = useAdminSession(); const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminQuality[]>(useMock ? null : apiGetQualities, [useMock]);
  const qualities = useMock ? getQualities() : data ?? [];
  const afterSaved = () => useMock ? refresh() : void reload();
  const openForm = (item?: AdminQuality) => openSheet(item ? "编辑分辨率档位" : "新增分辨率档位", <QualityForm item={item} useMock={useMock} onSaved={afterSaved} />);
  const remove = (item: AdminQuality) => confirmDlg("删除分辨率档位", `确认删除「${item.label}」吗？`, () => void (async () => { try { if (useMock) { const index = qualities.findIndex((quality) => quality.id === item.id); if (index >= 0) qualities.splice(index, 1); refresh(); } else { await apiDeleteQuality(item.id); await reload(); } toast("分辨率档位已删除"); } catch (cause) { toast(cause instanceof Error ? cause.message : "删除失败，请稍后重试"); } })(), true);
  const move = async (index: number, direction: number) => { moveItem(qualities, index, direction); if (useMock) refresh(); else { try { await Promise.all(qualities.map((quality, sort) => apiSaveQuality(quality.id, { ...quality, sort: sort + 1 }))); await reload(); } catch (cause) { toast(cause instanceof Error ? cause.message : "排序保存失败，请稍后重试"); await reload(); } } };
  const toggleEnabled = async (item: AdminQuality, enabled: boolean) => { try { if (useMock) { item.on = enabled; refresh(); } else { await apiSetQualityEnabled(item.id, enabled); await reload(); } } catch (cause) { toast(cause instanceof Error ? cause.message : "更新状态失败，请稍后重试"); } };
  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="分辨率档位" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新增档位</Button>}><Table<AdminQuality> rowKey="id" loading={loading} dataSource={qualities} pagination={false} locale={{ emptyText: error || "暂无分辨率档位" }} columns={[
    { title: "档位", dataIndex: "label", render: (value) => <Space><span className="lumi-table-icon"><SafetyCertificateOutlined /></span><Typography.Text strong>{value}</Typography.Text></Space> },
    { title: "像素规格", dataIndex: "pixel", width: 240 },
    { title: "积分倍率", dataIndex: "mult", width: 160, render: (value) => `× ${value}` },
    { title: "启用", dataIndex: "on", width: 110, render: (enabled, item) => <Switch size="small" checked={enabled} onChange={(checked) => void toggleEnabled(item, checked)} /> },
    { title: "排序", width: 170, render: (_, __, index) => <Space><Typography.Text type="secondary">{index + 1}</Typography.Text><SortCtrl index={index} len={qualities.length} onMove={(direction) => void move(index, direction)} /></Space> },
    { title: "操作", width: 160, render: (_, item) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(item)}>编辑</Button><Button type="link" danger onClick={() => remove(item)}>删除</Button></Space> }
  ]} /></Card></div>;
}
