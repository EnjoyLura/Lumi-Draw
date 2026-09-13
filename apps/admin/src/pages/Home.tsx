import { useNav } from "../shell/NavContext";
import { MODULE_COLOR } from "../shell/menu";
import { getDashboardTodos, getTodayMetrics } from "../data/service";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { apiGetDashboard } from "../data/api";

const NAV_ENTRIES: Array<[keyof typeof MODULE_COLOR, string, string]> = [
  ["users", "用户管理", "ri-user-3-line"],
  ["works", "作品管理", "ri-image-2-line"],
  ["review", "内容审核", "ri-shield-check-line"],
  ["dashboard", "数据大屏", "ri-line-chart-line"],
  ["ops", "运营配置", "ri-magic-line"],
  ["finance", "财务管理", "ri-wallet-3-line"],
  ["messages", "消息管理", "ri-notification-3-line"],
  ["settings", "系统设置", "ri-settings-3-line"]
];

export function Home() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const { data } = useAsyncData(useMock ? null : apiGetDashboard, [useMock]);
  const metrics = useMock ? getTodayMetrics() : data?.metrics ?? [];
  const todos = useMock ? getDashboardTodos() : data?.todos ?? { review: 0, report: 0, feedback: 0 };
  const todayNewUsers = metrics.find((item) => item.key === "newUsers")?.val ?? "0";

  return (
    <>
      <div className="card" style={{ padding: 16, background: "linear-gradient(135deg,#5B9FE8,#3B7FC8)", border: "none", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: 0.9 }}>下午好，超级管理员 👋</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>露米绘画运营数据正常，今日新增 {todayNewUsers} 位用户</div>
      </div>

      <div className="sec-title">
        <span>今日核心指标</span>
        <span className="more" onClick={() => go("dashboard", undefined, true)}>数据大屏<i className="ri-arrow-right-s-line" /></span>
      </div>
      <div className="stat-grid">
        {metrics.map((m) => (
          <div key={m.key} className="stat-card" style={{ cursor: "pointer" }} onClick={() => go("dataDetail", m.key)}>
            <div className="sc-top">
              <div className="sc-ico" style={{ background: m.soft, color: m.color }}><i className={m.icon} /></div>
              <div className="sc-label">{m.label}</div>
              <i className="ri-arrow-right-s-line" style={{ marginLeft: "auto", color: "var(--fg-muted)", fontSize: 16 }} />
            </div>
            <div className="sc-val">{m.val}</div>
            <div className={`sc-delta ${m.delta >= 0 ? "up" : "down"}`}>
              <i className={`ri-arrow-${m.delta >= 0 ? "up" : "down"}-line`} />{Math.abs(m.delta)}%
            </div>
          </div>
        ))}
      </div>

      <div className="sec-title"><span>待办事项</span></div>
      <div className="card">
        <div className="lrow" onClick={() => go("review")}>
          <div className="lr-ico" style={{ background: "var(--warning-soft)", color: "#F59E0B" }}><i className="ri-shield-check-line" /></div>
          <div className="lr-main">
            <div className="lr-t">待审核作品</div>
            <div className="lr-s">有作品等待审核处理</div>
          </div>
          <span className="badge b-warning">{todos.review} 待处理</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
        <div className="lrow" onClick={() => go("review", "report")}>
          <div className="lr-ico" style={{ background: "var(--danger-soft)", color: "#EF4444" }}><i className="ri-flag-line" /></div>
          <div className="lr-main">
            <div className="lr-t">举报待处理</div>
            <div className="lr-s">用户举报需要审查</div>
          </div>
          <span className="badge b-danger">{todos.report} 待处理</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
        <div className="lrow" onClick={() => go("msgFeedback")}>
          <div className="lr-ico" style={{ background: "var(--info-soft)", color: "#5B9FE8" }}><i className="ri-feedback-line" /></div>
          <div className="lr-main">
            <div className="lr-t">用户反馈</div>
            <div className="lr-s">待处理的用户反馈</div>
          </div>
          <span className="badge b-info">{todos.feedback} 待处理</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
      </div>

      <div className="sec-title"><span>功能入口</span></div>
      <div className="card" style={{ padding: 6 }}>
        <div className="grid-nav">
          {NAV_ENTRIES.map(([key, label, icon]) => (
            <div key={key} className="gn" onClick={() => go(key, undefined, true)}>
              <div className="gn-ico" style={{ background: MODULE_COLOR[key].c }}><i className={icon} /></div>
              <div className="gn-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
