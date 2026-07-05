import { useState } from "react";
import { apiDeleteModel, apiGetModels, apiSaveModel, apiSetModelEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, MODEL_BADGES, MODELS, type AdminModel } from "../data/mock";
import { getModels } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };
const ICON_STYLE: React.CSSProperties = { height: 88, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--fg-muted)", borderStyle: "dashed" };

function ModelForm({ id, item, useMock, onSaved }: { id: string; item?: AdminModel; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const m = item ?? (id ? MODELS.find((x) => x.id === id) : undefined);
  const [name, setName] = useState(m?.name ?? "");
  const [desc, setDesc] = useState(m?.desc ?? "");
  const [tags, setTags] = useState((m?.tags ?? []).join("、"));
  const [cost, setCost] = useState(String(m?.cost ?? 10));
  const [badge, setBadge] = useState(m?.badge ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    const data = {
      name: name.trim(),
      desc,
      tags: tags.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
      cost: parseInt(cost) || 0,
      badge: badge === "无" ? "" : badge
    };
    setSaving(true);
    try {
      if (useMock) {
        if (m) Object.assign(m, data);
        else MODELS.push({ id: "m" + (MODELS.length + 1), on: true, ...data });
      } else {
        await apiSaveModel(id, { ...data, on: m?.on ?? true });
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
      <label className="field-label">模型图标</label>
      <div className="card" style={ICON_STYLE}>
        {id ? <img className="thumb" src={IMG("model" + id)} style={{ width: 56, height: 56 }} alt="" /> : null}
        <div style={{ textAlign: "center" }}><i className="ri-upload-cloud-line" style={{ fontSize: 22 }} /><div style={{ fontSize: 12 }}>点击上传</div></div>
      </div>
      <label className="field-label" style={{ marginTop: 12 }}>模型名称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：GPT Image 2" />
      <label className="field-label" style={{ marginTop: 12 }}>模型描述</label>
      <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="如：画质细腻·理解力强" />
      <label className="field-label" style={{ marginTop: 12 }}>优势标签</label>
      <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="多个用、分隔，如：写实、高清" />
      <label className="field-label" style={{ marginTop: 12 }}>消耗积分</label>
      <input className="input" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>徽标</label>
      <select className="input" value={badge || "无"} onChange={(e) => setBadge(e.target.value)}>
        {MODEL_BADGES.map((o) => <option key={o}>{o}</option>)}
      </select>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsModel() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminModel[]>(useMock ? null : () => apiGetModels(), [useMock]);
  const models = useMock ? getModels() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: string) => openSheet(id ? "编辑模型" : "新增模型", <ModelForm id={id} item={models.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (m: AdminModel) => {
    const next = !m.on;
    try {
      if (useMock) {
        m.on = next;
        refresh();
      } else {
        await apiSetModelEnabled(m.id, next);
        reload();
      }
      toast(next ? "模型已上线" : "模型已下线");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    }
  };
  const del = (m: AdminModel) => confirmDlg("删除模型", "确定删除该模型吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = models.findIndex((x) => x.id === m.id);
          if (i > -1) models.splice(i, 1);
          refresh();
        } else {
          await apiDeleteModel(m.id);
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
      <AddBtn text="新增模型" onClick={() => openForm("")} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载模型中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card">
        {models.map((m) => (
          <div key={m.id} className="lrow" style={{ cursor: "default", alignItems: "flex-start" }}>
            <img className="thumb" src={IMG("model" + m.id)} style={{ width: 44, height: 44, marginTop: 2 }} alt="" />
            <div className="lr-main">
              <div className="lr-t">{m.name}{m.badge ? <>&nbsp;<Badge text={m.badge} type="info" /></> : null}</div>
              <div className="lr-s">{m.desc}</div>
              {m.tags && m.tags.length ? (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  {m.tags.map((t) => <Badge key={t} text={t} type="muted" />)}
                </div>
              ) : null}
              <div className="lr-s" style={{ marginTop: 3 }}>消耗 {m.cost} 积分/次</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
              <Switch on={m.on} onToggle={() => toggle(m)} />
              <CtrlIcons onEdit={() => openForm(m.id)} onDelete={() => del(m)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
