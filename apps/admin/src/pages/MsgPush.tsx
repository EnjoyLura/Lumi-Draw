import { DeleteOutlined, EyeOutlined, NotificationOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Avatar, Badge, Button, Card, Checkbox, Descriptions, Form, Input, Popconfirm, Select, Space, Spin, Table, Tag, Typography } from "antd";
import { useDeferredValue, useMemo, useState } from "react";
import { apiCreateAndSendPush, apiGetPushes, apiGetUsersPage, apiRevokePush } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { nextId, PUSH_TARGETS, PUSHES, USERS, type AdminPush, type AdminUser } from "../data/mock";
import { getPushes } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { useRefresh } from "./opsShared";

type PushValues = { title: string; content: string; target: string };

function PushDetail({ row, useMock, onChanged }: { row: AdminPush; useMock: boolean; onChanged: () => void }) {
  const { closeSheet, toast } = useNav();
  const [revoking, setRevoking] = useState(false);
  const revoke = async () => {
    try {
      setRevoking(true);
      if (useMock) row.status = "已撤回";
      else await apiRevokePush(row.id);
      closeSheet();
      onChanged();
      toast("通知已撤回");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "撤回失败，请稍后重试");
    } finally {
      setRevoking(false);
    }
  };
  return <Space direction="vertical" size={16} style={{ width: "100%" }}><Descriptions column={1} bordered size="small"><Descriptions.Item label="标题">{row.title}</Descriptions.Item><Descriptions.Item label="通知内容"><Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>{row.content}</Typography.Paragraph></Descriptions.Item><Descriptions.Item label="目标人群">{row.target}</Descriptions.Item><Descriptions.Item label="发送时间">{row.time}</Descriptions.Item><Descriptions.Item label="状态"><Tag color={row.status === "已发送" ? "success" : row.status === "已撤回" ? "default" : "warning"}>{row.status}</Tag></Descriptions.Item></Descriptions><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>关闭</Button>{row.status === "已发送" ? <Popconfirm title="撤回后用户将不再看到此通知，确认继续？" okText="撤回" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void revoke()}><Button danger loading={revoking}>撤回通知</Button></Popconfirm> : null}</div></Space>;
}

export function MsgPush() {
  const { openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const [form] = Form.useForm<PushValues>();
  const [target, setTarget] = useState(PUSH_TARGETS[0]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const deferredUserQuery = useDeferredValue(userQuery.trim());
  const specified = target === "指定用户";
  const pushesState = useAsyncData<AdminPush[]>(useMock ? null : apiGetPushes, [useMock]);
  const usersQuery = useQuery({
    queryKey: ["admin", "push-target-users", deferredUserQuery],
    queryFn: () => apiGetUsersPage({ status: "normal", keyword: deferredUserQuery, page: 1, pageSize: 50 }),
    enabled: specified && !useMock,
    staleTime: 30_000
  });
  const targetUsers = useMemo<AdminUser[]>(() => {
    if (!specified) return [];
    if (useMock) {
      const keyword = deferredUserQuery.toLowerCase();
      return USERS.filter((user) => !keyword || user.name.toLowerCase().includes(keyword) || String(user.id).includes(keyword));
    }
    return usersQuery.data?.items ?? [];
  }, [deferredUserQuery, specified, useMock, usersQuery.data?.items]);
  const pushes = useMock ? getPushes() : pushesState.data ?? [];
  const afterChanged = () => useMock ? refresh() : void pushesState.reload();
  const toggleUser = (id: number) => setSelectedUserIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const send = async (values: PushValues) => {
    if (specified && !selectedUserIds.size) {
      toast("请至少选择一位指定用户");
      return;
    }
    try {
      setSending(true);
      if (useMock) {
        const targetLabel = specified ? `指定用户 · ${selectedUserIds.size} 人` : values.target;
        PUSHES.unshift({ id: nextId(PUSHES), title: values.title.trim(), content: values.content.trim(), target: targetLabel, time: "刚刚", status: "已发送" });
      } else {
        await apiCreateAndSendPush({ title: values.title.trim(), content: values.content.trim(), target: values.target, targetUserIds: [...selectedUserIds] });
      }
      form.resetFields(["title", "content"]);
      setSelectedUserIds(new Set());
      afterChanged();
      toast("系统通知已发送");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "发送失败，请稍后重试");
    } finally {
      setSending(false);
    }
  };
  return <div className="lumi-admin-page">
    {pushesState.error ? <Alert showIcon type="error" message="系统通知加载失败" description={pushesState.error} /> : null}
    <Card className="lumi-form-card" title={<Space><NotificationOutlined />发送系统通知</Space>}>
      <Form form={form} layout="vertical" initialValues={{ target }} onFinish={(values) => void send(values)}>
        <Form.Item label="通知标题" name="title" rules={[{ required: true, whitespace: true, message: "请输入通知标题" }]}><Input maxLength={60} showCount placeholder="例如：新功能上线通知" /></Form.Item>
        <Form.Item label="通知内容" name="content" rules={[{ required: true, whitespace: true, message: "请输入通知内容" }]}><Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} maxLength={500} showCount placeholder="请输入要发送给用户的通知内容" /></Form.Item>
        <Form.Item label="目标人群" name="target"><Select options={PUSH_TARGETS.map((value) => ({ value, label: value }))} onChange={(value) => { setTarget(value); if (value !== "指定用户") setSelectedUserIds(new Set()); }} /></Form.Item>
        {specified ? <Card size="small" title={<Space><UserOutlined />选择用户<Badge count={selectedUserIds.size} showZero color="#5B9FE8" /></Space>} className="lumi-select-users-card">
          <Input.Search allowClear value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="搜索昵称或用户 ID" />
          <div className="lumi-user-picker-list">
            {usersQuery.isFetching && !useMock ? <div className="lumi-inline-loading"><Spin size="small" />正在搜索用户</div> : null}
            {targetUsers.map((user) => <Checkbox key={user.id} checked={selectedUserIds.has(user.id)} onChange={() => toggleUser(user.id)} className="lumi-user-picker-row"><Space><Avatar style={{ background: user.color }}>{user.avatar || user.name.slice(0, 1)}</Avatar><span>{user.name}</span><Typography.Text type="secondary">ID {user.id}</Typography.Text></Space></Checkbox>)}
            {!usersQuery.isFetching && !targetUsers.length ? <Typography.Text type="secondary">没有匹配用户</Typography.Text> : null}
          </div>
        </Card> : null}
        <div className="lumi-form-actions"><Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={sending}>发送通知</Button></div>
      </Form>
    </Card>
    <Card className="lumi-table-card" title="发送记录">
      <Table<AdminPush> rowKey="id" loading={pushesState.loading} dataSource={pushes} pagination={{ pageSize: 20, showSizeChanger: false }} columns={[
        { title: "标题", dataIndex: "title", width: 230, ellipsis: true },
        { title: "内容", dataIndex: "content", ellipsis: true },
        { title: "目标人群", dataIndex: "target", width: 160 },
        { title: "状态", dataIndex: "status", width: 110, render: (value) => <Tag color={value === "已发送" ? "success" : value === "已撤回" ? "default" : "warning"}>{value}</Tag> },
        { title: "时间", dataIndex: "time", width: 160 },
        { title: "操作", width: 110, render: (_, row) => <Button type="link" icon={<EyeOutlined />} onClick={() => openSheet("通知详情", <PushDetail row={row} useMock={useMock} onChanged={afterChanged} />)}>详情</Button> }
      ]} />
    </Card>
  </div>;
}
