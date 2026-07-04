import { useState } from "react";
import { nextId, VER_TYPE_COLOR, VER_TYPES, VERSIONS, type AdminVersion, type VersionItem } from "../data/mock";
import { getVersions } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, CtrlIcons } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function VerForm({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const v = id ? VERSIONS.find((x) => x.id === id) : undefined;
  const [ver, setVer] = useState(v?.ver ?? "");
  const [items, setItems] = useState<VersionItem[]>(
    v?.items?.length ? v.items.map((it) => ({ ...it })) : [{ type: "新增", text: "" }]
  );

  const setItem = (i: number, patch: Partial<VersionItem>) => setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems([...items, { type: "新增", text: "" }]);
  const delItem = (i: number) => { const next = items.filter((_, k) => k !== i); setItems(next.length ? next : [{ type: "新增", text: "" }]); };

  const save = () => {
    if (!ver.trim()) { toast("请输入版本号"); return; }
    const kept = items.filter((it) => it.text.trim());
    if (!kept.length) { toast("请至少填写一条更新内容"); return; }
    if (v) { v.ver = ver.trim(); v.items = kept; }
    else VERSIONS.unshift({ id: nextId(VERSIONS), ver: ver.trim(), time: new Date().toISOString().slice(0, 10), items: kept });
    closeSheet();
    onSaved();
    toast(id ? "已保存" : "新版本已发布");
  };

  return (
    <>
      <label className="field-label">版本号</label>
      <input className="input" value={ver} onChange={(e) => setVer(e.target.value)} placeholder="如：v1.3.0" />
      <label className="field-label" style={{ marginTop: 12 }}>更新条目</label>
      <div>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <select className="input" value={it.type} onChange={(e) => setItem(i, { type: e.target.value })} style={{ width: 78, flexShrink: 0, padding: "8px 6px" }}>
              {VER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input" value={it.text} onChange={(e) => setItem(i, { text: e.target.value })} placeholder="更新内容" />
            <span className="nav-btn" style={{ width: 30, height: 30, flexShrink: 0, color: "var(--danger)" }} onClick={() => delItem(i)}><i className="ri-close-circle-line" /></span>
          </div>
        ))}
      </div>
      <button className="btn btn-soft btn-sm btn-block" onClick={addItem}><i className="ri-add-line" />添加一条</button>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>{id ? "保存" : "发布"}</button>
      </div>
    </>
  );
}

export function SetVersion() {
  const { openSheet, confirmDlg, toast } = useNav();
  const refresh = useRefresh();
  const list = getVersions();

  const openForm = (id: number) => openSheet(id ? "编辑版本" : "发布新版本", <VerForm id={id} onSaved={refresh} />);
  const del = (v: AdminVersion) => confirmDlg("删除版本", "确定删除该版本吗？", () => {
    const i = list.findIndex((x) => x.id === v.id);
    if (i > -1) list.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <AddBtn text="发布新版本" onClick={() => openForm(0)} />
      {list.map((v, vi) => (
        <div key={v.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{v.ver}{vi === 0 ? <> <Badge text="最新版本" type="info" /></> : null}</div>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{v.time}</span>
          </div>
          {v.items.map((it, k) => (
            <div key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
              <Badge text={it.type} type={VER_TYPE_COLOR[it.type] || "muted"} />
              <span style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5, flex: 1 }}>{it.text}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <CtrlIcons onEdit={() => openForm(v.id)} onDelete={() => del(v)} />
          </div>
        </div>
      ))}
    </>
  );
}
