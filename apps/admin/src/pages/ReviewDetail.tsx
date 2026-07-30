import { CheckOutlined, CloseOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Space, Spin, Tag, Typography } from "antd";
import { AdminImage } from "../components/AdminImage";
import { apiApproveReview, apiGetWorkDetail, type AdminWorkDetailData } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, USERS, modelName, userName } from "../data/mock";
import { getWork } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatusBadge } from "../ui";
import { moderationStatusText, RejectForm } from "./Review";

function mockWorkDetail(id: number): AdminWorkDetailData {
  const work = getWork(id);
  const user = USERS.find((item) => item.id === work.userId) ?? USERS[0];
  return { ...work, author: { id: user.id, name: user.name, avatar: user.avatar, color: user.color } };
}

export function ReviewDetail({ param }: { param?: string }) {
  const { back, openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const workId = Number(param ?? 0);
  const { data, loading, error } = useAsyncData(useMock ? null : () => apiGetWorkDetail(workId), [useMock, workId]);
  const work = useMock ? mockWorkDetail(workId) : data;
  const approve = async () => {
    if (!work) return;
    try {
      if (useMock) work.status = "已发布";
      else await apiApproveReview(work.id);
      toast("作品已通过审核");
      back();
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "审核失败，请稍后重试");
    }
  };
  if (loading) return <div className="lumi-page-loading"><Spin size="large" tip="正在加载审核详情" /></div>;
  if (error) return <Alert showIcon type="error" message="审核详情加载失败" description={error} />;
  if (!work) return <Alert showIcon type="warning" message="作品不存在或已被删除" />;
  const imageReviewing = ["submitting", "pending"].includes(work.imageModerationStatus || "");
  return (
    <div className="lumi-admin-page lumi-review-detail-page">
      <Card className="lumi-detail-hero" bordered={false}>
        <Space align="start" size={16} wrap>
          <AdminImage eager className="lumi-detail-cover" src={work.imageUrl || IMG(`w${work.id}`)} alt={work.title} />
          <div className="lumi-detail-hero__copy">
            <Space align="center" wrap><Typography.Title level={3}>{work.title || "未命名作品"}</Typography.Title><StatusBadge s={work.status} /></Space>
            <Typography.Paragraph type="secondary">作者：{work.author?.name || userName(work.userId)} · 提交于 {work.time}</Typography.Paragraph>
            <Space wrap>{(work.tags?.length ? work.tags : [work.style]).filter(Boolean).map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space>
          </div>
        </Space>
      </Card>
      <Card title="作品信息" className="lumi-detail-card">
        <Descriptions column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="模型">{modelName(work.model)}</Descriptions.Item>
          <Descriptions.Item label="分辨率">{work.quality}</Descriptions.Item>
          <Descriptions.Item label="尺寸比例">{work.ratio}</Descriptions.Item>
          <Descriptions.Item label="风格">{work.style || "—"}</Descriptions.Item>
          <Descriptions.Item label="作品描述" span={2}>{work.desc || "暂无作品描述"}</Descriptions.Item>
          <Descriptions.Item label="提示词" span={2}><Typography.Paragraph copyable={{ text: work.prompt }} style={{ margin: 0, whiteSpace: "pre-wrap" }}>{work.prompt || "暂无提示词"}</Typography.Paragraph></Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title={<Space><SafetyCertificateOutlined />内容安全审核</Space>} className="lumi-detail-card">
        <Descriptions column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="文本审核"><Tag>{moderationStatusText(work.textModerationStatus)}</Tag></Descriptions.Item>
          <Descriptions.Item label="图片审核"><Tag color={work.imageModerationStatus === "pass" ? "success" : work.imageModerationStatus === "risky" ? "error" : work.imageModerationStatus === "pending" ? "processing" : "default"}>{moderationStatusText(work.imageModerationStatus)}</Tag></Descriptions.Item>
          {work.moderationReason ? <Descriptions.Item label="审核说明" span={2}><Typography.Text type="danger">{work.moderationReason}</Typography.Text></Descriptions.Item> : null}
        </Descriptions>
      </Card>
      {work.status === "待审核" ? <div className="lumi-detail-actions"><Button danger icon={<CloseOutlined />} onClick={() => openSheet("拒绝作品", <RejectForm work={work} useMock={useMock} onAfter={back} />)}>拒绝</Button><Button type="primary" icon={<CheckOutlined />} disabled={imageReviewing} onClick={() => void approve()}>{imageReviewing ? "图片审核中" : "通过审核"}</Button></div> : null}
    </div>
  );
}
