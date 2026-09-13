import { useAdminSession } from "../data/adminSession";
import { apiGetAnnouncements, apiGetFeedbacks, apiGetPushes } from "../data/api";
import { ANNOUNCEMENTS, FEEDBACKS, PUSHES } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

interface MessageSummary {
  announcements: number;
  pushes: number;
  pendingFeedback: number;
}

async function loadMessageSummary(): Promise<MessageSummary> {
  const [announcements, pushes, feedbacks] = await Promise.all([apiGetAnnouncements(), apiGetPushes(), apiGetFeedbacks()]);
  return {
    announcements: announcements.length,
    pushes: pushes.length,
    pendingFeedback: feedbacks.filter((item) => item.status === "待处理").length
  };
}

export function Messages() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const summaryState = useAsyncData<MessageSummary>(useMock ? null : loadMessageSummary, [useMock]);
  const summary = useMock
    ? {
        announcements: ANNOUNCEMENTS.length,
        pushes: PUSHES.length,
        pendingFeedback: FEEDBACKS.filter((f) => f.status === "待处理").length
      }
    : summaryState.data ?? { announcements: 0, pushes: 0, pendingFeedback: 0 };

  const items: Array<[string, string, string, string, string]> = [
    ["msgAnnounce", "弹窗公告", "ri-notification-3-line", "#5B9FE8", `${summary.announcements} 条公告`],
    ["msgPush", "系统通知", "ri-send-plane-line", "#6FD4B0", `${summary.pushes} 条通知`],
    ["msgFeedback", "用户反馈", "ri-feedback-line", "#F59E0B", `${summary.pendingFeedback} 条待处理`]
  ];

  return (
    <div className="card">
      {!useMock && summaryState.loading ? <div className="empty" style={{ minHeight: 72 }}>消息管理数据加载中...</div> : null}
      {!useMock && summaryState.error ? (
        <div className="empty" style={{ minHeight: 96 }}>
          <i className="ri-error-warning-line" />
          <div className="et">消息管理数据加载失败</div>
          <button className="btn btn-soft btn-sm" onClick={summaryState.reload}>重新加载</button>
        </div>
      ) : null}
      {items.map(([id, title, icon, color, sub]) => (
        <div key={id} className="lrow" onClick={() => go(id)}>
          <div className="lr-ico" style={{ background: `${color}22`, color }}><i className={icon} /></div>
          <div className="lr-main"><div className="lr-t">{title}</div><div className="lr-s">{sub}</div></div>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
      ))}
    </div>
  );
}
