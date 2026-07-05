import { useState } from "react";
import { apiDeleteCategory, apiGetCategories, apiSaveCategory } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { CATEGORIES, nextId, type AdminCategory } from "../data/mock";
import { getCategories } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, SortCtrl } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function CategoryForm({ id, item, useMock, onSaved }: { id: number; item?: AdminCategory; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const c = item ?? (id ? CATEGORIES.find((x) => x.id === id) : undefined);
  const [name, setName] = useState(c?.n ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    setSaving(true);
    try {
      if (useMock) {
        if (c) c.n = name.trim();
        else CATEGORIES.push({ id: nextId(CATEGORIES), n: name.trim(), cnt: 0 });
      } else {
        await apiSaveCategory(id, { n: name.trim(), cnt: c?.cnt ?? 0 });
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
      <label className="field-label">分类名称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：二次元 / 风景" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsCategory() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminCategory[]>(useMock ? null : () => apiGetCategories(), [useMock]);
  const categories = useMock ? getCategories() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑分类" : "新增分类", <CategoryForm id={id} item={categories.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const del = (c: AdminCategory) => confirmDlg("删除分类", "确定删除该分类吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = categories.findIndex((x) => x.id === c.id);
          if (i > -1) categories.splice(i, 1);
          refresh();
        } else {
          await apiDeleteCategory(c.id);
          reload();
        }
        toast("已删除");
      } catch (e) {
        toast(e instanceof Error ? e.message : "删除失败");
      }
    })();
  }, true);
  const move = async (i: number, dir: number) => {
    moveItem(categories, i, dir);
    if (useMock) refresh();
    else {
      await Promise.all(categories.map((c, idx) => apiSaveCategory(c.id, { ...c, sort: idx + 1 })));
      reload();
    }
  };

  return (
    <>
      <AddBtn text="新增分类" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载分类中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card">
        {categories.map((c, i) => (
          <div key={c.id} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--purple-soft)", color: "#8B7FD6" }}><i className="ri-price-tag-3-line" /></div>
            <div className="lr-main">
              <div className="lr-t">{c.n}</div>
              <div className="lr-s">{c.cnt} 个作品 · 排序 {i + 1}</div>
            </div>
            <SortCtrl index={i} len={categories.length} onMove={(d) => { void move(i, d); }} />
            <CtrlIcons onEdit={() => openForm(c.id)} onDelete={() => del(c)} />
          </div>
        ))}
      </div>
    </>
  );
}
