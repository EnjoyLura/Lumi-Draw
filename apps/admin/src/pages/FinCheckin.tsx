import { useEffect, useState } from "react";
import { apiGetCheckinConfig, apiSaveCheckinConfig, type AdminCheckinConfig, type CheckinMilestone } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { getCheckin } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Sec } from "../ui";

const DEFAULT_TIERS = [2, 2, 2, 3, 3, 3, 5].map((c, i) => ({ day: i + 1, c }));
const DEFAULT_MILESTONES: CheckinMilestone[] = [
  { days: 3, credits: 20 },
  { days: 7, credits: 50 },
  { days: 14, credits: 100 },
  { days: 30, credits: 300 }
];

export function FinCheckin() {
  const { toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminCheckinConfig>(useMock ? null : () => apiGetCheckinConfig(), [useMock]);
  const ck = useMock ? getCheckin() : data ?? { base: 2, tiers: DEFAULT_TIERS, milestones: DEFAULT_MILESTONES };
  const [base, setBase] = useState(String(ck.base));
  const [tiers, setTiers] = useState(ck.tiers.map((t) => String(t.c)));
  const [milestones, setMilestones] = useState(ck.milestones.map((m) => String(m.credits)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!useMock && data) {
      setBase(String(data.base));
      setTiers(data.tiers.map((t) => String(t.c)));
      setMilestones(data.milestones.map((m) => String(m.credits)));
    }
  }, [data, useMock]);

  const setTier = (i: number, v: string) => setTiers((prev) => prev.map((x, j) => (j === i ? v : x)));
  const setMilestone = (i: number, v: string) => setMilestones((prev) => prev.map((x, j) => (j === i ? v : x)));

  const save = async () => {
    setSaving(true);
    try {
      if (useMock) {
        ck.base = parseInt(base) || 0;
        ck.tiers.forEach((t, i) => { t.c = parseInt(tiers[i]) || 0; });
        ck.milestones.forEach((m, i) => { m.credits = parseInt(milestones[i]) || 0; });
      } else {
        await apiSaveCheckinConfig({
          base: parseInt(base) || 0,
          tiers: ck.tiers.map((t, i) => ({ day: t.day, c: parseInt(tiers[i]) || 0 })),
          milestones: ck.milestones.map((m, i) => ({ days: m.days, credits: parseInt(milestones[i]) || 0 }))
        });
        reload();
      }
      toast("已保存签到配置");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载签到配置中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <Sec title="每日签到积分" />
      <div className="card" style={{ padding: 14 }}>
        <label className="field-label">每日基础积分</label>
        <input className="input" type="number" value={base} onChange={(e) => setBase(e.target.value)} />
      </div>
      <Sec title="连续签到每日积分（7 天循环）" />
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
      <Sec title="签到里程碑奖励（达标当天自动发放）" />
      <div className="card" style={{ padding: "6px 14px" }}>
        {ck.milestones.map((m, i) => (
          <div key={m.days} className="kv">
            <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>连续第 {m.days} 天</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input className="input" type="number" value={milestones[i]} onChange={(e) => setMilestone(i, e.target.value)} style={{ width: 82, textAlign: "right", padding: "6px 10px" }} />
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>积分</span>
            </div>
          </div>
        ))}
      </div>
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存配置"}</button></div>
    </>
  );
}
