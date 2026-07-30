import { BellOutlined, MessageOutlined, NotificationOutlined } from "@ant-design/icons";
import { Alert, Spin } from "antd";
import { AdminFeatureGrid, type AdminFeatureItem } from "../components/AdminFeatureGrid";
import { useAdminSession } from "../data/adminSession";
import { apiGetAnnouncements, apiGetFeedbacks, apiGetPushes } from "../data/api";
import { ANNOUNCEMENTS, FEEDBACKS, PUSHES } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatCard } from "../ui";

interface MessageSummary { announcements: number; pushes: number; pendingFeedback: number; }
async function loadMessageSummary(): Promise<MessageSummary> {
  const [announcements, pushes, feedbacks] = await Promise.all([apiGetAnnouncements(), apiGetPushes(), apiGetFeedbacks()]);
  return { announcements: announcements.length, pushes: pushes.length, pendingFeedback: feedbacks.filter((item) => item.status === "待处理").length };
}

export function Messages() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const summaryState = useAsyncData<MessageSummary>(useMock ? null : loadMessageSummary, [useMock]);
  const summary = useMock ? { announcements: ANNOUNCEMENTS.length, pushes: PUSHES.length, pendingFeedback: FEEDBACKS.filter((item) => item.status === "待处理").length } : summaryState.data ?? { announcements: 0, pushes: 0, pendingFeedback: 0 };
  const items: AdminFeatureItem[] = [
    { id: "msgAnnounce", title: "弹窗公告", description: "配置小程序内的运营公告与展示频次", icon: <NotificationOutlined />, color: "#5b9fe8", badge: `${summary.announcements} 条已创建` },
    { id: "msgPush", title: "系统通知", description: "向全体或指定用户发送站内通知", icon: <BellOutlined />, color: "#8b7fd6", badge: `${summary.pushes} 条历史通知` },
    { id: "msgFeedback", title: "用户反馈", description: "查看问题反馈、回复用户并跟进处理状态", icon: <MessageOutlined />, color: "#d88900", badge: `${summary.pendingFeedback} 条待处理` }
  ];
  return (
    <div className="lumi-admin-page">
      {summaryState.error && !useMock ? <Alert showIcon type="error" message="消息数据加载失败" description={summaryState.error} /> : null}
      <Spin spinning={summaryState.loading && !useMock}>
        <div className="lumi-metrics stat-grid">
          <StatCard label="弹窗公告" val={summary.announcements} icon="ri-notification-3-line" color="#5b9fe8" soft="#eff6ff" />
          <StatCard label="系统通知" val={summary.pushes} icon="ri-send-plane-line" color="#8b7fd6" soft="#f5f0ff" />
          <StatCard label="待处理反馈" val={summary.pendingFeedback} icon="ri-feedback-line" color="#d88900" soft="#fff8e8" />
        </div>
      </Spin>
      <AdminFeatureGrid items={items} onSelect={(id) => go(id, undefined, true)} />
    </div>
  );
}
