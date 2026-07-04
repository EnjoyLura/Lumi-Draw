import { useState } from "react";
import { HOT_SEARCHES, nextId, type AdminHotSearch } from "../data/mock";
import { getHotSearches } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, CtrlIcons, SortCtrl, Switch } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function HotForm({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const s = id ? HOT_SEARCHES.find((x) => x.id === id) : undefined;
  const [k, setK] = useState(s?.k ?? "");
  const [top, setTop] = useState(s?.top ?? false);

  const save = () => {
    if (!k.trim()) { toast("请输入关键词"); return; }
    if (s) { s.k = k.trim(); s.top = top; }
    else HOT_SEARCHES.push({ id: nextId(HOT_SEARCHES), k: k.trim(), top, hot: 0 });
    closeSheet();
    onSaved();
    toast(id ? "已保存" : "已新增");
  };

  return (
    <>
      <label className="field-label">关键词</label>
      <input className="input" value={k} onChange={(e) => setK(e.target.value)} placeholder="如：赛博朋克" />
      <div className="kv" style={{ marginTop: 8 }}>
        <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>置顶显示</span>
        <Switch on={top} onToggle={() => setTop((v) => !v)} />
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 10, lineHeight: 1.5 }}>展示顺序通过列表的上移/下移调整。</div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>保存</button>
      </div>
    </>
  );
}

export function OpsHotSearch() {
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const hots = getHotSearches();

  const openForm = (id: number) => openSheet(id ? "编辑热搜" : "新增热搜", <HotForm id={id} onSaved={refresh} />);
  const del = (s: AdminHotSearch) => confirmDlg("删除热搜词", "确定删除该热搜词吗？", () => {
    const i = hots.findIndex((x) => x.id === s.id);
    if (i > -1) hots.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <AddBtn text="新增热搜词" onClick={() => openForm(0)} />
      <div className="card">
        {hots.map((s, i) => (
          <div key={s.id} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--warning-soft)", color: "#F59E0B", fontWeight: 800 }}>{i + 1}</div>
            <div className="lr-main">
              <div className="lr-t">{s.k}{s.top ? <>&nbsp;<Badge text="置顶" type="danger" /></> : null}</div>
            </div>
            <SortCtrl index={i} len={hots.length} onMove={(d) => { moveItem(hots, i, d); refresh(); }} />
            <CtrlIcons onEdit={() => openForm(s.id)} onDelete={() => del(s)} />
          </div>
        ))}
      </div>
    </>
  );
}
