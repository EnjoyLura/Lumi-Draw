import { useState } from "react";
import { CATEGORIES, nextId, type AdminCategory } from "../data/mock";
import { getCategories } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, SortCtrl } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function CategoryForm({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const c = id ? CATEGORIES.find((x) => x.id === id) : undefined;
  const [name, setName] = useState(c?.n ?? "");

  const save = () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    if (c) c.n = name.trim();
    else CATEGORIES.push({ id: nextId(CATEGORIES), n: name.trim(), cnt: 0 });
    closeSheet();
    onSaved();
    toast(id ? "已保存" : "已新增");
  };

  return (
    <>
      <label className="field-label">分类名称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：二次元 / 风景" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>保存</button>
      </div>
    </>
  );
}

export function OpsCategory() {
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const categories = getCategories();

  const openForm = (id: number) => openSheet(id ? "编辑分类" : "新增分类", <CategoryForm id={id} onSaved={refresh} />);
  const del = (c: AdminCategory) => confirmDlg("删除分类", "确定删除该分类吗？", () => {
    const i = categories.findIndex((x) => x.id === c.id);
    if (i > -1) categories.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <AddBtn text="新增分类" onClick={() => openForm(0)} />
      <div className="card">
        {categories.map((c, i) => (
          <div key={c.id} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--purple-soft)", color: "#8B7FD6" }}><i className="ri-price-tag-3-line" /></div>
            <div className="lr-main">
              <div className="lr-t">{c.n}</div>
              <div className="lr-s">{c.cnt} 个作品 · 排序 {i + 1}</div>
            </div>
            <SortCtrl index={i} len={categories.length} onMove={(d) => { moveItem(categories, i, d); refresh(); }} />
            <CtrlIcons onEdit={() => openForm(c.id)} onDelete={() => del(c)} />
          </div>
        ))}
      </div>
    </>
  );
}
