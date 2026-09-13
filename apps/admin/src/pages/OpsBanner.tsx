import { useState } from "react";
import { AdminImage } from "../components/AdminImage";
import { apiDeleteBanner, apiGetBanners, apiSaveBanner, apiSetBannerEnabled, apiUploadBannerImage } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { BANNERS, IMG, nextId, type AdminBanner } from "../data/mock";
import { getBanners } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, SortCtrl, Switch } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const ACTIONS = [
  { value: "checkin", label: "每日签到" },
  { value: "create-gpt-image-2", label: "GPT Image 2 创作页" },
  { value: "create", label: "创作页" },
  { value: "publish", label: "发布作品页" },
  { value: "membership", label: "会员中心" },
  { value: "recharge", label: "积分充值" },
  { value: "invite", label: "邀请好友" },
  { value: "none", label: "不跳转" }
];
const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };
const UPLOAD_STYLE: React.CSSProperties = { height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", borderStyle: "dashed", cursor: "pointer", overflow: "hidden", position: "relative" };
const MAX_BANNER_IMAGE_BYTES = 10 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function prepareMockBannerImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > MAX_BANNER_IMAGE_BYTES) throw new Error("走马灯图片不能超过10MB");
  return readFileAsDataUrl(file);
}

function BannerForm({ id, item, useMock, onSaved }: { id: number; item?: AdminBanner; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const b = item ?? (id ? BANNERS.find((x) => x.id === id) : undefined);
  const [title, setTitle] = useState(b?.title ?? "");
  const [desc, setDesc] = useState(b?.desc ?? "");
  const [imageUrl, setImageUrl] = useState(b?.imageUrl ?? "");
  const [action, setAction] = useState(b?.action ?? "create");
  const [sort, setSort] = useState(String(b?.sort ?? BANNERS.length + 1));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const chooseImage = () => {
    if (uploading || saving) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      void (useMock ? prepareMockBannerImage(file) : apiUploadBannerImage(file).then((result) => result.imageUrl))
        .then((url) => {
          setImageUrl(url);
          toast(useMock ? "图片已选择" : "图片已上传");
        })
        .catch((e) => toast(e instanceof Error ? e.message : "图片处理失败"))
        .finally(() => setUploading(false));
    };
    input.click();
  };

  const save = async () => {
    if (!title.trim()) { toast("请输入标题"); return; }
    const data = { title: title.trim(), desc, imageUrl, action, sort: parseInt(sort) || 0 };
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
        {!ACTIONS.some((item) => item.value === action) ? <option value={action}>{action}</option> : null}
        {ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>排序</label>
      <input className="input" type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>封面图</label>
      <div
        className="card"
        role="button"
        tabIndex={0}
        style={UPLOAD_STYLE}
        onClick={chooseImage}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") chooseImage(); }}
      >
        {imageUrl ? (
          <>
            <AdminImage eager src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            <span style={{ position: "absolute", right: 8, bottom: 8, padding: "3px 8px", borderRadius: 999, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 12 }}>点击更换</span>
          </>
        ) : (
          <span><i className={uploading ? "ri-loader-4-line" : "ri-upload-cloud-line"} style={{ fontSize: 22 }} />&nbsp;{uploading ? "处理中" : "点击上传"}</span>
        )}
      </div>
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
            <AdminImage className="thumb" src={b.thumbnailUrl || b.imageUrl || IMG("banner" + b.id)} style={{ width: 80, height: 54, flexShrink: 0 }} alt="" />
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
