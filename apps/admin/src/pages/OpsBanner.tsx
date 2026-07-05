import { useState } from "react";
import { apiDeleteBanner, apiGetBanners, apiSaveBanner, apiSetBannerEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { BANNERS, IMG, nextId, type AdminBanner } from "../data/mock";
import { getBanners } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, SortCtrl, Switch } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const ACTIONS = ["创作页", "会员页", "签到页", "活动页", "无"];
const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };
const UPLOAD_STYLE: React.CSSProperties = { height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", borderStyle: "dashed" };

function BannerForm({ id, item, useMock, onSaved }: { id: number; item?: AdminBanner; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const b = item ?? (id ? BANNERS.find((x) => x.id === id) : undefined);
  const [title, setTitle] = useState(b?.title ?? "");
  const [desc, setDesc] = useState(b?.desc ?? "");
  const [action, setAction] = useState(b?.action ?? "创作页");
  const [sort, setSort] = useState(String(b?.sort ?? BANNERS.length + 1));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast("请输入标题"); return; }
    const data = { title: title.trim(), desc, action, sort: parseInt(sort) || 0 };
    setSaving(true);
    try {
      if (useMock) {
        if (b) Object.assign(b, data);
        else BANNERS.push({ id: nextId(BANNERS), on: true, ...data });
      } else {
        await apiSaveBanner(id, { ...data, on: b?.on ?? true });
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
      <label className="field-label">标题</label>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="轮播标题" />
      <label className="field-label" style={{ marginTop: 12 }}>内容描述</label>
      <textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="轮播内容描述" />
      <label className="field-label" style={{ marginTop: 12 }}>跳转页面</label>
      <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
        {ACTIONS.map((o) => <option key={o}>{o}</option>)}
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>排序</label>
      <input className="input" type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>封面图</label>
      <div className="card" style={UPLOAD_STYLE}><i className="ri-upload-cloud-line" style={{ fontSize: 22 }} />&nbsp;点击上传</div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsBanner() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminBanner[]>(useMock ? null : () => apiGetBanners(), [useMock]);
  const banners = useMock ? getBanners() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑轮播图" : "新增轮播图", <BannerForm id={id} item={banners.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (b: AdminBanner) => {
    const next = !b.on;
    try {
      if (useMock) {
        b.on = next;
        refresh();
      } else {
        await apiSetBannerEnabled(b.id, next);
        reload();
      }
      toast(next ? "已启用" : "已停用");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    }
  };
  const move = async (i: number, dir: number) => {
    moveItem(banners, i, dir);
    banners.forEach((b, idx) => { b.sort = idx + 1; });
    if (useMock) refresh();
    else {
      await Promise.all(banners.map((b) => apiSaveBanner(b.id, b)));
      reload();
    }
  };
  const del = (b: AdminBanner) => confirmDlg("删除走马灯", "确定删除该走马灯吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = banners.findIndex((x) => x.id === b.id);
          if (i > -1) banners.splice(i, 1);
          refresh();
        } else {
          await apiDeleteBanner(b.id);
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
      <AddBtn text="新增轮播图" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载走马灯中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      {banners.map((b, i) => (
        <div key={b.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <img className="thumb" src={IMG("banner" + b.id)} style={{ width: 80, height: 54, flexShrink: 0 }} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{b.title}</span>
                <Switch on={b.on} onToggle={() => toggle(b)} />
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.desc || "（暂无描述）"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>跳转：{b.action} · 排序 {b.sort}</span>
            <div style={{ display: "flex", alignItems: "center" }}>
              <SortCtrl index={i} len={banners.length} onMove={(d) => move(i, d)} />
              <CtrlIcons onEdit={() => openForm(b.id)} onDelete={() => del(b)} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
