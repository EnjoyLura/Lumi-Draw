import { useState } from "react";
import { AdminImage } from "../components/AdminImage";
import {
  apiDeleteWork,
  apiFeatureWork,
  apiGetWorkDetail,
  apiOfflineWork,
  apiRecommendWork,
  apiRestoreWork,
  apiUpdateWork,
  type AdminWorkDetailData
} from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, USERS, WORKS, modelName, type AdminWork } from "../data/mock";
import { getWork } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Avatar, Badge, Sec, StatusBadge } from "../ui";

const FOOT_STYLE: React.CSSProperties = {
  display: "flex",
  gap: 10,
  margin: "12px -18px 0",
  padding: "12px 18px 0",
  borderTop: "1px solid var(--border)"
};

function mockWorkDetail(id: number): AdminWorkDetailData {
  const work = getWork(id);
  const user = USERS.find((x) => x.id === work.userId) ?? USERS[0];
  return {
    ...work,
    author: { id: user.id, name: user.name, avatar: user.avatar, color: user.color }
  };
}

function EditWorkInfoForm({ work, useMock, onDone }: { work: AdminWork; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [title, setTitle] = useState(work.title);
  const [desc, setDesc] = useState(work.desc);
  const [tags, setTags] = useState((work.tags && work.tags.length ? work.tags : [work.style]).join("、"));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const tagList = tags.split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
      if (useMock) {
        work.title = title;
        work.desc = desc;
        work.tags = tagList;
      } else {
        await apiUpdateWork(work.id, { title, desc, style: tagList[0] ?? work.style });
      }
      closeSheet();
      onDone();
      toast("已保存作品信息");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">作品标题</label>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="作品标题" />
      <label className="field-label" style={{ marginTop: 12 }}>作品描述</label>
      <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="作品描述" />
      <label className="field-label" style={{ marginTop: 12 }}>标签</label>
      <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="多个用、分隔" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

function TakedownForm({ work, useMock, onDone }: { work: AdminWork; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [saving, setSaving] = useState(false);

  const doTakedown = async () => {
    setSaving(true);
    try {
      if (useMock) {
        work.status = "已下架";
        work.featured = false;
      } else {
        await apiOfflineWork(work.id);
      }
      closeSheet();
      onDone();
      toast("作品已下架");
    } catch (e) {
      toast(e instanceof Error ? e.message : "下架失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">下架原因</label>
      <select className="input">
        <option>违规内容</option>
        <option>侵权投诉</option>
        <option>低质量</option>
        <option>其他</option>
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>备注</label>
      <textarea className="input" rows={2} placeholder="补充说明（可选）" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-danger btn-block" onClick={doTakedown} disabled={saving}>确认下架</button>
      </div>
    </>
  );
}

export function WorkDetail({ param }: { param?: string }) {
  const { go, back, openSheet, confirmDlg, toast } = useNav();
  const { useMock } = useAdminSession();
  const workId = Number(param ?? 0);
  const { data, loading, error, reload } = useAsyncData(useMock ? null : () => apiGetWorkDetail(workId), [useMock, workId]);
  const w = useMock ? mockWorkDetail(workId) : data;
  const u = w?.author ?? USERS.find((x) => x.id === w?.userId);
  const tagList = w?.tags && w.tags.length ? w.tags : w ? [w.style] : [];
  const onDone = () => {
    if (!useMock) reload();
  };

  if (loading) return <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载作品中</div></div>;
  if (error) return <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div>;
  if (!w) return <div className="empty"><i className="ri-image-line" /><div className="et">作品不存在</div></div>;

  const toggle = async (key: "featured" | "recommend") => {
    const next = !w[key];
    try {
      if (useMock) {
        w[key] = next;
      } else if (key === "featured") {
        await apiFeatureWork(w.id, next);
        reload();
      } else {
        await apiRecommendWork(w.id, next);
        reload();
      }
      toast(next ? "已开启" : "已关闭");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    }
  };

  const restore = async () => {
    try {
      if (useMock) {
        w.status = "已发布";
      } else {
        await apiRestoreWork(w.id);
        reload();
      }
      toast("已恢复上架");
    } catch (e) {
      toast(e instanceof Error ? e.message : "恢复失败");
    }
  };

  const del = () => confirmDlg("删除作品", "删除后不可恢复，确定要删除这个作品吗？", async () => {
    if (useMock) {
      const i = WORKS.findIndex((x) => x.id === w.id);
      if (i > -1) WORKS.splice(i, 1);
      back();
      toast("已删除");
      return;
    }
    try {
      await apiDeleteWork(w.id);
      back();
      toast("已删除");
    } catch (e) {
      toast(e instanceof Error ? e.message : "删除失败");
    }
  }, true);

  return (
    <>
      <AdminImage eager className="thumb" src={w.imageUrl || IMG("w" + w.id)} style={{ width: "100%", aspectRatio: "1", borderRadius: 14 }} alt="" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 2px 0" }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{w.title || "未命名作品"}</div>
        <StatusBadge s={w.status} />
      </div>

      {u ? (
        <div className="card" style={{ padding: "10px 14px", marginTop: 10, display: "flex", alignItems: "center", gap: 10 }} onClick={() => go("userDetail", String(u.id))}>
          <Avatar a={u.avatar} color={u.color} size={36} />
          <div className="lr-main">
            <div className="lr-t">{u.name}</div>
            <div className="lr-s">作者 · ID {u.id}</div>
          </div>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
      ) : null}

      <Sec title="标题与描述" more="编辑" onMore={() => openSheet("编辑作品信息", <EditWorkInfoForm work={w} useMock={useMock} onDone={onDone} />)} />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k">作品标题</span><span className="v">{w.title || "未命名作品"}</span></div>
        <div style={{ padding: "11px 0", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>{w.desc || "（暂无作品描述）"}</div>
      </div>

      <Sec title="提示词" />
      <div className="card" style={{ padding: "12px 14px", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>{w.prompt}</div>

      <Sec title="作品信息" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k">模型</span><span className="v">{modelName(w.model)}</span></div>
        <div className="kv"><span className="k">分辨率 / 比例</span><span className="v">{w.quality} · {w.ratio}</span></div>
        <div className="kv"><span className="k">风格</span><span className="v">{w.style}</span></div>
        <div className="kv"><span className="k">标签</span><span className="v">{tagList.map((t, i) => <Badge key={i} text={t} type="info" />)}</span></div>
        <div className="kv"><span className="k">点赞 / 收藏 / 同款</span><span className="v">{w.likes} / {w.favorites} / {w.remakes}</span></div>
        <div className="kv"><span className="k">发布时间</span><span className="v">{w.time}</span></div>
      </div>

      <Sec title="运营操作" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k">设为精选</span><span className={`switch${w.featured ? " on" : ""}`} onClick={() => toggle("featured")} /></div>
        <div className="kv"><span className="k">首页推荐</span><span className={`switch${w.recommend ? " on" : ""}`} onClick={() => toggle("recommend")} /></div>
      </div>

      <div className="actionbar">
        {w.status === "已下架" ? (
          <button className="btn btn-success btn-block" onClick={restore}><i className="ri-eye-line" />恢复上架</button>
        ) : (
          <button className="btn btn-danger btn-block" onClick={() => openSheet("下架作品", <TakedownForm work={w} useMock={useMock} onDone={onDone} />)}><i className="ri-eye-off-line" />下架</button>
        )}
        <button className="btn btn-ghost btn-block" onClick={del}><i className="ri-delete-bin-line" />删除</button>
      </div>
    </>
  );
}
