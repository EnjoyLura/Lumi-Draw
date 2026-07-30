import { EditOutlined, GiftOutlined, LockOutlined, UnlockOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Descriptions, Form, Input, InputNumber, Popconfirm, Select, Space, Spin, Statistic, Table, Tabs, Tag, Typography } from "antd";
import { useState } from "react";
import { apiAdjustUserCredits, apiBanUser, apiGetMemberPlans, apiGetTransactionsPage, apiGetUserDetail, apiGiftUserMember, apiUnbanUser, apiUpdateUser, type AdminUserDetailData } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { MEMBER_PLANS, USERS, type AdminTxn, type AdminUser } from "../data/mock";
import { getTransactions, getUser, getUserWorks } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatusBadge } from "../ui";

type UserFormValues = { name: string; bio?: string; gender: string };
type CreditFormValues = { direction: "add" | "sub"; amount: number; reason: string };

function mockUserDetail(id: number): AdminUserDetailData {
  const user = getUser(id);
  return { ...user, recentWorks: getUserWorks(user.id) };
}
function isRecharge(transaction: AdminTxn) { return ["充值", "会员", "退款"].includes(transaction.type); }
function isSpend(transaction: AdminTxn) { return transaction.type === "消费"; }

function EditUserForm({ user, useMock, onDone }: { user: AdminUser; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<UserFormValues>();
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (useMock) Object.assign(user, { name: values.name.trim(), bio: values.bio ?? "", gender: values.gender });
      else await apiUpdateUser(user.id, { name: values.name.trim(), bio: values.bio ?? "", gender: values.gender });
      closeSheet(); onDone(); toast("用户资料已保存");
    } catch (cause) { if (cause instanceof Error) toast(cause.message); }
    finally { setSaving(false); }
  };
  return <Form form={form} initialValues={{ name: user.name, bio: user.bio, gender: user.gender || "未知" }} layout="vertical"><Form.Item label="昵称" name="name" rules={[{ required: true, whitespace: true, message: "请输入昵称" }]}><Input maxLength={30} showCount /></Form.Item><Form.Item label="个人简介" name="bio"><Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} maxLength={160} showCount /></Form.Item><Form.Item label="性别" name="gender"><Select options={["男", "女", "未知"].map((value) => ({ value, label: value }))} /></Form.Item><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" loading={saving} onClick={() => void save()}>保存</Button></div></Form>;
}

function CreditForm({ user, useMock, onDone }: { user: AdminUser; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<CreditFormValues>();
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      const values = await form.validateFields();
      const amount = values.direction === "sub" ? -values.amount : values.amount;
      const requestId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
      setSaving(true);
      if (useMock) user.credits += amount;
      else await apiAdjustUserCredits(user.id, amount, values.reason.trim(), requestId);
      closeSheet(); onDone(); toast(amount > 0 ? `已赠送 ${amount} 积分` : `已扣除 ${Math.abs(amount)} 积分`);
    } catch (cause) { if (cause instanceof Error) toast(cause.message); }
    finally { setSaving(false); }
  };
  return <Form form={form} initialValues={{ direction: "add" }} layout="vertical"><Form.Item label="操作类型" name="direction"><Select options={[{ value: "add", label: "赠送积分" }, { value: "sub", label: "扣除积分" }]} /></Form.Item><Form.Item label="积分数量" name="amount" rules={[{ required: true, message: "请输入积分数量" }]}><InputNumber min={1} max={100000} precision={0} style={{ width: "100%" }} /></Form.Item><Form.Item label="调整原因" name="reason" rules={[{ required: true, min: 2, max: 100, message: "请填写 2–100 个字符的调整原因" }]}><Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} /></Form.Item><Typography.Text type="secondary">本次操作会立即写入用户积分流水，且不可撤销。</Typography.Text><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" loading={saving} onClick={() => void save()}>确认调整</Button></div></Form>;
}

function GiftMemberForm({ user, useMock, onDone }: { user: AdminUser; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const { data, loading } = useAsyncData(useMock ? null : apiGetMemberPlans, [useMock]);
  const plans = useMock ? MEMBER_PLANS : data ?? [];
  const [form] = Form.useForm<{ planId: number; reason?: string }>();
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      const values = await form.validateFields();
      const plan = plans.find((item) => item.id === values.planId);
      if (!plan) return;
      setSaving(true);
      if (useMock) { user.member = plan.name; user.credits += plan.gift; }
      else await apiGiftUserMember(user.id, plan.id, values.reason?.trim() || "后台赠送会员");
      closeSheet(); onDone(); toast("会员已赠送");
    } catch (cause) { if (cause instanceof Error) toast(cause.message); }
    finally { setSaving(false); }
  };
  return <Form form={form} layout="vertical" initialValues={{ planId: plans[0]?.id }}><Form.Item label="会员方案" name="planId" rules={[{ required: true, message: "请选择会员方案" }]}><Select loading={loading} options={plans.map((plan) => ({ value: plan.id, label: `${plan.name}（¥${plan.price}）` }))} /></Form.Item><Form.Item label="赠送原因" name="reason"><Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} placeholder="例如：活动补偿" /></Form.Item><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" loading={saving} disabled={!plans.length} onClick={() => void save()}>确认赠送</Button></div></Form>;
}

function BanUserForm({ user, useMock, onDone }: { user: AdminUser; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [saving, setSaving] = useState(false);
  const save = async () => { try { setSaving(true); if (useMock) { user.status = "封禁"; user.active = false; } else await apiBanUser(user.id); closeSheet(); onDone(); toast("用户已封禁"); } catch (cause) { toast(cause instanceof Error ? cause.message : "封禁失败，请稍后重试"); } finally { setSaving(false); } };
  return <Space direction="vertical" size={16} style={{ width: "100%" }}><Alert type="warning" showIcon message="封禁后用户将无法正常使用小程序" /><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button danger loading={saving} onClick={() => void save()}>确认封禁</Button></div></Space>;
}

export function UserDetail({ param }: { param?: string }) {
  const { openSheet, toast, go } = useNav();
  const { useMock } = useAdminSession();
  const [tab, setTab] = useState("info");
  const [transactionPage, setTransactionPage] = useState(1);
  const userId = Number(param ?? 0);
  const userState = useAsyncData(useMock ? null : () => apiGetUserDetail(userId), [useMock, userId]);
  const transactionState = useAsyncData(useMock ? null : () => apiGetTransactionsPage({ userId, page: transactionPage, pageSize: 20 }), [useMock, userId, transactionPage]);
  const user = useMock ? mockUserDetail(userId) : userState.data;
  const transactions = useMock ? getTransactions().filter((item) => item.userId === userId) : transactionState.data?.items ?? [];
  const works = useMock ? getUserWorks(user?.id ?? 0) : user?.recentWorks ?? [];
  const afterChanged = () => { if (!useMock) { void userState.reload(); void transactionState.reload(); } };
  if (userState.loading) return <div className="lumi-page-loading"><Spin size="large" tip="正在加载用户详情" /></div>;
  if (userState.error) return <Alert showIcon type="error" message="用户详情加载失败" description={userState.error} />;
  if (!user) return <Alert showIcon type="warning" message="用户不存在或已被删除" />;
  const banned = user.status === "封禁";
  const filteredTransactions = tab === "recharge" ? transactions.filter(isRecharge) : tab === "spend" ? transactions.filter(isSpend) : transactions;
  const unban = async () => { try { if (useMock) { const target = USERS.find((item) => item.id === user.id); if (target) { target.status = "正常"; target.active = true; } } else await apiUnbanUser(user.id); afterChanged(); toast("用户已解封"); } catch (cause) { toast(cause instanceof Error ? cause.message : "解封失败，请稍后重试"); } };
  return <div className="lumi-admin-page lumi-user-detail-page">
    <Card className="lumi-detail-hero" bordered={false}><Space align="center" size={16} wrap><Avatar size={72} style={{ background: user.color }}>{user.avatar || user.name.slice(0, 1)}</Avatar><div className="lumi-detail-hero__copy"><Space wrap><Typography.Title level={3}>{user.name}</Typography.Title><StatusBadge s={user.status} />{user.member !== "无" ? <Tag color="gold">{user.member}</Tag> : null}</Space><Typography.Paragraph type="secondary">ID {user.id} · {user.phone || "未绑定手机号"} · 注册于 {user.reg}</Typography.Paragraph><Typography.Text>{user.bio || "暂无个人简介"}</Typography.Text></div></Space></Card>
    <div className="lumi-detail-stat-grid"><Card><Statistic title="积分余额" value={user.credits} prefix={<WalletOutlined />} /></Card><Card><Statistic title="作品数量" value={user.works} /></Card><Card><Statistic title="粉丝数量" value={user.followers} /></Card><Card><Statistic title="获赞数量" value={user.likes} /></Card></div>
    <Tabs activeKey={tab} onChange={(value) => { setTab(value); setTransactionPage(1); }} items={[
      { key: "info", label: "资料", children: <Card className="lumi-detail-card"><Descriptions column={{ xs: 1, md: 2 }} size="small"><Descriptions.Item label="性别">{user.gender || "未知"}</Descriptions.Item><Descriptions.Item label="关注数">{user.following}</Descriptions.Item><Descriptions.Item label="会员状态">{user.member === "无" ? "未开通" : user.member}</Descriptions.Item><Descriptions.Item label="账号状态">{user.status}</Descriptions.Item><Descriptions.Item label="个人简介" span={2}>{user.bio || "暂无"}</Descriptions.Item></Descriptions></Card> },
      { key: "credit", label: "积分流水", children: <TransactionTable rows={filteredTransactions} loading={transactionState.loading} total={useMock ? filteredTransactions.length : transactionState.data?.total ?? 0} page={transactionPage} onPage={setTransactionPage} /> },
      { key: "recharge", label: "充值与会员", children: <TransactionTable rows={filteredTransactions} loading={transactionState.loading} total={useMock ? filteredTransactions.length : transactionState.data?.total ?? 0} page={transactionPage} onPage={setTransactionPage} /> },
      { key: "spend", label: "消费", children: <TransactionTable rows={filteredTransactions} loading={transactionState.loading} total={useMock ? filteredTransactions.length : transactionState.data?.total ?? 0} page={transactionPage} onPage={setTransactionPage} /> },
      { key: "works", label: `作品（${works.length}）`, children: <Card className="lumi-table-card"><Table rowKey="id" dataSource={works} pagination={{ pageSize: 10 }} locale={{ emptyText: "暂无作品" }} columns={[{ title: "作品", dataIndex: "title", render: (value, work) => <Button type="link" onClick={() => go("workDetail", String(work.id))}>{value || "未命名作品"}</Button> }, { title: "状态", dataIndex: "status", render: (value) => <StatusBadge s={value} /> }, { title: "点赞", dataIndex: "likes" }, { title: "发布时间", dataIndex: "time" }]} /></Card> }
    ]} />
    <div className="lumi-detail-actions"><Button icon={<EditOutlined />} onClick={() => openSheet("编辑用户", <EditUserForm user={user} useMock={useMock} onDone={afterChanged} />)}>编辑资料</Button><Button icon={<WalletOutlined />} onClick={() => openSheet("调整积分", <CreditForm user={user} useMock={useMock} onDone={afterChanged} />)}>调整积分</Button><Button icon={<GiftOutlined />} onClick={() => openSheet("赠送会员", <GiftMemberForm user={user} useMock={useMock} onDone={afterChanged} />)}>赠送会员</Button>{banned ? <Button type="primary" icon={<UnlockOutlined />} onClick={() => void unban()}>解封用户</Button> : <Popconfirm title="确认封禁此用户？" okText="封禁" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => openSheet("封禁用户", <BanUserForm user={user} useMock={useMock} onDone={afterChanged} />)}><Button danger icon={<LockOutlined />}>封禁用户</Button></Popconfirm>}</div>
  </div>;
}

function TransactionTable({ rows, loading, total, page, onPage }: { rows: AdminTxn[]; loading: boolean; total: number; page: number; onPage: (page: number) => void }) {
  return <Card className="lumi-table-card"><Table<AdminTxn> rowKey="id" loading={loading} dataSource={rows} pagination={{ current: page, pageSize: 20, total, showSizeChanger: false, onChange: onPage }} locale={{ emptyText: "暂无记录" }} columns={[{ title: "类型", dataIndex: "type", width: 130, render: (value) => <Tag>{value}</Tag> }, { title: "变动", dataIndex: "amount", render: (value) => <Typography.Text strong type={String(value).startsWith("+") ? "success" : "danger"}>{value}</Typography.Text> }, { title: "余额", dataIndex: "credits" }, { title: "时间", dataIndex: "time", width: 180 }]} /></Card>;
}
