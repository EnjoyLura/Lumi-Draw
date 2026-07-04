import { useState } from "react";
import { IMG, nextId, STYLES, type AdminStyle } from "../data/mock";
import { getStyles } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, SortCtrl } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };
const UPLOAD_STYLE: React.CSSProperties = { height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", borderStyle: "dashed" };

function StyleForm({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const s = id ? STYLES.find((x) => x.id === id) : undefined;
  const [name, setName] = useState(s?.n ?? "");
  const [prompt, setPrompt] = useState(s?.prompt ?? "");
  const [uses, setUses] = useState(String(s?.s ?? 0));

  const save = () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    const n = name.trim();
    const val = parseInt(uses) || 0;
    if (s) { s.n = n; s.prompt = prompt; s.s = val; }
    else STYLES.push({ id: nextId(STYLES), n, s: val, prompt });
    closeSheet();
    onSaved();
    toast(id ? "已保存" : "已新增");
  };

  return (
    <>
      <label className="field-label">风格名称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：赛博朋克" />
      <label className="field-label" style={{ marginTop: 12 }}>风格提示词</label>
      <textarea className="input" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="应用该风格时追加的提示词，如：cyberpunk style, neon lights" />
      <label className="field-label" style={{ marginTop: 12 }}>使用次数</label>
      <input className="input" type="number" value={uses} onChange={(e) => setUses(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>封面图</label>
      <div className="card" style={UPLOAD_STYLE}><i className="ri-upload-cloud-line" style={{ fontSize: 22 }} />&nbsp;点击上传</div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>保存</button>
      </div>
    </>
  );
}

export function OpsStyle() {
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const styles = getStyles();

  const openForm = (id: number) => openSheet(id ? "编辑风格" : "新增风格", <StyleForm id={id} onSaved={refresh} />);
  const del = (s: AdminStyle) => confirmDlg("删除风格", "确定删除该风格吗？", () => {
    const i = styles.findIndex((x) => x.id === s.id);
    if (i > -1) styles.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <AddBtn text="新增风格" onClick={() => openForm(0)} />
      <div className="card">
        {styles.map((s, i) => (
          <div key={s.id} className="lrow" style={{ cursor: "default", alignItems: "flex-start" }}>
            <img className="thumb" src={IMG("st" + s.n)} style={{ width: 40, height: 40, marginTop: 2 }} alt="" />
            <div className="lr-main">
              <div className="lr-t">{s.n}</div>
              <div className="lr-s">使用 {s.s} 次 · 排序 {i + 1}</div>
              <div className="lr-s" style={{ whiteSpace: "normal", color: "var(--fg-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{s.prompt || "（未设置提示词）"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
              <SortCtrl index={i} len={styles.length} onMove={(d) => { moveItem(styles, i, d); refresh(); }} />
              <CtrlIcons onEdit={() => openForm(s.id)} onDelete={() => del(s)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
