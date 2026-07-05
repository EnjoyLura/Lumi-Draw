import { useState } from "react";
import { apiAddSensitiveWords, apiDeleteSensitiveWord, apiGetSensitiveWords, type AdminSensitiveWord } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { SENSITIVE } from "../data/mock";
import { getSensitive } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn } from "../ui";
import { useRefresh } from "./opsShared";

function SensForm({ useMock, onSaved }: { useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!val.trim()) { toast("请输入敏感词"); return; }
    const words = val.split(/[,，]/).map((w) => w.trim()).filter(Boolean);
    setSaving(true);
    try {
      if (useMock) words.forEach((t) => SENSITIVE.push(t));
      else await apiAddSensitiveWords(words);
      closeSheet();
      onSaved();
      toast("已添加");
    } catch (e) {
      toast(e instanceof Error ? e.message : "添加失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <label className="field-label">敏感词</label>
      <input className="input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="输入敏感词，多个用逗号分隔" />
      <div style={{ display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" }}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function SetSensitive() {
  const { openSheet, confirmDlg, toast } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminSensitiveWord[]>(useMock ? null : () => apiGetSensitiveWords(), [useMock]);
  const list = useMock ? getSensitive().map((word, id) => ({ id, word })) : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const del = (i: number) => confirmDlg("删除敏感词", "确定删除该敏感词吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          SENSITIVE.splice(i, 1);
          refresh();
        } else {
          await apiDeleteSensitiveWord(list[i].id);
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
      <AddBtn text="新增敏感词" onClick={() => openSheet("新增敏感词", <SensForm useMock={useMock} onSaved={afterSaved} />)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载敏感词中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card">
        {list.map((w, i) => (
          <div key={w.id} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--danger-soft)", color: "#EF4444" }}><i className="ri-forbid-2-line" /></div>
            <div className="lr-main"><div className="lr-t">{w.word}</div></div>
            <span className="nav-btn" style={{ width: 32, height: 32, fontSize: 17, color: "var(--danger)" }} onClick={() => del(i)}><i className="ri-delete-bin-line" /></span>
          </div>
        ))}
      </div>
    </>
  );
}
