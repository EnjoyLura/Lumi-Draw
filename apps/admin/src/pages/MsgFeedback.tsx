import { useState } from "react";
import { FB_STATUS, FB_TYPE_COLOR, FEEDBACKS, IMG, USERS, type AdminFeedback } from "../data/mock";
import { getFeedbacks } from "../data/service";
import { useNav } from "../shell/NavContext";
import { Avatar, Badge, Chips, StatusBadge } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function user(id: number) {
  return USERS.find((x) => x.id === id) ?? USERS[0];
}

export function MsgFeedback() {
  const { openSheet, closeSheet, toast } = useNav();
  const refresh = useRefresh();
  const all = getFeedbacks();
  const [filter, setFilter] = useState("全部");

  const list = all.filter((f) => filter === "全部" || f.status === filter);

  const openStatus = (f: AdminFeedback) => openSheet("修改处理状态", (
    <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 8 }}>当前状态：{f.status}
      <div className="card" style={{ padding: "2px 14px", marginTop: 8, color: "var(--fg)" }}>
        {FB_STATUS.map((s) => (
          <div key={s} className="kv" style={{ cursor: "pointer" }} onClick={() => { f.status = s; closeSheet(); refresh(); toast(`状态已更新为「${s}」`); }}>
            <span className="k" style={{ color: "var(--fg)", fontWeight: s === f.status ? 700 : 400 }}>{s}</span>
            {s === f.status ? <i className="ri-check-line" style={{ color: "var(--accent)" }} /> : <i className="ri-arrow-right-s-line lr-arrow" />}
          </div>
        ))}
      </div>
    </div>
  ));

  const openReply = (f: AdminFeedback) => openSheet("回复反馈", <ReplyForm f={f} onSaved={refresh} />);

  const openDetail = (f: AdminFeedback) => {
    const u = user(f.userId);
    openSheet("反馈详情", (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar a={u.avatar} color={u.color} />
          <div className="lr-main"><div className="lr-t">{u.name}</div><div className="lr-s"><Badge text={f.type} type={FB_TYPE_COLOR[f.type] || "info"} /> · {f.time}</div></div>
          <StatusBadge s={f.status} />
        </div>
        <div className="card" style={{ padding: "12px 14px", fontSize: 14, color: "var(--fg)", lineHeight: 1.7 }}>{f.content}</div>
        {f.imgs ? (
          <>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", margin: "14px 2px 6px" }}>附件图片</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Array.from({ length: f.imgs }).map((_, k) => <img key={k} className="thumb" src={IMG("fb" + f.id + "_" + k)} style={{ width: 72, height: 72 }} alt="" />)}
            </div>
          </>
        ) : null}
        <div className="card" style={{ padding: "2px 14px", marginTop: 14 }}>
          <div className="kv"><span className="k">联系方式</span><span className="v">{f.wechat ? <><i className="ri-wechat-line" style={{ color: "#22C55E" }} /> {f.wechat}</> : "未提供"}</span></div>
          <div className="kv"><span className="k">当前状态</span><span className="v">{f.status}</span></div>
        </div>
        {f.reply ? (
          <div className="card" style={{ padding: "12px 14px", marginTop: 14, background: "var(--accent-soft)", borderColor: "transparent" }}>
            <div style={{ fontSize: 12, color: "var(--accent-deep)", fontWeight: 700, marginBottom: 4 }}>官方回复</div>
            <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>{f.reply}</div>
          </div>
        ) : null}
        <div style={FOOT_STYLE}>
          <button className="btn btn-ghost btn-block" onClick={() => openStatus(f)}><i className="ri-flag-line" />处理状态</button>
          <button className="btn btn-primary btn-block" onClick={() => openReply(f)}><i className="ri-reply-line" />回复</button>
        </div>
      </>
    ));
  };

  return (
    <>
      <Chips items={["全部", ...FB_STATUS]} active={filter} onPick={setFilter} />
      {!list.length ? <div className="empty"><i className="ri-feedback-line" /><div className="et">暂无反馈</div></div> : null}
      {list.map((f) => {
        const u = user(f.userId);
        return (
          <div key={f.id} className="card" style={{ padding: "12px 14px", marginBottom: 10, cursor: "pointer" }} onClick={() => openDetail(f)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar a={u.avatar} color={u.color} size={32} />
              <div className="lr-main"><div className="lr-t">{u.name}</div><div className="lr-s"><Badge text={f.type} type={FB_TYPE_COLOR[f.type] || "info"} /> · {f.time}</div></div>
              <StatusBadge s={f.status} />
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, margin: "10px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{f.content}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, fontSize: 11, color: "var(--fg-muted)" }}>
              {f.imgs ? <span><i className="ri-image-line" /> {f.imgs} 图</span> : null}
              {f.wechat ? <span><i className="ri-wechat-line" /> 有联系方式</span> : null}
              {f.reply ? <span><i className="ri-reply-line" style={{ color: "var(--success)" }} /> 已回复</span> : null}
              <span style={{ marginLeft: "auto", color: "var(--accent)" }}>查看详情 ›</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function ReplyForm({ f, onSaved }: { f: AdminFeedback; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [reply, setReply] = useState(f.reply ?? "");
  const send = () => {
    if (!reply.trim()) { toast("请输入回复内容"); return; }
    f.reply = reply.trim();
    f.status = "已解决";
    closeSheet();
    onSaved();
    toast("回复已发送");
  };
  return (
    <>
      <label className="field-label">回复内容</label>
      <textarea className="input" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="请输入回复内容" />
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>回复后状态将自动置为「已解决」</div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={send}>发送回复</button>
      </div>
    </>
  );
}
