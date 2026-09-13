import { useEffect, useMemo, useRef, useState } from "react";
import { AdminImage } from "../components/AdminImage";
import {
  apiCreateAdminWork,
  apiGetCategories,
  apiGetModels,
  apiGetQualities,
  apiGetRatios,
  apiGetStyles,
  apiGetUsers,
  apiUploadAdminWorkImage
} from "../data/api";
import {
  MODELS,
  CATEGORIES,
  QUALITIES,
  RATIOS,
  STYLES,
  USERS,
  WORKS,
  nextId,
  type AdminModel,
  type AdminCategory,
  type AdminQuality,
  type AdminRatio,
  type AdminStyle,
  type AdminUser
} from "../data/mock";
import { useNav } from "../shell/NavContext";
import { Switch } from "../ui";

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const FOOT_STYLE: React.CSSProperties = {
  display: "flex",
  gap: 10,
  margin: "14px -18px 0",
  padding: "12px 18px 0",
  borderTop: "1px solid var(--border)"
};

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export function WorkUploadForm({ useMock, onPublished }: { useMock: boolean; onPublished: () => void }) {
  const { closeSheet, toast } = useNav();
  const fileInput = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [models, setModels] = useState<AdminModel[]>([]);
  const [qualities, setQualities] = useState<AdminQuality[]>([]);
  const [ratios, setRatios] = useState<AdminRatio[]>([]);
  const [styles, setStyles] = useState<AdminStyle[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [authorQuery, setAuthorQuery] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userId, setUserId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [ratio, setRatio] = useState("");
  const [quality, setQuality] = useState("");
  const [style, setStyle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [featured, setFeatured] = useState(false);
  const [recommend, setRecommend] = useState(false);
  const [saving, setSaving] = useState(false);

  const enabledModels = useMemo(() => models.filter((item) => item.on), [models]);
  const enabledQualities = useMemo(() => qualities.filter((item) => item.on), [qualities]);
  const enabledRatios = useMemo(() => ratios.filter((item) => item.on), [ratios]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const values = useMock
          ? [USERS, MODELS, QUALITIES, RATIOS, STYLES, CATEGORIES] as const
          : await Promise.all([apiGetUsers(), apiGetModels(), apiGetQualities(), apiGetRatios(), apiGetStyles(), apiGetCategories()]);
        if (!active) return;
        setUsers(values[0]);
        setModels(values[1]);
        setQualities(values[2]);
        setRatios(values[3]);
        setStyles(values[4]);
        setCategories(values[5]);
        setUserId(String(values[0][0]?.id ?? ""));
        setModelId(values[1].find((item) => item.on)?.id ?? values[1][0]?.id ?? "");
        setQuality(values[2].find((item) => item.on)?.label ?? values[2][0]?.label ?? "");
        setRatio(values[3].find((item) => item.on)?.label ?? values[3][0]?.label ?? "");
        setStyle(values[4][0]?.n ?? "");
      } catch (error) {
        toast(error instanceof Error ? error.message : "发布选项加载失败");
      } finally {
        if (active) setLoadingOptions(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [useMock]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const searchUsers = async () => {
    setSearchingUsers(true);
    try {
      const keyword = authorQuery.trim().toLowerCase();
      const list = useMock
        ? USERS.filter((user) => user.name.toLowerCase().includes(keyword) || String(user.id).includes(keyword))
        : await apiGetUsers({ keyword: authorQuery.trim() });
      setUsers(list);
      setUserId(String(list[0]?.id ?? ""));
      if (!list.length) toast("没有找到匹配用户");
    } catch (error) {
      toast(error instanceof Error ? error.message : "用户搜索失败");
    } finally {
      setSearchingUsers(false);
    }
  };

  const chooseFile = (next?: File) => {
    if (!next) return;
    if (!next.type.startsWith("image/")) { toast("请选择图片文件"); return; }
    if (next.size > MAX_IMAGE_BYTES) { toast("图片不能超过30MB"); return; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const publish = async () => {
    if (!file) { toast("请上传作品图片"); return; }
    if (!userId) { toast("请选择作品作者"); return; }
    if (!title.trim()) { toast("请输入作品标题"); return; }
    if (!prompt.trim()) { toast("请输入作品提示词"); return; }
    if (!modelId || !ratio || !quality) { toast("请完整选择模型、比例和精度"); return; }

    setSaving(true);
    try {
      const imageUrl = useMock ? await fileAsDataUrl(file) : (await apiUploadAdminWorkImage(file)).imageUrl;
      const parsedTags = tags.slice(0, 5);
      if (useMock) {
        const author = USERS.find((user) => user.id === Number(userId));
        WORKS.unshift({
          id: nextId(WORKS),
          userId: Number(userId),
          authorName: author?.name,
          imageUrl,
          title: title.trim(),
          desc: description.trim(),
          prompt: prompt.trim(),
          model: modelId,
          ratio,
          quality,
          style,
          tags: parsedTags,
          likes: 0,
          favorites: 0,
          remakes: 0,
          status: "已发布",
          featured,
          recommend,
          time: new Date().toISOString()
        });
        if (author) author.works += 1;
      } else {
        await apiCreateAdminWork({
          userId: Number(userId),
          imageUrl,
          title: title.trim(),
          description: description.trim(),
          prompt: prompt.trim(),
          modelId,
          ratio,
          quality,
          style,
          tags: parsedTags,
          featured,
          recommend
        });
      }
      closeSheet();
      onPublished();
      toast("作品已发布");
    } catch (error) {
      toast(error instanceof Error ? error.message : "作品发布失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">作品图片</label>
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
      <button
        type="button"
        className="card"
        style={{ width: "100%", minHeight: 150, padding: 0, overflow: "hidden", borderStyle: "dashed", color: "var(--fg-muted)", cursor: "pointer" }}
        onClick={() => fileInput.current?.click()}
        disabled={saving}
      >
        {preview ? <AdminImage eager src={preview} style={{ display: "block", width: "100%", maxHeight: 260, objectFit: "contain" }} alt="作品预览" /> : <span><i className="ri-upload-cloud-2-line" /> 点击选择本地图片</span>}
      </button>
      <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg-muted)" }}>支持 JPG、PNG、WEBP、GIF，最大30MB</div>

      <label className="field-label" style={{ marginTop: 14 }}>选择作者</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" value={authorQuery} onChange={(event) => setAuthorQuery(event.target.value)} placeholder="输入昵称或用户ID" />
        <button type="button" className="btn btn-soft btn-sm" style={{ flexShrink: 0 }} onClick={searchUsers} disabled={searchingUsers}>{searchingUsers ? "搜索中" : "搜索"}</button>
      </div>
      <select className="input" style={{ marginTop: 8 }} value={userId} onChange={(event) => setUserId(event.target.value)} disabled={loadingOptions || !users.length}>
        {users.map((user) => <option key={user.id} value={user.id}>ID {user.id} · {user.name}</option>)}
      </select>

      <label className="field-label" style={{ marginTop: 14 }}>作品标题</label>
      <input className="input" maxLength={60} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="请输入作品标题" />
      <label className="field-label" style={{ marginTop: 12 }}>作品描述</label>
      <textarea className="input" rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="介绍作品内容（选填）" />
      <label className="field-label" style={{ marginTop: 12 }}>提示词</label>
      <textarea className="input" rows={5} maxLength={1200} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="请输入生成该作品使用的完整提示词" />
      <div style={{ marginTop: 4, fontSize: 11, color: "var(--fg-muted)", textAlign: "right" }}>{prompt.length}/1200</div>

      <label className="field-label" style={{ marginTop: 12 }}>模型</label>
      <select className="input" value={modelId} onChange={(event) => setModelId(event.target.value)} disabled={loadingOptions}>
        {enabledModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <div>
          <label className="field-label">画面比例</label>
          <select className="input" value={ratio} onChange={(event) => setRatio(event.target.value)} disabled={loadingOptions}>
            {enabledRatios.map((item) => <option key={item.id} value={item.label}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">图片精度</label>
          <select className="input" value={quality} onChange={(event) => setQuality(event.target.value)} disabled={loadingOptions}>
            {enabledQualities.map((item) => <option key={item.id} value={item.label}>{item.label}</option>)}
          </select>
        </div>
      </div>
      <label className="field-label" style={{ marginTop: 12 }}>作品风格</label>
      <select className="input" value={style} onChange={(event) => setStyle(event.target.value)} disabled={loadingOptions}>
        <option value="">无特定风格</option>
        {styles.map((item) => <option key={item.id} value={item.n}>{item.n}</option>)}
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>作品标签</label>
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12 }}>
        {categories.map((item) => {
          const selected = tags.includes(item.n);
          return (
            <button
              key={item.id}
              type="button"
              className={`chip${selected ? " active" : ""}`}
              style={{ border: 0, cursor: "pointer" }}
              onClick={() => {
                if (selected) setTags((current) => current.filter((tag) => tag !== item.n));
                else if (tags.length < 5) setTags((current) => [...current, item.n]);
                else toast("最多选择5个作品标签");
              }}
            >
              {item.n}
            </button>
          );
        })}
        {!categories.length && !loadingOptions ? <span style={{ color: "var(--fg-muted)", fontSize: 12 }}>暂无可选标签，请先在分类管理中添加</span> : null}
      </div>
      <div style={{ marginTop: 5, fontSize: 11, color: "var(--fg-muted)" }}>已选择 {tags.length}/5</div>

      <div className="card" style={{ padding: "2px 14px", marginTop: 14 }}>
        <div className="kv"><span className="k">设为精选</span><Switch on={featured} onToggle={() => setFeatured((value) => !value)} /></div>
        <div className="kv"><span className="k">首页推荐</span><Switch on={recommend} onToggle={() => setRecommend((value) => !value)} /></div>
      </div>
      <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, fontSize: 12, lineHeight: 1.55, color: "var(--fg-2)", background: "var(--info-soft)" }}>
        发布后将直接以所选用户身份公开展示，不经过AI生成和人工审核，也不会变动该用户积分。
      </div>

      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={publish} disabled={saving || loadingOptions}>{saving ? "上传发布中" : "立即发布"}</button>
      </div>
    </>
  );
}
