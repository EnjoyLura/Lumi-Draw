import { useState } from "react";
import { apiDeleteAnnouncement, apiGetAnnouncements, apiSaveAnnouncement, apiSetAnnouncementPopup } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { ANNOUNCEMENTS, ANNOUNCE_ACTIONS, IMG, nextId, type AdminAnnounce } from "../data/mock";
import { getAnnouncements } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };
const UPLOAD_STYLE: React.CSSProperties = { height: 96, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--fg-muted)", borderStyle: "dashed", overflow: "hidden" };

function AnnForm({ id, item, useMock, onSaved }: { id: number; item?: AdminAnnounce; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const a = item ?? (id ? ANNOUNCEMENTS.find((x) => x.id === id) : undefined);
  const [title, setTitle] = useState(a?.title ?? "");
  const [summary, setSummary] = useState(a?.summary ?? "");
  const [action, setAction] = useState(a?.action ?? "无");
  const [popup, setPopup] = useState(a?.popup ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast("请输入标题"); return; }
    const data = { title: title.trim(), summary, action, popup, range: a?.range ?? "长期" };
    setSaving(true);
    try {
      if (useMock) {
        if (a) Object.assign(a, data);
        else ANNOUNCEMENTS.push({ id: nextId(ANNOUNCEMENTS), time: new Date().toISOString().slice(0, 10), ...data });
      } else {
        await apiSaveAnnouncement(id, data);
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
      <label className="field-label">封面图片</label>
      <div className="card" style={UPLOAD_STYLE}>
        {id ? <img src={IMG("announce" + id)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : (
          <div style={{ textAlign: "center" }}><i className="ri-upload-cloud-line" style={{ fontSize: 22 }} /><div style={{ fontSize: 12 }}>点击上传（建议 600×280）</div></div>
        )}
      </div>
      <label className="field-label" style={{ marginTop: 12 }}>标题</label>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="公告标题" />
      <label className="field-label" style={{ marginTop: 12 }}>内容</label>
      <textarea className="input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="公告内容" />
      <label className="field-label" style={{ marginTop: 12 }}>跳转动作</label>
      <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
        {ANNOUNCE_ACTIONS.map((o) => <option key={o}>{o}</option>)}
      </select>
      <div className="kv" style={{ marginTop: 8 }}>
        <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>首页弹出显示</span>
        <Switch on={popup} onToggle={() => setPopup(!popup)} />
      </div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function MsgAnnounce() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminAnnounce[]>(useMock ? null : () => apiGetAnnouncements(), [useMock]);
  const list = useMock ? getAnnouncements() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑公告" : "新增公告", <AnnForm id={id} item={list.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (a: AdminAnnounce) => {
    const next = !a.popup;
    try {
      if (useMock) {
        a.popup = next;
        refresh();
      } else {
        await apiSetAnnouncementPopup(a.id, next);
        reload();
      }
      toast(next ? "已开启首页弹出" : "已关闭弹出");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    }
  };
  const del = (a: AdminAnnounce) => confirmDlg("删除公告", "确定删除该公告吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = list.findIndex((x) => x.id === a.id);
          if (i > -1) list.splice(i, 1);
          refresh();
        } else {
          await apiDeleteAnnouncement(a.id);
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
      <AddBtn text="新增公告" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载公告中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      {list.map((a) => (
        <div key={a.id} className="card" style={{ marginBottom: 10, overflow: "hidden" }}>
          <div style={{ position: "relative" }}>
            <img src={IMG("announce" + a.id)} style={{ width: "100%", height: 96, objectFit: "cover", display: "block" }} alt="" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(0,0,0,.55),transparent 60%)" }} />
            <div style={{ position: "absolute", left: 12, bottom: 8, right: 12, color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>{a.title}</div>
          </div>
          <div style={{ padding: "10px 14px" }}>
            <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.summary}</div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 6 }}>跳转：{a.action} · 生效：{a.range}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>首页弹出</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Switch on={a.popup} onToggle={() => toggle(a)} />
              <CtrlIcons onEdit={() => openForm(a.id)} onDelete={() => del(a)} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
