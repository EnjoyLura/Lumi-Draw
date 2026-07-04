import { ANNOUNCEMENTS, FEEDBACKS } from "../data/mock";
import { useNav } from "../shell/NavContext";

export function Messages() {
  const { go } = useNav();
  const pending = FEEDBACKS.filter((f) => f.status === "待处理").length;
  const items: Array<[string, string, string, string, string]> = [
    ["msgAnnounce", "弹窗公告", "ri-notification-3-line", "#5B9FE8", `${ANNOUNCEMENTS.length} 条公告`],
    ["msgPush", "系统通知", "ri-send-plane-line", "#6FD4B0", "向用户推送消息"],
    ["msgFeedback", "用户反馈", "ri-feedback-line", "#F59E0B", `${pending} 条待处理`]
  ];
  return (
    <div className="card">
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
