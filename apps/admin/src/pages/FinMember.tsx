import { EditOutlined, GiftOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Button, Card, Col, Form, Input, InputNumber, Row, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { apiDeleteMemberPlan, apiGetMemberPlans, apiSaveMemberPlan } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { MEMBER_PLANS, nextId, type MemberPlan } from "../data/mock";
import { getMemberPlans } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { useRefresh } from "./opsShared";

type PlanValues = Omit<MemberPlan, "id">;
function MemberForm({ item, useMock, onSaved }: { item?: MemberPlan; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav(); const [form] = Form.useForm<PlanValues>(); const [saving, setSaving] = useState(false);
  const save = async (values: PlanValues) => { setSaving(true); try { const payload: PlanValues = { name: values.name.trim(), price: Math.max(0, Number(values.price) || 0), rights: values.rights.trim(), gift: Math.max(0, Number(values.gift) || 0), ckBonus: Math.max(0, Number(values.ckBonus) || 0), milestoneBonus: Math.max(0, Number(values.milestoneBonus) || 0), publishBonus: Math.max(0, Number(values.publishBonus) || 0) }; if (useMock) { if (item) Object.assign(item, payload); else MEMBER_PLANS.push({ id: nextId(MEMBER_PLANS), ...payload }); } else await apiSaveMemberPlan(item?.id || 0, { id: item?.id || 0, ...payload }); closeSheet(); onSaved(); toast(item ? "会员方案已保存" : "会员方案已新增"); } catch (cause) { toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试"); } finally { setSaving(false); } };
  return <Form form={form} layout="vertical" initialValues={item} onFinish={save} requiredMark={false}>
    <Row gutter={12}><Col span={14}><Form.Item label="方案名称" name="name" rules={[{ required: true, whitespace: true, message: "请输入方案名称" }]}><Input placeholder="例如：月卡、年卡" /></Form.Item></Col><Col span={10}><Form.Item label="价格" name="price" rules={[{ required: true, message: "请输入价格" }]}><InputNumber min={0} precision={0} addonBefore="¥" style={{ width: "100%" }} /></Form.Item></Col></Row>
    <Form.Item label="权益说明" name="rights" rules={[{ required: true, whitespace: true, message: "请填写权益说明" }]}><Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} placeholder="例如：赠送积分、每日签到加成、发布奖励加成" /></Form.Item>
    <Row gutter={12}><Col span={12}><Form.Item label="开通赠送积分" name="gift" initialValue={0}><InputNumber min={0} precision={0} addonAfter="积分" style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item label="每日签到额外积分" name="ckBonus" initialValue={0}><InputNumber min={0} precision={0} addonAfter="积分" style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item label="签到里程碑额外积分" name="milestoneBonus" initialValue={0}><InputNumber min={0} precision={0} addonAfter="积分" style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item label="发布作品额外积分" name="publishBonus" initialValue={0}><InputNumber min={0} precision={0} addonAfter="积分" style={{ width: "100%" }} /></Form.Item></Col></Row>
    <div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" htmlType="submit" loading={saving}>保存</Button></div>
  </Form>;
}

export function FinMember() {
  const { openSheet, toast, confirmDlg } = useNav(); const { useMock } = useAdminSession(); const refresh = useRefresh(); const { data, loading, error, reload } = useAsyncData<MemberPlan[]>(useMock ? null : apiGetMemberPlans, [useMock]); const plans = useMock ? getMemberPlans() : data ?? [];
  const afterSaved = () => useMock ? refresh() : void reload(); const openForm = (item?: MemberPlan) => openSheet(item ? "编辑会员方案" : "新增会员方案", <MemberForm item={item} useMock={useMock} onSaved={afterSaved} />);
  const remove = (item: MemberPlan) => confirmDlg("删除会员方案", `确认删除「${item.name}」吗？`, () => void (async () => { try { if (useMock) { const index = plans.findIndex((plan) => plan.id === item.id); if (index >= 0) plans.splice(index, 1); refresh(); } else { await apiDeleteMemberPlan(item.id); await reload(); } toast("会员方案已删除"); } catch (cause) { toast(cause instanceof Error ? cause.message : "删除失败，请稍后重试"); } })(), true);
  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="露米会员方案" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新增方案</Button>}><Table<MemberPlan> rowKey="id" loading={loading} dataSource={plans} pagination={false} locale={{ emptyText: error || "暂无会员方案" }} columns={[
    { title: "会员方案", render: (_, item) => <Space align="start"><span className="lumi-table-icon"><SafetyCertificateOutlined /></span><div><Typography.Text strong>{item.name}</Typography.Text><Typography.Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ margin: "3px 0 0", maxWidth: 360 }}>{item.rights}</Typography.Paragraph></div></Space> },
    { title: "价格", dataIndex: "price", width: 100, render: (price) => <Typography.Text strong style={{ color: "#d85c7f" }}>¥{price}</Typography.Text> },
    { title: "积分权益", width: 300, render: (_, item) => <Space size={[4, 4]} wrap><Tag color="green"><GiftOutlined /> 送 {item.gift || 0}</Tag><Tag color="blue">签到 +{item.ckBonus || 0}</Tag><Tag color="purple">里程碑 +{item.milestoneBonus || 0}</Tag><Tag color="gold">发布 +{item.publishBonus || 0}</Tag></Space> },
    { title: "操作", width: 160, render: (_, item) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(item)}>编辑</Button><Button type="link" danger onClick={() => remove(item)}>删除</Button></Space> }
  ]} /></Card></div>;
}
