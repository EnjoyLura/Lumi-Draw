import { useState } from "react";
import { IMG, REPORTS, WORKS, modelName, userName, type AdminReport, type AdminWork } from "../data/mock";
import { getReports, getWorks } from "../data/service";
import { useNav } from "../shell/NavContext";
import { Badge, StatCard, StatusBadge } from "../ui";

const FOOT_STYLE: React.CSSProperties = {
  display: "flex",
  gap: 10,
  margin: "12px -18px 0",
  padding: "12px 18px 0",
  borderTop: "1px solid var(--border)"
};

export function RejectForm({ work, onAfter }: { work: AdminWork; onAfter?: () => void }) {
  const { closeSheet, toast } = useNav();
  const doReject = () => {
    work.status = "已下架";
    closeSheet();
    onAfter?.();
    toast("已拒绝并下架");
  };
  return (
    <>
      <label className="field-label">选择拒绝原因</label>
      <select className="input">
        <option>色情低俗</option>
        <option>违法违规</option>
        <option>侵权盗版</option>
        <option>低质量内容</option>
        <option>其他</option>
      </select>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-danger btn-block" onClick={doReject}>确认拒绝</button>
      </div>
    </>
  );
}

function HandleReportForm({ report }: { report: AdminReport }) {
  const { closeSheet, toast } = useNav();
  const doReport = (action: string) => {
    report.status = "已处理";
    if (action === "下架作品") {
      const w = WORKS.find((x) => x.id === report.workId);
      if (w) w.status = "已下架";
    }
    closeSheet();
    toast(action + "，已处理");
  };
  return (
    <>
      <label className="field-label">处理方式</label>
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv" style={{ cursor: "pointer" }} onClick={() => doReport("下架作品")}>
          <span className="k" style={{ color: "var(--danger)" }}>下架被举报作品</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
        <div className="kv" style={{ cursor: "pointer" }} onClick={() => doReport("警告作者")}>
          <span className="k" style={{ color: "var(--warning)" }}>警告作者</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
        <div className="kv" style={{ cursor: "pointer" }} onClick={() => doReport("驳回举报")}>
          <span className="k">驳回举报（内容合规）</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
      </div>
    </>
  );
}

export function Review({ param }: { param?: string }) {
  const { go, openSheet, toast } = useNav();
  const [tab, setTab] = useState(param === "report" ? "report" : "work");
  const works = getWorks();
  const reports = getReports();
  const pend = works.filter((w) => w.status === "待审核");
  const pendReports = reports.filter((r) => r.status === "待处理");

  const approve = (w: AdminWork) => { w.status = "已发布"; toast("已通过审核"); };
  const reject = (w: AdminWork) => openSheet("拒绝原因", <RejectForm work={w} />);

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <StatCard label="待审核" val={pend.length} icon="ri-time-line" color="#F59E0B" soft="var(--warning-soft)" />
        <StatCard label="今日已审" val="328" icon="ri-checkbox-circle-line" color="#6FD4B0" soft="var(--success-soft)" />
        <StatCard label="通过率" val="94%" icon="ri-pie-chart-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="举报待处理" val={pendReports.length} icon="ri-flag-line" color="#EF4444" soft="var(--danger-soft)" />
      </div>

      <div className="seg">
        <span className={`seg-i${tab === "work" ? " active" : ""}`} onClick={() => setTab("work")}>作品审核</span>
        <span className={`seg-i${tab === "report" ? " active" : ""}`} onClick={() => setTab("report")}>举报管理</span>
      </div>

      {tab === "work" ? (
        <>
          {pend.length === 0 ? (
            <div className="empty"><i className="ri-checkbox-circle-line" /><div className="et">暂无待审核作品</div></div>
          ) : null}
          {pend.map((w) => (
            <div key={w.id} className="card" style={{ padding: 12, marginBottom: 10, display: "flex", gap: 12 }}>
              <img className="thumb" src={IMG("w" + w.id)} style={{ width: 74, height: 74, flexShrink: 0 }} alt="" onClick={() => go("reviewDetail", String(w.id))} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{w.prompt}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", margin: "6px 0 8px" }}>{userName(w.userId)} · {modelName(w.model)} · {w.time}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-danger btn-sm" onClick={() => reject(w)}>拒绝</button>
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => approve(w)}><i className="ri-check-line" />通过</button>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {pendReports.length === 0 ? (
            <div className="empty"><i className="ri-flag-line" /><div className="et">暂无待处理举报</div></div>
          ) : null}
          {REPORTS.map((r) => {
            const w = WORKS.find((x) => x.id === r.workId);
            return (
              <div key={r.id} className="card" style={{ padding: 12, marginBottom: 10, display: "flex", gap: 12 }}>
                <img className="thumb" src={IMG("w" + r.workId)} style={{ width: 60, height: 60, flexShrink: 0 }} alt="" onClick={() => go("reviewDetail", String(r.workId))} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{w ? w.title || "作品" + r.workId : "作品" + r.workId}</span>
                    <StatusBadge s={r.status} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)", margin: "5px 0" }}>举报原因：<Badge text={r.reason} type="danger" /></div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>举报人：{userName(r.reporter)} · {r.time}</div>
                  {r.status === "待处理" ? (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-soft btn-sm btn-block" onClick={() => openSheet("处理举报", <HandleReportForm report={r} />)}>处理举报</button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
