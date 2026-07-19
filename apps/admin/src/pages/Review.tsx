import { useState } from "react";
import { AdminImage } from "../components/AdminImage";
import {
  apiApproveReview,
  apiGetReports,
  apiGetReviews,
  apiRejectReview,
  apiResolveReport,
  type AdminReportData,
  type AdminWorkDetailData
} from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, REPORTS, WORKS, modelName, userName, type AdminReport, type AdminWork } from "../data/mock";
import { getReports, getWorks } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Badge, StatCard, StatusBadge } from "../ui";

const FOOT_STYLE: React.CSSProperties = {
  display: "flex",
  gap: 10,
  margin: "12px -18px 0",
  padding: "12px 18px 0",
  borderTop: "1px solid var(--border)"
};

function hasReportData(report: AdminReport | AdminReportData): report is AdminReportData {
  return Object.prototype.hasOwnProperty.call(report, "workTitle");
}

export function RejectForm({ work, useMock = true, onAfter }: { work: AdminWork; useMock?: boolean; onAfter?: () => void }) {
  const { closeSheet, toast } = useNav();
  const [reason, setReason] = useState("色情低俗");
  const [saving, setSaving] = useState(false);
  const doReject = async () => {
    setSaving(true);
    try {
      if (useMock) {
        work.status = "已下架";
      } else {
        await apiRejectReview(work.id, reason);
      }
      closeSheet();
      onAfter?.();
      toast("已拒绝并下架");
    } catch (e) {
      toast(e instanceof Error ? e.message : "拒绝失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <label className="field-label">选择拒绝原因</label>
      <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option>色情低俗</option>
        <option>违法违规</option>
        <option>侵权盗版</option>
        <option>低质量内容</option>
        <option>其他</option>
      </select>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-danger btn-block" onClick={doReject} disabled={saving}>{saving ? "处理中" : "确认拒绝"}</button>
      </div>
    </>
  );
}

function HandleReportForm({ report, useMock, onDone }: { report: AdminReport | AdminReportData; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [saving, setSaving] = useState(false);
  const doReport = async (action: "offline" | "warn" | "ignore") => {
    setSaving(true);
    try {
      if (useMock) {
        if (action === "offline") {
          const w = WORKS.find((x) => x.id === report.workId);
          if (w) w.status = "已下架";
        }
        const index = REPORTS.findIndex((item) => item.id === report.id);
        if (index >= 0) REPORTS.splice(index, 1);
      } else {
        await apiResolveReport(report.id, action);
      }
      closeSheet();
      onDone();
      toast(action === "ignore" ? "已驳回举报" : "举报已处理");
    } catch (e) {
      toast(e instanceof Error ? e.message : "处理失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <label className="field-label">处理方式</label>
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv" style={{ cursor: saving ? "default" : "pointer" }} onClick={() => !saving && doReport("offline")}>
          <span className="k" style={{ color: "var(--danger)" }}>下架被举报作品</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
        <div className="kv" style={{ cursor: saving ? "default" : "pointer" }} onClick={() => !saving && doReport("warn")}>
          <span className="k" style={{ color: "var(--warning)" }}>警告作者</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
        <div className="kv" style={{ cursor: saving ? "default" : "pointer" }} onClick={() => !saving && doReport("ignore")}>
          <span className="k">驳回举报（内容合规）</span>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
      </div>
    </>
  );
}

export function Review({ param }: { param?: string }) {
  const { go, openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const [tab, setTab] = useState(param === "report" ? "report" : "work");
  const reviewsState = useAsyncData<AdminWorkDetailData[]>(useMock ? null : () => apiGetReviews(), [useMock]);
  const reportsState = useAsyncData<AdminReportData[]>(useMock ? null : () => apiGetReports(), [useMock]);
  const works = useMock ? getWorks() : reviewsState.data ?? [];
  const reports = useMock ? getReports() : reportsState.data ?? [];
  const pend = works.filter((w) => w.status === "待审核");
  const pendReports = reports.filter((r) => r.status === "待处理");

  const reload = () => {
    if (!useMock) {
      reviewsState.reload();
      reportsState.reload();
    }
  };

  const approve = async (w: AdminWork) => {
    try {
      if (useMock) {
        w.status = "已发布";
      } else {
        await apiApproveReview(w.id);
        reviewsState.reload();
      }
      toast("已通过审核");
    } catch (e) {
      toast(e instanceof Error ? e.message : "审核失败");
    }
  };
  const reject = (w: AdminWork) => openSheet("拒绝原因", <RejectForm work={w} useMock={useMock} onAfter={reload} />);
  const getWorkImage = (w: AdminWork | AdminWorkDetailData) => "imageUrl" in w && w.imageUrl ? w.imageUrl : IMG("w" + w.id);
  const getAuthorName = (w: AdminWork | AdminWorkDetailData) => "author" in w && w.author ? w.author.name : userName(w.userId);
  const loading = tab === "work" ? reviewsState.loading : reportsState.loading;
  const error = tab === "work" ? reviewsState.error : reportsState.error;

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
          {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载审核列表中</div></div> : null}
          {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
          {pend.length === 0 ? (
            <div className="empty"><i className="ri-checkbox-circle-line" /><div className="et">暂无待审核作品</div></div>
          ) : null}
          {pend.map((w) => (
            <div key={w.id} className="card" style={{ padding: 12, marginBottom: 10, display: "flex", gap: 12 }}>
              <AdminImage className="thumb" src={w.thumbnailUrl || getWorkImage(w)} style={{ width: 74, height: 74, flexShrink: 0 }} alt="" onClick={() => go("reviewDetail", String(w.id))} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{w.prompt}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", margin: "6px 0 8px" }}>{getAuthorName(w)} · {w.model ? modelName(w.model) : w.style} · {w.time}</div>
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
          {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载举报列表中</div></div> : null}
          {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
          {pendReports.length === 0 ? (
            <div className="empty"><i className="ri-flag-line" /><div className="et">暂无待处理举报</div></div>
          ) : null}
          {reports.map((r) => {
            const w = WORKS.find((x) => x.id === r.workId);
            const title = hasReportData(r) ? r.workTitle : w ? w.title || "作品" + r.workId : "作品" + r.workId;
            const reporter = hasReportData(r) ? r.reporterName : userName(r.reporter);
            return (
              <div key={r.id} className="card" style={{ padding: 12, marginBottom: 10, display: "flex", gap: 12 }}>
                <AdminImage className="thumb" src={IMG("w" + r.workId)} style={{ width: 60, height: 60, flexShrink: 0 }} alt="" onClick={() => go("reviewDetail", String(r.workId))} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
                    <StatusBadge s={r.status} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)", margin: "5px 0" }}>举报原因：<Badge text={r.reason} type="danger" /></div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>举报人：{reporter} · {r.time}</div>
                  {r.status === "待处理" ? (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-soft btn-sm btn-block" onClick={() => openSheet("处理举报", <HandleReportForm report={r} useMock={useMock} onDone={reload} />)}>处理举报</button>
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
