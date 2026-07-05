import { useEffect, useState } from "react";
import { apiGetCheckinConfig, apiSaveCheckinConfig, type AdminCheckinConfig } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { getCheckin } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Sec } from "../ui";

const DEFAULT_TIERS = [10, 10, 15, 15, 20, 20, 50].map((c, i) => ({ day: i + 1, c }));

export function FinCheckin() {
  const { toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminCheckinConfig>(useMock ? null : () => apiGetCheckinConfig(), [useMock]);
  const ck = useMock ? getCheckin() : data ?? { base: 10, tiers: DEFAULT_TIERS };
  const [base, setBase] = useState(String(ck.base));
  const [tiers, setTiers] = useState(ck.tiers.map((t) => String(t.c)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!useMock && data) {
      setBase(String(data.base));
      setTiers(data.tiers.map((t) => String(t.c)));
    }
  }, [data, useMock]);

  const setTier = (i: number, v: string) => setTiers((prev) => prev.map((x, j) => (j === i ? v : x)));

  const save = async () => {
    setSaving(true);
    try {
      if (useMock) {
        ck.base = parseInt(base) || 0;
        ck.tiers.forEach((t, i) => { t.c = parseInt(tiers[i]) || 0; });
      } else {
        await apiSaveCheckinConfig({
          base: parseInt(base) || 0,
          tiers: ck.tiers.map((t, i) => ({ day: t.day, c: parseInt(tiers[i]) || 0 }))
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
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存配置"}</button></div>
    </>
  );
}
