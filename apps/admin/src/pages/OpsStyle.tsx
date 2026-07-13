import { useState } from "react";
import { ConfigImagePicker } from "../components/ConfigImagePicker";
import { apiDeleteStyle, apiGetStyles, apiSaveStyle } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, nextId, STYLES, type AdminStyle } from "../data/mock";
import { getStyles } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, SortCtrl } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function StyleForm({ id, item, useMock, onSaved }: { id: number; item?: AdminStyle; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const s = item ?? (id ? STYLES.find((x) => x.id === id) : undefined);
  const [name, setName] = useState(s?.n ?? "");
  const [prompt, setPrompt] = useState(s?.prompt ?? "");
  const [uses, setUses] = useState(String(s?.s ?? 0));
  const [imageUrl, setImageUrl] = useState(s?.imageUrl ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    if (!imageUrl) { toast("请上传风格封面"); return; }
    const n = name.trim();
    const val = parseInt(uses) || 0;
    setSaving(true);
    try {
      if (useMock) {
        if (s) { s.n = n; s.prompt = prompt; s.s = val; s.imageUrl = imageUrl; }
        else STYLES.push({ id: nextId(STYLES), n, s: val, prompt, imageUrl });
      } else {
        await apiSaveStyle(id, { n, prompt, s: val, imageUrl });
      }
      closeSheet();
      onSaved();
      toast(id ? "已保存" : "已新增");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
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
      <ConfigImagePicker value={imageUrl} scene="style" useMock={useMock} disabled={saving} onChange={setImageUrl} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsStyle() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminStyle[]>(useMock ? null : () => apiGetStyles(), [useMock]);
  const styles = useMock ? getStyles() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑风格" : "新增风格", <StyleForm id={id} item={styles.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const del = (s: AdminStyle) => confirmDlg("删除风格", "确定删除该风格吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = styles.findIndex((x) => x.id === s.id);
          if (i > -1) styles.splice(i, 1);
          refresh();
        } else {
          await apiDeleteStyle(s.id);
          reload();
        }
        toast("已删除");
      } catch (e) {
        toast(e instanceof Error ? e.message : "删除失败");
      }
    })();
  }, true);
  const move = async (i: number, dir: number) => {
    moveItem(styles, i, dir);
    if (useMock) refresh();
    else {
      await Promise.all(styles.map((s, idx) => apiSaveStyle(s.id, { ...s, sort: idx + 1 })));
      reload();
    }
  };

  return (
    <>
      <AddBtn text="新增风格" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载风格中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card">
        {styles.map((s, i) => (
          <div key={s.id} className="lrow" style={{ cursor: "default", alignItems: "flex-start" }}>
            <img className="thumb" src={s.imageUrl || IMG("st" + s.n)} style={{ width: 40, height: 40, marginTop: 2 }} alt="" />
            <div className="lr-main">
              <div className="lr-t">{s.n}</div>
              <div className="lr-s">使用 {s.s} 次 · 排序 {i + 1}</div>
              <div className="lr-s" style={{ whiteSpace: "normal", color: "var(--fg-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{s.prompt || "（未设置提示词）"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
              <SortCtrl index={i} len={styles.length} onMove={(d) => { void move(i, d); }} />
              <CtrlIcons onEdit={() => openForm(s.id)} onDelete={() => del(s)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
