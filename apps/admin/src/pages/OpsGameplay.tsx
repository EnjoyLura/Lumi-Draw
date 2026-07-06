import { useState } from "react";
import { apiDeleteGameplay, apiGetGameplays, apiSaveGameplay, apiSetGameplayEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { GAMEPLAYS, IMG, nextId, type AdminGameplay } from "../data/mock";
import { getGameplays } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function GameplayForm({ id, item, useMock, onSaved }: { id: number; item?: AdminGameplay; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const g = item ?? (id ? GAMEPLAYS.find((x) => x.id === id) : undefined);
  const [name, setName] = useState(g?.name ?? "");
  const [desc, setDesc] = useState(g?.desc ?? "");
  const [uses, setUses] = useState(g?.uses ?? "0");
  const [prompt, setPrompt] = useState("");
  const [hot, setHot] = useState(g?.hot ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    void prompt;
    setSaving(true);
    try {
      if (useMock) {
        if (g) Object.assign(g, { name: name.trim(), desc, uses: uses.trim() || "0", hot });
        else GAMEPLAYS.push({ id: nextId(GAMEPLAYS), name: name.trim(), desc, hot, uses: uses.trim() || "0", on: true });
      } else {
        await apiSaveGameplay(id, { name: name.trim(), desc, uses: uses.trim() || "0", hot, on: g?.on ?? true });
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
      <label className="field-label">玩法名称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：人物美颜" />
      <label className="field-label" style={{ marginTop: 12 }}>玩法描述</label>
      <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="一句话介绍该玩法" />
      <label className="field-label" style={{ marginTop: 12 }}>使用人数</label>
      <input className="input" value={uses} onChange={(e) => setUses(e.target.value)} placeholder="如：8600 或 12.6w" />
      <label className="field-label" style={{ marginTop: 12 }}>关联提示词模板</label>
      <textarea className="input" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="预设提示词" />
      <div className="kv" style={{ marginTop: 8 }}>
        <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>标记为 HOT</span>
        <Switch on={hot} onToggle={() => setHot((v) => !v)} />
      </div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsGameplay() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminGameplay[]>(useMock ? null : () => apiGetGameplays(), [useMock]);
  const gameplays = useMock ? getGameplays() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑玩法" : "新增玩法", <GameplayForm id={id} item={gameplays.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (g: AdminGameplay) => {
    const next = !g.on;
    try {
      if (useMock) {
        g.on = next;
        refresh();
      } else {
        await apiSetGameplayEnabled(g.id, next);
        reload();
      }
      toast(next ? "已启用" : "已停用");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    }
  };
  const del = (g: AdminGameplay) => confirmDlg("删除玩法", "确定删除该玩法吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = gameplays.findIndex((x) => x.id === g.id);
          if (i > -1) gameplays.splice(i, 1);
          refresh();
        } else {
          await apiDeleteGameplay(g.id);
          reload();
        }
        toast("已删除");
      } catch (e) {
        toast(e instanceof Error ? e.message : "删除失败");
      }
    })();
  }, true);

  return (
    <>
      <AddBtn text="新增玩法模板" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载玩法中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card">
        {gameplays.map((g) => (
          <div key={g.id} className="lrow" style={{ cursor: "default" }}>
            <img className="thumb" src={IMG("gp" + g.id)} style={{ width: 44, height: 44 }} alt="" />
            <div className="lr-main">
              <div className="lr-t">{g.name}{g.hot ? <>&nbsp;<Badge text="HOT" type="danger" /></> : null}</div>
              <div className="lr-s">{g.desc}</div>
              <div className="lr-s" style={{ marginTop: 1 }}>使用 {g.uses}</div>
            </div>
            <Switch on={g.on} onToggle={() => toggle(g)} />
            <CtrlIcons onEdit={() => openForm(g.id)} onDelete={() => del(g)} />
          </div>
        ))}
      </div>
    </>
  );
}
