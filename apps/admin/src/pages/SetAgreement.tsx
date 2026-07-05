import { useState } from "react";
import { apiGetAgreements, apiSaveAgreement, type AdminAgreement } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

const AGREEMENTS: Array<[string, string]> = [
  ["用户协议", "最近更新 2025-05-10"],
  ["隐私政策", "最近更新 2025-05-10"],
  ["充值协议", "最近更新 2025-03-01"],
  ["社区规范", "最近更新 2025-04-15"]
];

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function AgreementBody({ name, agreement, useMock, onSaved }: { name: string; agreement?: AdminAgreement; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [content, setContent] = useState(agreement?.content ?? `欢迎使用露米绘画（Lumi-Draw）。本${name}为示例内容，用于原型演示。请在此编辑协议正文……`);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      if (!useMock) await apiSaveAgreement(name, content);
      closeSheet();
      onSaved();
      toast("已保存并生效");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <textarea className="input" rows={12} style={{ fontSize: 13, lineHeight: 1.7 }} value={content} onChange={(e) => setContent(e.target.value)} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存并生效"}</button>
      </div>
    </>
  );
}

export function SetAgreement() {
  const { openSheet } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminAgreement[]>(useMock ? null : () => apiGetAgreements(), [useMock]);
  const agreements = data ?? [];
  const getAgreement = (name: string) => agreements.find((a) => a.name === name || a.title === name);
  return (
    <>
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载协议中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card">
        {AGREEMENTS.map(([name, sub]) => {
          const agreement = getAgreement(name);
          return (
            <div key={name} className="lrow" onClick={() => openSheet(name, <AgreementBody name={name} agreement={agreement} useMock={useMock} onSaved={reload} />)}>
              <div className="lr-ico" style={{ background: "var(--bg-soft)", color: "var(--fg-2)" }}><i className="ri-file-text-line" /></div>
              <div className="lr-main"><div className="lr-t">{name}</div><div className="lr-s">{agreement?.updatedAt ? `最近更新 ${agreement.updatedAt}` : sub}</div></div>
              <i className="ri-arrow-right-s-line lr-arrow" />
            </div>
          );
        })}
      </div>
    </>
  );
}
