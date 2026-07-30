import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Space, Switch as AntSwitch, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { ConfigImagePicker } from "../components/ConfigImagePicker";
import { AdminImage } from "../components/AdminImage";
import { apiDeleteGameplay, apiGetGameplays, apiSaveGameplay, apiSetGameplayEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { GAMEPLAYS, IMG, nextId, type AdminGameplay } from "../data/mock";
import { getGameplays } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Switch } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function GameplayForm({ id, item, useMock, onSaved }: { id: number; item?: AdminGameplay; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const g = item ?? (id ? GAMEPLAYS.find((x) => x.id === id) : undefined);
  const [name, setName] = useState(g?.name ?? "");
  const [desc, setDesc] = useState(g?.desc ?? "");
  const [uses, setUses] = useState(g?.uses ?? "0");
  const [prompt, setPrompt] = useState(g?.prompt ?? "");
  const [imageUrl, setImageUrl] = useState(g?.imageUrl ?? "");
  const [hot, setHot] = useState(g?.hot ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    if (!prompt.trim()) { toast("请输入关联提示词模板"); return; }
    if (!imageUrl) { toast("请上传玩法封面"); return; }
    setSaving(true);
    try {
      if (useMock) {
        if (g) Object.assign(g, { name: name.trim(), desc, prompt: prompt.trim(), uses: uses.trim() || "0", hot, imageUrl });
        else GAMEPLAYS.push({ id: nextId(GAMEPLAYS), name: name.trim(), desc, prompt: prompt.trim(), hot, uses: uses.trim() || "0", imageUrl, on: true });
      } else {
        await apiSaveGameplay(id, { name: name.trim(), desc, prompt: prompt.trim(), uses: uses.trim() || "0", hot, imageUrl, on: g?.on ?? true });
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
      <label className="field-label">玩法名称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：人物美颜" />
      <label className="field-label" style={{ marginTop: 12 }}>玩法描述</label>
      <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="一句话介绍该玩法" />
      <label className="field-label" style={{ marginTop: 12 }}>使用人数</label>
      <input className="input" value={uses} onChange={(e) => setUses(e.target.value)} placeholder="如：8600 或 12.6w" />
      <label className="field-label" style={{ marginTop: 12 }}>关联提示词模板</label>
      <textarea className="input" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="预设提示词" />
      <label className="field-label" style={{ marginTop: 12 }}>玩法封面</label>
      <ConfigImagePicker value={imageUrl} scene="gameplay" useMock={useMock} disabled={saving} onChange={setImageUrl} />
      <div className="kv" style={{ marginTop: 8 }}>
        <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>标记为 HOT</span>
        <Switch on={hot} onToggle={() => setHot((v) => !v)} />
      </div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsGameplay() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminGameplay[]>(useMock ? null : () => apiGetGameplays(), [useMock]);
  const gameplays = useMock ? getGameplays() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑玩法" : "新增玩法", <GameplayForm id={id} item={gameplays.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (g: AdminGameplay) => {
    const next = !g.on;
    try {
      if (useMock) {
        g.on = next;
        refresh();
      } else {
        await apiSetGameplayEnabled(g.id, next);
        reload();
      }
      toast(next ? "已启用" : "已停用");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    }
  };
  const del = (g: AdminGameplay) => confirmDlg("删除玩法", "确定删除该玩法吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = gameplays.findIndex((x) => x.id === g.id);
          if (i > -1) gameplays.splice(i, 1);
          refresh();
        } else {
          await apiDeleteGameplay(g.id);
          reload();
        }
        toast("已删除");
      } catch (e) {
        toast(e instanceof Error ? e.message : "删除失败");
      }
    })();
  }, true);

  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="玩法模板" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(0)}>新增玩法模板</Button>}><Table<AdminGameplay> rowKey="id" loading={loading} dataSource={gameplays} pagination={false} scroll={{ x: 1100 }} locale={{ emptyText: error || "暂无玩法模板" }} columns={[
    { title: "玩法", width: 300, render: (_, gameplay) => <Space align="start"><AdminImage className="lumi-table-image" src={gameplay.thumbnailUrl || gameplay.imageUrl || IMG("gp" + gameplay.id)} style={{ width: 48, height: 48 }} alt="" /><div><Space size={4}><Typography.Text strong>{gameplay.name}</Typography.Text>{gameplay.hot ? <Tag color="red">HOT</Tag> : null}</Space><Typography.Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ margin: "3px 0 0", maxWidth: 210 }}>{gameplay.desc}</Typography.Paragraph></div></Space> },
    { title: "预设提示词", width: 320, dataIndex: "prompt", render: (prompt) => <Typography.Paragraph ellipsis={{ rows: 2, tooltip: prompt }} type="secondary" style={{ margin: 0, maxWidth: 300 }}>{prompt}</Typography.Paragraph> },
    { title: "使用人数", dataIndex: "uses", width: 130 },
    { title: "启用", dataIndex: "on", width: 90, render: (_, gameplay) => <AntSwitch checked={gameplay.on} onChange={() => void toggle(gameplay)} /> },
    { title: "操作", width: 160, render: (_, gameplay) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(gameplay.id)}>编辑</Button><Button type="link" danger onClick={() => del(gameplay)}>删除</Button></Space> }
  ]} /></Card></div>;
}
