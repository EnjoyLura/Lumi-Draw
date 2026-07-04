import { useNav } from "../shell/NavContext";

const AGREEMENTS: Array<[string, string]> = [
  ["用户协议", "最近更新 2025-05-10"],
  ["隐私政策", "最近更新 2025-05-10"],
  ["充值协议", "最近更新 2025-03-01"],
  ["社区规范", "最近更新 2025-04-15"]
];

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function AgreementBody({ name }: { name: string }) {
  const { closeSheet, toast } = useNav();
  return (
    <>
      <textarea className="input" rows={12} style={{ fontSize: 13, lineHeight: 1.7 }} defaultValue={`欢迎使用露米绘画（Lumi-Draw）。本${name}为示例内容，用于原型演示。请在此编辑协议正文……`} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={() => { closeSheet(); toast("已保存并生效"); }}>保存并生效</button>
      </div>
    </>
  );
}

export function SetAgreement() {
  const { openSheet } = useNav();
  return (
    <div className="card">
      {AGREEMENTS.map(([name, sub]) => (
        <div key={name} className="lrow" onClick={() => openSheet(name, <AgreementBody name={name} />)}>
          <div className="lr-ico" style={{ background: "var(--bg-soft)", color: "var(--fg-2)" }}><i className="ri-file-text-line" /></div>
          <div className="lr-main"><div className="lr-t">{name}</div><div className="lr-s">{sub}</div></div>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
      ))}
    </div>
  );
}
