import { useState } from "react";
import { useNav } from "../shell/NavContext";
import { Sec, Switch } from "../ui";

export function FinInvite() {
  const { toast } = useNav();
  const [on, setOn] = useState(true);
  const [inviter, setInviter] = useState("50");
  const [invitee, setInvitee] = useState("30");
  const [cap, setCap] = useState("20");

  return (
    <>
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv">
          <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>开启邀请功能</span>
          <Switch on={on} onToggle={() => setOn(!on)} />
        </div>
      </div>
      <Sec title="奖励规则" />
      <div className="card" style={{ padding: 14 }}>
        <label className="field-label">邀请人奖励（积分）</label>
        <input className="input" type="number" value={inviter} onChange={(e) => setInviter(e.target.value)} />
        <label className="field-label" style={{ marginTop: 12 }}>被邀请人奖励（积分）</label>
        <input className="input" type="number" value={invitee} onChange={(e) => setInvitee(e.target.value)} />
        <label className="field-label" style={{ marginTop: 12 }}>单用户邀请上限</label>
        <input className="input" type="number" value={cap} onChange={(e) => setCap(e.target.value)} />
      </div>
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={() => toast("已保存邀请配置")}>保存配置</button></div>
    </>
  );
}
