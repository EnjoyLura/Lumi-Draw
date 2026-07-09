import { useEffect, useState } from "react";
import { apiGetSystemSettings, apiSaveSystemSettings, type AdminSystemSettings } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Sec, Seg, Switch } from "../ui";

const GROUPS: Array<[string, Array<[string, string, string]>]> = [
  ["内容与安全", [["setAudit", "审核设置", "ri-shield-check-line"], ["setSensitive", "敏感词管理", "ri-filter-line"]]],
  ["应用管理", [["setVersion", "版本管理", "ri-git-branch-line"], ["setAgreement", "协议管理", "ri-file-text-line"]]]
];

export function Settings() {
  const { go, toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminSystemSettings>(useMock ? null : () => apiGetSystemSettings(), [useMock]);
  const [reviewMode, setReviewMode] = useState("auto");
  const [manualReviewEnabled, setManualReviewEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!useMock && data) {
      setReviewMode(data.reviewMode);
      setManualReviewEnabled(data.manualReviewEnabled);
    }
  }, [data, useMock]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      if (!useMock) {
        const saved = await apiSaveSystemSettings({ reviewMode, manualReviewEnabled });
        setReviewMode(saved.reviewMode);
        setManualReviewEnabled(saved.manualReviewEnabled);
        reload();
      }
      toast("已保存系统设置");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载系统设置中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <Sec title="平台配置" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv" style={{ display: "block", padding: "12px 0" }}>
          <div className="k" style={{ fontWeight: 600, color: "var(--fg-2)", marginBottom: 10 }}>审核模式</div>
          <Seg items={[["auto", "自动"], ["manual", "人工"]]} active={reviewMode} onPick={setReviewMode} small />
        </div>
        <div className="kv">
          <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>开启人工审核</span>
          <Switch on={manualReviewEnabled} onToggle={() => setManualReviewEnabled(!manualReviewEnabled)} />
        </div>
      </div>
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={saveSettings} disabled={saving}>{saving ? "保存中" : "保存设置"}</button></div>
      {GROUPS.map(([title, items]) => (
        <div key={title}>
          <Sec title={title} />
          <div className="card">
            {items.map(([id, label, icon]) => (
              <div key={id} className="lrow" onClick={() => go(id)}>
                <div className="lr-ico" style={{ background: "var(--bg-soft)", color: "var(--fg-2)" }}><i className={icon} /></div>
                <div className="lr-main"><div className="lr-t">{label}</div></div>
                <i className="ri-arrow-right-s-line lr-arrow" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--fg-muted)", marginTop: 24 }}>露米绘画管理后台 v1.0.0</div>
    </>
  );
}
