import { useState } from "react";
import { apiDeleteHotSearch, apiGetHotSearches, apiSaveHotSearch } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { HOT_SEARCHES, nextId, type AdminHotSearch } from "../data/mock";
import { getHotSearches } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, CtrlIcons, SortCtrl, Switch } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function HotForm({ id, item, useMock, onSaved }: { id: number; item?: AdminHotSearch; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const s = item ?? (id ? HOT_SEARCHES.find((x) => x.id === id) : undefined);
  const [k, setK] = useState(s?.k ?? "");
  const [top, setTop] = useState(s?.top ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!k.trim()) { toast("请输入关键词"); return; }
    setSaving(true);
    try {
      if (useMock) {
        if (s) { s.k = k.trim(); s.top = top; }
        else HOT_SEARCHES.push({ id: nextId(HOT_SEARCHES), k: k.trim(), top, hot: 0 });
      } else {
        await apiSaveHotSearch(id, { k: k.trim(), top, hot: s?.hot ?? 0 });
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
      <label className="field-label">关键词</label>
      <input className="input" value={k} onChange={(e) => setK(e.target.value)} placeholder="如：赛博朋克" />
      <div className="kv" style={{ marginTop: 8 }}>
        <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>置顶显示</span>
        <Switch on={top} onToggle={() => setTop((v) => !v)} />
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 10, lineHeight: 1.5 }}>展示顺序通过列表的上移/下移调整。</div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsHotSearch() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminHotSearch[]>(useMock ? null : () => apiGetHotSearches(), [useMock]);
  const hots = useMock ? getHotSearches() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑热搜" : "新增热搜", <HotForm id={id} item={hots.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const del = (s: AdminHotSearch) => confirmDlg("删除热搜词", "确定删除该热搜词吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = hots.findIndex((x) => x.id === s.id);
          if (i > -1) hots.splice(i, 1);
          refresh();
        } else {
          await apiDeleteHotSearch(s.id);
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
      <AddBtn text="新增热搜词" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载热搜中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
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
