import { useEffect, useState } from "react";
import { apiGetInviteConfig, apiSaveInviteConfig, type AdminInviteConfig } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Sec, Switch } from "../ui";

export function FinInvite() {
  const { toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminInviteConfig>(useMock ? null : () => apiGetInviteConfig(), [useMock]);
  const [on, setOn] = useState(true);
  const [inviter, setInviter] = useState("50");
  const [invitee, setInvitee] = useState("30");
  const [cap, setCap] = useState("20");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!useMock && data) {
      setOn(data.enabled);
      setInviter(String(data.inviterReward));
      setInvitee(String(data.inviteeReward));
      setCap(String(data.cap));
    }
  }, [data, useMock]);

  const save = async () => {
    setSaving(true);
    try {
      if (!useMock) {
        await apiSaveInviteConfig({
          enabled: on,
          inviterReward: parseInt(inviter) || 0,
          inviteeReward: parseInt(invitee) || 0,
          cap: parseInt(cap) || 0
        });
        reload();
      }
      toast("已保存邀请配置");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载邀请配置中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
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
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存配置"}</button></div>
    </>
  );
}
