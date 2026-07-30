import { EditOutlined, FileTextOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { apiGetAgreements, apiSaveAgreement, type AdminAgreement } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

const AGREEMENTS = [
  { name: "用户协议", updatedAt: "2025-05-10" },
  { name: "隐私政策", updatedAt: "2025-05-10" },
  { name: "充值协议", updatedAt: "2025-03-01" },
  { name: "社区规范", updatedAt: "2025-04-15" }
];

function AgreementForm({ name, agreement, useMock, onSaved }: { name: string; agreement?: AdminAgreement; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav(); const [form] = Form.useForm<{ content: string }>(); const [saving, setSaving] = useState(false);
  const save = async ({ content }: { content: string }) => { setSaving(true); try { if (!useMock) await apiSaveAgreement(name, content); closeSheet(); onSaved(); toast("协议已保存并生效"); } catch (cause) { toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试"); } finally { setSaving(false); } };
  return <Form form={form} layout="vertical" initialValues={{ content: agreement?.content ?? `欢迎使用露米绘画AI。请在此维护《${name}》正文。` }} onFinish={save} requiredMark={false}><Form.Item label="协议正文" name="content" rules={[{ required: true, whitespace: true, message: "协议正文不能为空" }]}><Input.TextArea autoSize={{ minRows: 14, maxRows: 24 }} /></Form.Item><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" htmlType="submit" loading={saving}>保存并生效</Button></div></Form>;
}

export function SetAgreement() {
  const { openSheet } = useNav(); const { useMock } = useAdminSession(); const { data, loading, error, reload } = useAsyncData<AdminAgreement[]>(useMock ? null : apiGetAgreements, [useMock]);
  const getAgreement = (name: string) => (data ?? []).find((agreement) => agreement.name === name || agreement.title === name);
  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="协议与规范"><Table rowKey="name" loading={loading} dataSource={AGREEMENTS} pagination={false} locale={{ emptyText: error || "暂无协议" }} columns={[
    { title: "协议", dataIndex: "name", render: (name) => <Space><span className="lumi-table-icon"><FileTextOutlined /></span><Typography.Text strong>{name}</Typography.Text></Space> },
    { title: "状态", width: 140, render: (_, item) => <Tag color={getAgreement(item.name) ? "green" : "default"}>{getAgreement(item.name) ? "已配置" : "待配置"}</Tag> },
    { title: "最近更新", width: 180, render: (_, item) => getAgreement(item.name)?.updatedAt ? `最近更新 ${getAgreement(item.name)?.updatedAt}` : `最近更新 ${item.updatedAt}` },
    { title: "操作", width: 150, render: (_, item) => <Button type="link" icon={<EditOutlined />} onClick={() => openSheet(`编辑${item.name}`, <AgreementForm name={item.name} agreement={getAgreement(item.name)} useMock={useMock} onSaved={() => void reload()} />)}>编辑</Button> }
  ]} /></Card></div>;
}
