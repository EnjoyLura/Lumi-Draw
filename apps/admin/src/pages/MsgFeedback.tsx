import { EyeOutlined, MessageOutlined, PictureOutlined, SendOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Descriptions, Form, Image, Input, Segmented, Select, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { apiGetFeedbacks, apiReplyFeedback, apiUpdateFeedbackStatus, type AdminFeedbackData } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { FB_STATUS, FB_TYPE_COLOR, FEEDBACKS, IMG, USERS, type AdminFeedback } from "../data/mock";
import { getFeedbacks } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { useRefresh } from "./opsShared";

type FeedbackRow = AdminFeedback | AdminFeedbackData;

function userFallback(id: number) {
  return USERS.find((item) => item.id === id) ?? USERS[0];
}
function feedbackImages(row: FeedbackRow) {
  return "imageUrls" in row && row.imageUrls.length
    ? row.imageUrls
    : Array.from({ length: row.imgs }).map((_, index) => IMG(`fb${row.id}_${index}`));
}
function statusColor(status: string) {
  return status === "已解决" ? "success" : status === "处理中" ? "processing" : status === "不采纳" ? "default" : "warning";
}
function displayUser(row: FeedbackRow) {
  const fallback = userFallback(row.userId);
  const live = row as AdminFeedbackData;
  return { name: live.userName || fallback.name, avatar: live.userAvatar || fallback.avatar || fallback.name.slice(0, 1), color: live.userAvatarColor || fallback.color };
}

function ReplyForm({ row, useMock, onSaved }: { row: FeedbackRow; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<{ reply: string }>();
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      const { reply } = await form.validateFields();
      setSaving(true);
      if (useMock) {
        row.reply = reply.trim();
        row.status = "已解决";
      } else await apiReplyFeedback(row.id, reply.trim());
      closeSheet();
      onSaved();
      toast("回复已发送");
    } catch (cause) {
      if (cause instanceof Error) toast(cause.message);
    } finally {
      setSaving(false);
    }
  };
  return <Form form={form} layout="vertical" initialValues={{ reply: row.reply ?? "" }}><Form.Item label="回复内容" name="reply" rules={[{ required: true, whitespace: true, message: "请输入回复内容" }]}><Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} placeholder="回复会作为服务消息发送给用户，并将反馈标记为已解决。" /></Form.Item><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" loading={saving} onClick={() => void save()}>发送回复</Button></div></Form>;
}

function StatusForm({ row, useMock, onSaved }: { row: FeedbackRow; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [status, setStatus] = useState(row.status);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      setSaving(true);
      if (useMock) row.status = status;
      else await apiUpdateFeedbackStatus(row.id, status);
      closeSheet();
      onSaved();
      toast("处理状态已更新");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "状态更新失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };
  return <Form layout="vertical"><Form.Item label="处理状态"><Select value={status} onChange={setStatus} options={FB_STATUS.map((value) => ({ value, label: value }))} /></Form.Item><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" loading={saving} onClick={() => void save()}>保存状态</Button></div></Form>;
}

function FeedbackDetail({ row, useMock, onSaved }: { row: FeedbackRow; useMock: boolean; onSaved: () => void }) {
  const { openSheet } = useNav();
  const user = displayUser(row);
  const images = feedbackImages(row);
  return <Space direction="vertical" size={16} style={{ width: "100%" }}>
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label="提交用户"><Space><Avatar style={{ background: user.color }}>{user.avatar}</Avatar>{user.name}</Space></Descriptions.Item>
      <Descriptions.Item label="反馈类型"><Tag color={FB_TYPE_COLOR[row.type] || "blue"}>{row.type}</Tag></Descriptions.Item>
      <Descriptions.Item label="处理状态"><Tag color={statusColor(row.status)}>{row.status}</Tag></Descriptions.Item>
      <Descriptions.Item label="提交时间">{row.time}</Descriptions.Item>
      <Descriptions.Item label="联系方式">{row.wechat || "未提供"}</Descriptions.Item>
      <Descriptions.Item label="反馈内容"><Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>{row.content}</Typography.Paragraph></Descriptions.Item>
      {row.reply ? <Descriptions.Item label="官方回复"><Typography.Text type="success">{row.reply}</Typography.Text></Descriptions.Item> : null}
    </Descriptions>
    {images.length ? <Image.PreviewGroup><Space wrap>{images.map((src) => <Image key={src} width={88} height={88} style={{ objectFit: "cover" }} src={src} />)}</Space></Image.PreviewGroup> : null}
    <div className="lumi-drawer-form-actions"><Button onClick={() => openSheet("修改处理状态", <StatusForm row={row} useMock={useMock} onSaved={onSaved} />)}>更新状态</Button><Button type="primary" icon={<SendOutlined />} onClick={() => openSheet("回复反馈", <ReplyForm row={row} useMock={useMock} onSaved={onSaved} />)}>回复用户</Button></div>
  </Space>;
}

export function MsgFeedback() {
  const { openSheet } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminFeedbackData[]>(useMock ? null : apiGetFeedbacks, [useMock]);
  const all = useMock ? getFeedbacks() : data ?? [];
  const [filter, setFilter] = useState("全部");
  const rows = all.filter((row) => filter === "全部" || row.status === filter);
  const afterSaved = () => useMock ? refresh() : void reload();
  return <div className="lumi-admin-page">
    {error ? <Alert showIcon type="error" message="用户反馈加载失败" description={error} /> : null}
    <Card className="lumi-table-card" title={<Space><MessageOutlined />用户反馈</Space>} extra={<Segmented options={["全部", ...FB_STATUS]} value={filter} onChange={(value) => setFilter(String(value))} />}>
      <Table<FeedbackRow>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }}
        columns={[
          { title: "用户", width: 190, render: (_, row) => { const user = displayUser(row); return <Space><Avatar style={{ background: user.color }}>{user.avatar}</Avatar><div><Typography.Text strong>{user.name}</Typography.Text><br /><Typography.Text type="secondary">ID {row.userId}</Typography.Text></div></Space>; } },
          { title: "类型", dataIndex: "type", width: 120, render: (value) => <Tag color={FB_TYPE_COLOR[value] || "blue"}>{value}</Tag> },
          { title: "反馈内容", dataIndex: "content", ellipsis: true },
          { title: "附件", width: 90, render: (_, row) => row.imgs ? <Tag icon={<PictureOutlined />}>{row.imgs}</Tag> : "—" },
          { title: "状态", dataIndex: "status", width: 120, render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
          { title: "提交时间", dataIndex: "time", width: 130 },
          { title: "操作", width: 190, render: (_, row) => <Space><Button type="link" icon={<EyeOutlined />} onClick={() => openSheet("反馈详情", <FeedbackDetail row={row} useMock={useMock} onSaved={afterSaved} />)}>详情</Button><Button type="link" icon={<SendOutlined />} onClick={() => openSheet("回复反馈", <ReplyForm row={row} useMock={useMock} onSaved={afterSaved} />)}>回复</Button></Space> }
        ]}
      />
    </Card>
  </div>;
}
