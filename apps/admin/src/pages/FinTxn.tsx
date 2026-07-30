import { DollarOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Card, Segmented, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { apiGetPaymentOrders } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { userName, type AdminTxn } from "../data/mock";
import { getTransactions } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatusBadge } from "../ui";

function txnColor(type: string) { if (type === "充值" || type === "会员" || type === "签到") return "#22a06b"; if (type === "退款") return "#8b7fd6"; return "#d85c7f"; }
function TxnDetail({ t }: { t: AdminTxn }) { const { closeSheet, toast } = useNav(); const refundable = t.type === "充值" && t.status === "成功"; return <div><Card size="small" className="lumi-drawer-detail-card"><Typography.Paragraph>交易用户：<b>{t.userName || userName(t.userId)}</b></Typography.Paragraph><Typography.Paragraph>交易类型：<b>{t.type}</b></Typography.Paragraph><Typography.Paragraph>支付金额：<b>{t.amount}</b></Typography.Paragraph><Typography.Paragraph>到账积分：<b>{t.credits || "—"}</b></Typography.Paragraph><Typography.Paragraph>交易状态：<b>{t.status}</b></Typography.Paragraph><Typography.Paragraph>交易时间：<b>{t.time}</b></Typography.Paragraph><Typography.Paragraph>商户订单号：<b>{t.orderNo || t.id}</b></Typography.Paragraph>{t.transactionId ? <Typography.Paragraph>微信交易号：<b>{t.transactionId}</b></Typography.Paragraph> : null}</Card><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>关闭</Button>{refundable ? <Button danger onClick={() => { closeSheet(); toast("退款需要线上商户退款证书配置"); }}>发起退款</Button> : null}</div></div>; }

export function FinTxn() {
  const { openSheet } = useNav(); const { useMock } = useAdminSession(); const { data, loading, error } = useAsyncData<AdminTxn[]>(useMock ? null : apiGetPaymentOrders, [useMock]); const all = useMock ? getTransactions() : data ?? []; const [type, setType] = useState("全部"); const [status, setStatus] = useState("全部"); const list = all.filter((item) => (type === "全部" || item.type === type) && (status === "全部" || item.status === status));
  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="交易记录" extra={<Typography.Text type="secondary">共 {list.length} 条</Typography.Text>}><div className="lumi-table-toolbar"><Space wrap><Typography.Text type="secondary">类型</Typography.Text><Segmented options={["全部", "充值", "会员", "消费", "退款", "签到"]} value={type} onChange={(value) => setType(String(value))} /></Space><Space wrap><Typography.Text type="secondary">状态</Typography.Text><Segmented options={["全部", "成功", "待支付", "失败", "已退款"]} value={status} onChange={(value) => setStatus(String(value))} /></Space></div><Table<AdminTxn> rowKey="id" loading={loading} dataSource={list} pagination={{ pageSize: 20, showSizeChanger: false }} locale={{ emptyText: error || "暂无交易记录" }} columns={[
    { title: "用户", render: (_, txn) => <Space><span className="lumi-table-icon"><DollarOutlined /></span><Typography.Text strong>{txn.userName || userName(txn.userId)}</Typography.Text></Space> },
    { title: "类型", dataIndex: "type", width: 120, render: (value) => <Tag color={value === "退款" ? "purple" : value === "消费" ? "red" : "green"}>{value}</Tag> },
    { title: "金额", dataIndex: "amount", width: 140, render: (amount, txn) => <Typography.Text strong style={{ color: txnColor(txn.type) }}>{amount}</Typography.Text> },
    { title: "积分", dataIndex: "credits", width: 140, render: (credits) => credits || "—" },
    { title: "状态", dataIndex: "status", width: 120, render: (value) => <StatusBadge s={value} /> },
    { title: "时间", dataIndex: "time", width: 180 },
    { title: "操作", width: 110, render: (_, txn) => <Button type="link" icon={<EyeOutlined />} onClick={() => openSheet("交易详情", <TxnDetail t={txn} />)}>详情</Button> }
  ]} /></Card></div>;
}
