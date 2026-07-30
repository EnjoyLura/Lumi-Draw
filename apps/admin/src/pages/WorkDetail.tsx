import { DeleteOutlined, EditOutlined, EyeInvisibleOutlined, EyeOutlined, PushpinOutlined, StarOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Descriptions, Form, Input, InputNumber, Popconfirm, Select, Space, Spin, Switch, Tag, Typography } from "antd";
import { useState } from "react";
import { AdminImage } from "../components/AdminImage";
import { apiDeleteWork, apiFeatureWork, apiGetWorkDetail, apiOfflineWork, apiRecommendWork, apiRestoreWork, apiUpdateWork, type AdminWorkDetailData } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, USERS, WORKS, modelName, type AdminWork } from "../data/mock";
import { getWork } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatusBadge } from "../ui";

type WorkFormValues = { title: string; desc: string; tags: string; likes: number };

function mockWorkDetail(id: number): AdminWorkDetailData {
  const work = getWork(id);
  const user = USERS.find((item) => item.id === work.userId) ?? USERS[0];
  return { ...work, author: { id: user.id, name: user.name, avatar: user.avatar, color: user.color } };
}

function EditWorkForm({ work, useMock, onDone }: { work: AdminWork; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<WorkFormValues>();
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      const values = await form.validateFields();
      const tags = values.tags.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 5);
      setSaving(true);
      if (useMock) {
        const previousLikes = work.likes;
        work.title = values.title.trim();
        work.desc = values.desc.trim();
        work.tags = tags;
        work.style = tags[0] ?? work.style;
        work.likes = values.likes;
        const author = USERS.find((item) => item.id === work.userId);
        if (author) author.likes = Math.max(0, author.likes + values.likes - previousLikes);
      } else {
        await apiUpdateWork(work.id, { title: values.title.trim(), desc: values.desc.trim(), style: tags[0] ?? work.style, tags, likes: values.likes });
      }
      closeSheet();
      onDone();
      toast("作品信息已保存");
    } catch (cause) {
      if (cause instanceof Error) toast(cause.message);
    } finally {
      setSaving(false);
    }
  };
  return <Form form={form} layout="vertical" initialValues={{ title: work.title, desc: work.desc, tags: (work.tags?.length ? work.tags : [work.style]).filter(Boolean).join("，"), likes: work.likes }}><Form.Item label="作品标题" name="title" rules={[{ required: true, whitespace: true, message: "请输入作品标题" }]}><Input maxLength={60} showCount /></Form.Item><Form.Item label="作品描述" name="desc"><Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} maxLength={500} showCount /></Form.Item><Form.Item label="标签" name="tags"><Input placeholder="多个标签用逗号分隔，最多 5 个" /></Form.Item><Form.Item label="点赞数量" name="likes" rules={[{ required: true, message: "请输入点赞数量" }]}><InputNumber min={0} max={2_000_000_000} precision={0} style={{ width: "100%" }} /></Form.Item><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" loading={saving} onClick={() => void save()}>保存</Button></div></Form>;
}

function OfflineWorkForm({ work, useMock, onDone }: { work: AdminWork; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<{ reason: string; note?: string }>();
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const detail = values.note?.trim() ? `${values.reason}：${values.note.trim()}` : values.reason;
      if (useMock) { work.status = "已下架"; work.featured = false; work.recommend = false; }
      else await apiOfflineWork(work.id, detail);
      closeSheet();
      onDone();
      toast("作品已下架，作者会收到系统通知");
    } catch (cause) {
      if (cause instanceof Error) toast(cause.message);
    } finally {
      setSaving(false);
    }
  };
  return <Form form={form} layout="vertical" initialValues={{ reason: "违规内容" }}><Form.Item label="下架原因" name="reason" rules={[{ required: true }]}><Select options={["违规内容", "侵权投诉", "低质量内容", "其他"].map((value) => ({ value, label: value }))} /></Form.Item><Form.Item label="补充说明" name="note"><Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} placeholder="可选，会一并发送给作者" /></Form.Item><div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button danger loading={saving} onClick={() => void save()}>确认下架</Button></div></Form>;
}

export function WorkDetail({ param }: { param?: string }) {
  const { go, back, openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const workId = Number(param ?? 0);
  const { data, loading, error, reload } = useAsyncData(useMock ? null : () => apiGetWorkDetail(workId), [useMock, workId]);
  const work = useMock ? mockWorkDetail(workId) : data;
  const done = () => useMock ? undefined : void reload();
  if (loading) return <div className="lumi-page-loading"><Spin size="large" tip="正在加载作品详情" /></div>;
  if (error) return <Alert showIcon type="error" message="作品详情加载失败" description={error} />;
  if (!work) return <Alert showIcon type="warning" message="作品不存在或已被删除" />;
  const author = work.author ?? USERS.find((item) => item.id === work.userId);
  const tags = (work.tags?.length ? work.tags : [work.style]).filter(Boolean);
  const toggle = async (key: "featured" | "recommend", enabled: boolean) => {
    try {
      if (useMock) work[key] = enabled;
      else if (key === "featured") await apiFeatureWork(work.id, enabled);
      else await apiRecommendWork(work.id, enabled);
      done();
      toast(enabled ? "已启用" : "已关闭");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "操作失败，请稍后重试");
    }
  };
  const restore = async () => {
    try {
      if (useMock) work.status = "已发布";
      else await apiRestoreWork(work.id);
      done();
      toast("作品已恢复上架");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "恢复失败，请稍后重试");
    }
  };
  const remove = async () => {
    try {
      if (useMock) {
        const index = WORKS.findIndex((item) => item.id === work.id);
        if (index >= 0) WORKS.splice(index, 1);
      } else await apiDeleteWork(work.id);
      toast("作品已删除");
      back();
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "删除失败，请稍后重试");
    }
  };
  return <div className="lumi-admin-page lumi-work-detail-page">
    <Card className="lumi-detail-hero" bordered={false}>
      <Space align="start" size={16} wrap><AdminImage eager className="lumi-detail-cover" src={work.imageUrl || IMG(`w${work.id}`)} alt={work.title} /><div className="lumi-detail-hero__copy"><Space wrap><Typography.Title level={3}>{work.title || "未命名作品"}</Typography.Title><StatusBadge s={work.status} /></Space><Typography.Paragraph type="secondary">发布于 {work.time}</Typography.Paragraph><Space wrap>{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space></div></Space>
    </Card>
    {author ? <Card size="small" className="lumi-detail-card lumi-clickable-card" onClick={() => go("userDetail", String(author.id))}><Space><Avatar style={{ background: author.color }}>{author.avatar || author.name.slice(0, 1)}</Avatar><div><Typography.Text strong>{author.name}</Typography.Text><br /><Typography.Text type="secondary">作者 · ID {author.id}</Typography.Text></div><UserOutlined /></Space></Card> : null}
    <Card title="标题与描述" className="lumi-detail-card" extra={<Button type="link" icon={<EditOutlined />} onClick={() => openSheet("编辑作品信息", <EditWorkForm work={work} useMock={useMock} onDone={done} />)}>编辑</Button>}><Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>{work.desc || "暂无作品描述"}</Typography.Paragraph></Card>
    <Card title="提示词" className="lumi-detail-card"><Typography.Paragraph copyable={{ text: work.prompt }} style={{ whiteSpace: "pre-wrap", margin: 0 }}>{work.prompt || "暂无提示词"}</Typography.Paragraph></Card>
    <Card title="作品信息" className="lumi-detail-card"><Descriptions column={{ xs: 1, md: 2 }} size="small"><Descriptions.Item label="模型">{modelName(work.model)}</Descriptions.Item><Descriptions.Item label="分辨率">{work.quality}</Descriptions.Item><Descriptions.Item label="尺寸比例">{work.ratio}</Descriptions.Item><Descriptions.Item label="风格">{work.style || "—"}</Descriptions.Item><Descriptions.Item label="互动数据" span={2}>点赞 {work.likes} · 收藏 {work.favorites} · 同款 {work.remakes}</Descriptions.Item></Descriptions></Card>
    <Card title="运营设置" className="lumi-detail-card"><Descriptions column={1} size="small"><Descriptions.Item label="设为精选"><Switch checked={work.featured} onChange={(value) => void toggle("featured", value)} /></Descriptions.Item><Descriptions.Item label="首页推荐"><Switch checked={work.recommend} onChange={(value) => void toggle("recommend", value)} /></Descriptions.Item></Descriptions></Card>
    <div className="lumi-detail-actions">{work.status === "已下架" ? <Button type="primary" icon={<EyeOutlined />} onClick={() => void restore()}>恢复上架</Button> : <Button danger icon={<EyeInvisibleOutlined />} onClick={() => openSheet("下架作品", <OfflineWorkForm work={work} useMock={useMock} onDone={done} />)}>下架作品</Button>}<Popconfirm title="删除后不可恢复，确认继续？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void remove()}><Button icon={<DeleteOutlined />} danger>删除作品</Button></Popconfirm></div>
  </div>;
}
