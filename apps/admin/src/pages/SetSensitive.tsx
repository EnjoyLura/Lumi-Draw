import { useState } from "react";
import { SENSITIVE } from "../data/mock";
import { getSensitive } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn } from "../ui";
import { useRefresh } from "./opsShared";

function SensForm({ onSaved }: { onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [val, setVal] = useState("");
  const save = () => {
    if (!val.trim()) { toast("请输入敏感词"); return; }
    val.split(/[,，]/).forEach((w) => { const t = w.trim(); if (t) SENSITIVE.push(t); });
    closeSheet();
    onSaved();
    toast("已添加");
  };
  return (
    <>
      <label className="field-label">敏感词</label>
      <input className="input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="输入敏感词，多个用逗号分隔" />
      <div style={{ display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" }}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>保存</button>
      </div>
    </>
  );
}

export function SetSensitive() {
  const { openSheet, confirmDlg, toast } = useNav();
  const refresh = useRefresh();
  const list = getSensitive();

  const del = (i: number) => confirmDlg("删除敏感词", "确定删除该敏感词吗？", () => {
    list.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <AddBtn text="新增敏感词" onClick={() => openSheet("新增敏感词", <SensForm onSaved={refresh} />)} />
      <div className="card">
        {list.map((w, i) => (
          <div key={w + i} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--danger-soft)", color: "#EF4444" }}><i className="ri-forbid-2-line" /></div>
            <div className="lr-main"><div className="lr-t">{w}</div></div>
            <span className="nav-btn" style={{ width: 32, height: 32, fontSize: 17, color: "var(--danger)" }} onClick={() => del(i)}><i className="ri-delete-bin-line" /></span>
          </div>
        ))}
      </div>
    </>
  );
}
