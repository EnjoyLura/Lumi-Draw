import { useState } from "react";
import { apiCreateAndSendPush, apiGetPushes, apiRevokePush } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { nextId, PUSH_TARGETS, PUSHES, type AdminPush } from "../data/mock";
import { getPushes } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Sec, StatusBadge } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function PushDetail({ p, useMock, onChanged }: { p: AdminPush; useMock: boolean; onChanged: () => void }) {
  const { closeSheet, toast, confirmDlg } = useNav();
  const recall = () => confirmDlg("撤回通知", "撤回后用户将不再看到该通知，确定撤回吗？", () => {
    void (async () => {
      try {
        if (useMock) p.status = "已撤回";
        else await apiRevokePush(p.id);
        closeSheet();
        onChanged();
        toast("已撤回");
      } catch (e) {
        toast(e instanceof Error ? e.message : "撤回失败");
      }
    })();
  }, true);
  return (
    <>
      <div className="card" style={{ padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{p.title}</div>
        <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>{p.content}</div>
      </div>
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k">目标人群</span><span className="v">{p.target}</span></div>
        <div className="kv"><span className="k">发送时间</span><span className="v">{p.time}</span></div>
        <div className="kv"><span className="k">状态</span><span className="v">{p.status}</span></div>
      </div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>关闭</button>
        {p.status === "已发送" ? <button className="btn btn-danger btn-block" onClick={recall}>撤回通知</button> : null}
      </div>
    </>
  );
}

export function MsgPush() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminPush[]>(useMock ? null : () => apiGetPushes(), [useMock]);
  const pushes = useMock ? getPushes() : data ?? [];
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState(PUSH_TARGETS[0]);
  const [sending, setSending] = useState(false);
  const afterChanged = () => useMock ? refresh() : reload();

  const send = () => {
    if (!title.trim()) { toast("请输入通知标题"); return; }
    confirmDlg("发送通知", `确定向「${target}」推送该通知吗？`, () => {
      void (async () => {
        setSending(true);
        try {
          if (useMock) {
            PUSHES.unshift({ id: nextId(PUSHES), title: title.trim(), content, target, time: "刚刚", status: "已发送" });
          } else {
            await apiCreateAndSendPush({ title: title.trim(), content, target });
          }
          setTitle("");
          setContent("");
          afterChanged();
          toast("通知已发送");
        } catch (e) {
          toast(e instanceof Error ? e.message : "发送失败");
        } finally {
          setSending(false);
        }
      })();
    });
  };

  return (
    <>
      <div className="card" style={{ padding: 14 }}>
        <label className="field-label">通知标题</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：新功能上线" />
        <label className="field-label" style={{ marginTop: 12 }}>通知内容</label>
        <textarea className="input" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="请输入推送内容" />
        <label className="field-label" style={{ marginTop: 12 }}>目标人群</label>
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
          {PUSH_TARGETS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div style={{ margin: "12px 0" }}>
        <button className="btn btn-primary btn-block" onClick={send} disabled={sending}><i className="ri-send-plane-line" />{sending ? "发送中" : "立即发送"}</button>
      </div>
      <Sec title="历史推送" />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载推送记录中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card">
        {!pushes.length ? <div className="empty"><i className="ri-send-plane-line" /><div className="et">暂无推送记录</div></div> : null}
        {pushes.map((p) => (
          <div key={p.id} className="lrow" onClick={() => openSheet("推送详情", <PushDetail p={p} useMock={useMock} onChanged={afterChanged} />)}>
            <div className="lr-ico" style={p.status === "已撤回" ? { background: "var(--bg-soft)", color: "var(--fg-muted)" } : { background: "var(--success-soft)", color: "#22C55E" }}><i className="ri-notification-3-line" /></div>
            <div className="lr-main"><div className="lr-t">{p.title}</div><div className="lr-s">{p.target} · {p.time}</div></div>
            <StatusBadge s={p.status} />
            <i className="ri-arrow-right-s-line lr-arrow" />
          </div>
        ))}
      </div>
    </>
  );
}
