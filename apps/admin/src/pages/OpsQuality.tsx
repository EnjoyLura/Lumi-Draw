import { useState } from "react";
import { apiDeleteQuality, apiGetQualities, apiSaveQuality, apiSetQualityEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { nextId, QUALITIES, type AdminQuality } from "../data/mock";
import { getQualities } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function QualityForm({ id, item, useMock, onSaved }: { id: number; item?: AdminQuality; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const q = item ?? (id ? QUALITIES.find((x) => x.id === id) : undefined);
  const [label, setLabel] = useState(q?.label ?? "");
  const [pixel, setPixel] = useState(q?.pixel ?? "");
  const [mult, setMult] = useState(String(q?.mult ?? 1));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!label.trim()) { toast("请输入名称"); return; }
    const data = { label: label.trim(), pixel, mult: parseFloat(mult) || 1 };
    setSaving(true);
    try {
      if (useMock) {
        if (q) Object.assign(q, data);
        else QUALITIES.push({ id: nextId(QUALITIES), on: true, ...data });
      } else {
        await apiSaveQuality(id, { id, on: q?.on ?? true, ...data });
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
      <label className="field-label">档位名称</label>
      <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="如：超清 2K" />
      <label className="field-label" style={{ marginTop: 12 }}>像素规格</label>
      <input className="input" value={pixel} onChange={(e) => setPixel(e.target.value)} placeholder="如：2048px" />
      <label className="field-label" style={{ marginTop: 12 }}>积分倍率</label>
      <input className="input" type="number" step="0.1" value={mult} onChange={(e) => setMult(e.target.value)} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsQuality() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminQuality[]>(useMock ? null : () => apiGetQualities(), [useMock]);
  const qualities = useMock ? getQualities() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑分辨率" : "新增分辨率", <QualityForm id={id} item={qualities.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (q: AdminQuality) => {
    const next = !q.on;
    try {
      if (useMock) {
        q.on = next;
        refresh();
      } else {
        await apiSetQualityEnabled(q.id, next);
        reload();
      }
      toast(next ? "已启用" : "已停用");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    }
  };
  const del = (q: AdminQuality) => confirmDlg("删除档位", "确定删除该档位吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = qualities.findIndex((x) => x.id === q.id);
          if (i > -1) qualities.splice(i, 1);
          refresh();
        } else {
          await apiDeleteQuality(q.id);
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
      <div style={{ fontSize: 12, color: "var(--fg-muted)", margin: "2px 2px 10px" }}>创作时可选的清晰度档位，积分倍率作用于模型基础消耗。</div>
      <AddBtn text="新增分辨率档位" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载分辨率中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
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
