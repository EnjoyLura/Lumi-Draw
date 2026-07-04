import { useState } from "react";
import { useNav } from "../shell/NavContext";
import { Sec, Switch } from "../ui";

const HINT: React.CSSProperties = { fontSize: 12, color: "var(--fg-muted)", margin: "8px 2px 0", lineHeight: 1.5 };

export function SetAudit() {
  const { toast } = useNav();
  const [aiAudit, setAiAudit] = useState(true);
  const [autoTakedown, setAutoTakedown] = useState(true);
  const [threshold, setThreshold] = useState("10");

  return (
    <>
      <Sec title="自动审核" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>开启AI自动审核</span><Switch on={aiAudit} onToggle={() => setAiAudit(!aiAudit)} /></div>
      </div>
      <div style={HINT}>开启后作品由 AI 自动审核，命中风险时转人工。</div>
      <Sec title="举报自动下架" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>举报达阈值自动下架</span><Switch on={autoTakedown} onToggle={() => setAutoTakedown(!autoTakedown)} /></div>
        <div className="kv"><span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>举报阈值（次）</span><input className="input" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ width: 90, textAlign: "right", padding: "6px 10px" }} /></div>
      </div>
      <div style={HINT}>当一个作品被举报次数达到阈值时，自动下架并转人工复核。</div>
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={() => toast("已保存审核设置")}>保存设置</button></div>
    </>
  );
}
