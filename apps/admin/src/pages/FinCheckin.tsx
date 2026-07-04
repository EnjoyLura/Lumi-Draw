import { useState } from "react";
import { getCheckin } from "../data/service";
import { useNav } from "../shell/NavContext";
import { Sec } from "../ui";

export function FinCheckin() {
  const { toast } = useNav();
  const ck = getCheckin();
  const [base, setBase] = useState(String(ck.base));
  const [tiers, setTiers] = useState(ck.tiers.map((t) => String(t.c)));

  const setTier = (i: number, v: string) => setTiers((prev) => prev.map((x, j) => (j === i ? v : x)));

  const save = () => {
    ck.base = parseInt(base) || 0;
    ck.tiers.forEach((t, i) => { t.c = parseInt(tiers[i]) || 0; });
    toast("已保存签到配置");
  };

  return (
    <>
      <Sec title="每日签到积分" />
      <div className="card" style={{ padding: 14 }}>
        <label className="field-label">每日基础积分</label>
        <input className="input" type="number" value={base} onChange={(e) => setBase(e.target.value)} />
      </div>
      <Sec title="连续签到里程碑积分" />
      <div className="card" style={{ padding: "6px 14px" }}>
        {ck.tiers.map((t, i) => (
          <div key={t.day} className="kv">
            <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>连续第 {t.day} 天</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input className="input" type="number" value={tiers[i]} onChange={(e) => setTier(i, e.target.value)} style={{ width: 82, textAlign: "right", padding: "6px 10px" }} />
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>积分</span>
            </div>
          </div>
        ))}
      </div>
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={save}>保存配置</button></div>
    </>
  );
}
