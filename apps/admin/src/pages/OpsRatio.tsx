import { useState } from "react";
import { apiDeleteRatio, apiGetRatios, apiSaveRatio, apiSetRatioEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { nextId, RATIOS, type AdminRatio } from "../data/mock";
import { getRatios } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, SortCtrl, Switch } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function RatioForm({ id, item, useMock, onSaved }: { id: number; item?: AdminRatio; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const r = item ?? (id ? RATIOS.find((x) => x.id === id) : undefined);
  const [label, setLabel] = useState(r?.label ?? "");
  const [desc, setDesc] = useState(r?.desc ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!label.trim()) { toast("请输入比例"); return; }
    const data = { label: label.trim(), desc };
    setSaving(true);
    try {
      if (useMock) {
        if (r) Object.assign(r, data);
        else RATIOS.push({ id: nextId(RATIOS), on: true, ...data });
      } else {
        await apiSaveRatio(id, { id, on: r?.on ?? true, ...data });
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
      <label className="field-label">比例</label>
      <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="如：16:9" />
      <label className="field-label" style={{ marginTop: 12 }}>说明</label>
      <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="如：宽屏" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsRatio() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminRatio[]>(useMock ? null : () => apiGetRatios(), [useMock]);
  const ratios = useMock ? getRatios() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑比例" : "新增比例", <RatioForm id={id} item={ratios.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (r: AdminRatio) => {
    const next = !r.on;
    try {
      if (useMock) {
        r.on = next;
        refresh();
      } else {
        await apiSetRatioEnabled(r.id, next);
        reload();
      }
      toast(next ? "已启用" : "已停用");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    }
  };
  const del = (r: AdminRatio) => confirmDlg("删除比例", "确定删除该比例吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = ratios.findIndex((x) => x.id === r.id);
          if (i > -1) ratios.splice(i, 1);
          refresh();
        } else {
          await apiDeleteRatio(r.id);
          reload();
        }
        toast("已删除");
      } catch (e) {
        toast(e instanceof Error ? e.message : "删除失败");
      }
    })();
  }, true);
  const move = async (i: number, dir: number) => {
    moveItem(ratios, i, dir);
    if (useMock) refresh();
    else {
      await Promise.all(ratios.map((r, idx) => apiSaveRatio(r.id, { ...r, sort: idx + 1 })));
      reload();
    }
  };

  return (
    <>
      <AddBtn text="新增比例" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载比例中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card">
        {ratios.map((r, i) => (
          <div key={r.id} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--success-soft)", color: "#6FD4B0" }}><i className="ri-aspect-ratio-line" /></div>
            <div className="lr-main">
              <div className="lr-t">{r.label}</div>
              <div className="lr-s">{r.desc}</div>
            </div>
            <Switch on={r.on} onToggle={() => toggle(r)} />
            <SortCtrl index={i} len={ratios.length} onMove={(d) => { void move(i, d); }} />
            <CtrlIcons onEdit={() => openForm(r.id)} onDelete={() => del(r)} />
          </div>
        ))}
      </div>
    </>
  );
}
