import { useState } from "react";
import { nextId, RATIOS, type AdminRatio } from "../data/mock";
import { getRatios } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, SortCtrl, Switch } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function RatioForm({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const r = id ? RATIOS.find((x) => x.id === id) : undefined;
  const [label, setLabel] = useState(r?.label ?? "");
  const [desc, setDesc] = useState(r?.desc ?? "");

  const save = () => {
    if (!label.trim()) { toast("请输入比例"); return; }
    const data = { label: label.trim(), desc };
    if (r) Object.assign(r, data);
    else RATIOS.push({ id: nextId(RATIOS), on: true, ...data });
    closeSheet();
    onSaved();
    toast(id ? "已保存" : "已新增");
  };

  return (
    <>
      <label className="field-label">比例</label>
      <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="如：16:9" />
      <label className="field-label" style={{ marginTop: 12 }}>说明</label>
      <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="如：宽屏" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>保存</button>
      </div>
    </>
  );
}

export function OpsRatio() {
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const ratios = getRatios();

  const openForm = (id: number) => openSheet(id ? "编辑比例" : "新增比例", <RatioForm id={id} onSaved={refresh} />);
  const toggle = (r: AdminRatio) => { r.on = !r.on; refresh(); toast(r.on ? "已启用" : "已停用"); };
  const del = (r: AdminRatio) => confirmDlg("删除比例", "确定删除该比例吗？", () => {
    const i = ratios.findIndex((x) => x.id === r.id);
    if (i > -1) ratios.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <AddBtn text="新增比例" onClick={() => openForm(0)} />
      <div className="card">
        {ratios.map((r, i) => (
          <div key={r.id} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--success-soft)", color: "#6FD4B0" }}><i className="ri-aspect-ratio-line" /></div>
            <div className="lr-main">
              <div className="lr-t">{r.label}</div>
              <div className="lr-s">{r.desc}</div>
            </div>
            <Switch on={r.on} onToggle={() => toggle(r)} />
            <SortCtrl index={i} len={ratios.length} onMove={(d) => { moveItem(ratios, i, d); refresh(); }} />
            <CtrlIcons onEdit={() => openForm(r.id)} onDelete={() => del(r)} />
          </div>
        ))}
      </div>
    </>
  );
}
