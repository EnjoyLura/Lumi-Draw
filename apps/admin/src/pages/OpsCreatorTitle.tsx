import { useEffect, useState } from "react";
import { apiGetCreatorTitles, apiSaveCreatorTitles, type AdminCreatorTitleTier } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Sec } from "../ui";

const DEFAULT_TIERS: AdminCreatorTitleTier[] = [
  { minWorks: 0, name: "画布新星" }, { minWorks: 1, name: "灵感画师" },
  { minWorks: 10, name: "创意达人" }, { minWorks: 30, name: "风格主理人" },
  { minWorks: 50, name: "光影大师" }, { minWorks: 100, name: "星耀艺术家" }
];

export function OpsCreatorTitle() {
  const { useMock } = useAdminSession();
  const { toast } = useNav();
  const { data, loading, error } = useAsyncData(useMock ? null : apiGetCreatorTitles, [useMock]);
  const [tiers, setTiers] = useState<AdminCreatorTitleTier[]>(DEFAULT_TIERS);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!useMock && data) setTiers(data.tiers); }, [data, useMock]);
  const update = (index: number, key: keyof AdminCreatorTitleTier, value: string) => {
    setTiers((previous) => previous.map((tier, i) => i === index ? { ...tier, [key]: key === "minWorks" ? Number(value) : value } : tier));
  };
  const save = async () => {
    if (tiers.some((tier) => !tier.name.trim()) || tiers.some((tier, index) => index > 0 && tier.minWorks <= tiers[index - 1].minWorks)) {
      toast("请保证称号名不为空，作品数逐档递增"); return;
    }
    setSaving(true);
    try {
      if (!useMock) await apiSaveCreatorTitles(tiers.map((tier) => ({ ...tier, name: tier.name.trim(), minWorks: Math.max(0, Math.floor(tier.minWorks || 0)) })));
      toast("称号配置已保存");
    } catch (e) { toast(e instanceof Error ? e.message : "保存失败"); } finally { setSaving(false); }
  };

  return <>
    <Sec title="创作者称号" />
    <div className="card" style={{ padding: "12px 14px", marginBottom: 12, color: "var(--fg-muted)", fontSize: 13, lineHeight: 1.6 }}>
      用户已发布作品达到对应数量后自动升级称号。称号及门槛保存后立即生效。
    </div>
    {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">正在加载称号配置...</div></div> : null}
    {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
    <div className="card" style={{ padding: "6px 14px" }}>
      {tiers.map((tier, index) => <div className="kv" key={index} style={{ gap: 10 }}>
        <span className="k" style={{ width: 24, color: "var(--accent)", fontWeight: 700 }}>{index + 1}</span>
        <input className="input" value={tier.name} maxLength={12} onChange={(e) => update(index, "name", e.target.value)} style={{ flex: 1, minWidth: 0, padding: "6px 9px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
          <span style={{ color: "var(--fg-muted)", fontSize: 12 }}>作品≥</span>
          <input className="input" type="number" min="0" value={tier.minWorks} onChange={(e) => update(index, "minWorks", e.target.value)} style={{ width: 54, padding: "6px" }} />
        </div>
      </div>)}
    </div>
    <div className="actionbar"><button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存称号配置"}</button></div>
  </>;
}
