import { useState } from "react";
import { nextId, QUALITIES, type AdminQuality } from "../data/mock";
import { getQualities } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function QualityForm({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const q = id ? QUALITIES.find((x) => x.id === id) : undefined;
  const [label, setLabel] = useState(q?.label ?? "");
  const [pixel, setPixel] = useState(q?.pixel ?? "");
  const [mult, setMult] = useState(String(q?.mult ?? 1));

  const save = () => {
    if (!label.trim()) { toast("请输入名称"); return; }
    const data = { label: label.trim(), pixel, mult: parseFloat(mult) || 1 };
    if (q) Object.assign(q, data);
    else QUALITIES.push({ id: nextId(QUALITIES), on: true, ...data });
    closeSheet();
    onSaved();
    toast(id ? "已保存" : "已新增");
  };

  return (
    <>
      <label className="field-label">档位名称</label>
      <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="如：超清 2K" />
      <label className="field-label" style={{ marginTop: 12 }}>像素规格</label>
      <input className="input" value={pixel} onChange={(e) => setPixel(e.target.value)} placeholder="如：2048px" />
      <label className="field-label" style={{ marginTop: 12 }}>积分倍率</label>
      <input className="input" type="number" step="0.1" value={mult} onChange={(e) => setMult(e.target.value)} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>保存</button>
      </div>
    </>
  );
}

export function OpsQuality() {
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const qualities = getQualities();

  const openForm = (id: number) => openSheet(id ? "编辑分辨率" : "新增分辨率", <QualityForm id={id} onSaved={refresh} />);
  const toggle = (q: AdminQuality) => { q.on = !q.on; refresh(); toast(q.on ? "已启用" : "已停用"); };
  const del = (q: AdminQuality) => confirmDlg("删除档位", "确定删除该档位吗？", () => {
    const i = qualities.findIndex((x) => x.id === q.id);
    if (i > -1) qualities.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", margin: "2px 2px 10px" }}>创作时可选的清晰度档位，积分倍率作用于模型基础消耗。</div>
      <AddBtn text="新增分辨率档位" onClick={() => openForm(0)} />
      <div className="card">
        {qualities.map((q) => (
          <div key={q.id} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--info-soft)", color: "#5B9FE8" }}><i className="ri-hd-line" /></div>
            <div className="lr-main">
              <div className="lr-t">{q.label}</div>
              <div className="lr-s">{q.pixel} · 积分 ×{q.mult}</div>
            </div>
            <Switch on={q.on} onToggle={() => toggle(q)} />
            <CtrlIcons onEdit={() => openForm(q.id)} onDelete={() => del(q)} />
          </div>
        ))}
      </div>
    </>
  );
}
