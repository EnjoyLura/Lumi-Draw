import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Space, Table, Typography } from "antd";
import { useState } from "react";
import { ConfigImagePicker } from "../components/ConfigImagePicker";
import { AdminImage } from "../components/AdminImage";
import { apiDeleteStyle, apiGetStyles, apiSaveStyle } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, nextId, STYLES, type AdminStyle } from "../data/mock";
import { getStyles } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { SortCtrl } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function StyleForm({ id, item, useMock, onSaved }: { id: number; item?: AdminStyle; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const s = item ?? (id ? STYLES.find((x) => x.id === id) : undefined);
  const [name, setName] = useState(s?.n ?? "");
  const [prompt, setPrompt] = useState(s?.prompt ?? "");
  const [uses, setUses] = useState(String(s?.s ?? 0));
  const [imageUrl, setImageUrl] = useState(s?.imageUrl ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    if (!imageUrl) { toast("请上传风格封面"); return; }
    const n = name.trim();
    const val = parseInt(uses) || 0;
    setSaving(true);
    try {
      if (useMock) {
        if (s) { s.n = n; s.prompt = prompt; s.s = val; s.imageUrl = imageUrl; }
        else STYLES.push({ id: nextId(STYLES), n, s: val, prompt, imageUrl });
      } else {
        await apiSaveStyle(id, { n, prompt, s: val, imageUrl });
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
      <label className="field-label">风格名称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：赛博朋克" />
      <label className="field-label" style={{ marginTop: 12 }}>风格提示词</label>
      <textarea className="input" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="应用该风格时追加的提示词，如：cyberpunk style, neon lights" />
      <label className="field-label" style={{ marginTop: 12 }}>使用次数</label>
      <input className="input" type="number" value={uses} onChange={(e) => setUses(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>封面图</label>
      <ConfigImagePicker value={imageUrl} scene="style" useMock={useMock} disabled={saving} onChange={setImageUrl} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsStyle() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminStyle[]>(useMock ? null : () => apiGetStyles(), [useMock]);
  const styles = useMock ? getStyles() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑风格" : "新增风格", <StyleForm id={id} item={styles.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const del = (s: AdminStyle) => confirmDlg("删除风格", "确定删除该风格吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = styles.findIndex((x) => x.id === s.id);
          if (i > -1) styles.splice(i, 1);
          refresh();
        } else {
          await apiDeleteStyle(s.id);
          reload();
        }
        toast("已删除");
      } catch (e) {
        toast(e instanceof Error ? e.message : "删除失败");
      }
    })();
  }, true);
  const move = async (i: number, dir: number) => {
    moveItem(styles, i, dir);
    if (useMock) refresh();
    else {
      await Promise.all(styles.map((s, idx) => apiSaveStyle(s.id, { ...s, sort: idx + 1 })));
      reload();
    }
  };

  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="创作风格" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(0)}>新增风格</Button>}><Table<AdminStyle> rowKey="id" loading={loading} dataSource={styles} pagination={false} scroll={{ x: 1040 }} locale={{ emptyText: error || "暂无风格" }} columns={[
    { title: "风格", width: 260, render: (_, style) => <Space align="start"><AdminImage className="lumi-table-image" src={style.thumbnailUrl || style.imageUrl || IMG("st" + style.n)} style={{ width: 48, height: 48 }} alt="" /><div><Typography.Text strong>{style.n}</Typography.Text><Typography.Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ margin: "3px 0 0", maxWidth: 180 }}>{style.prompt || "未设置提示词"}</Typography.Paragraph></div></Space> },
    { title: "使用次数", dataIndex: "s", width: 150, render: (count) => `${Number(count || 0).toLocaleString("zh-CN")} 次` },
    { title: "排序", width: 170, render: (_, __, index) => <Space><Typography.Text type="secondary">{index + 1}</Typography.Text><SortCtrl index={index} len={styles.length} onMove={(direction) => void move(index, direction)} /></Space> },
    { title: "操作", width: 160, render: (_, style) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(style.id)}>编辑</Button><Button type="link" danger onClick={() => del(style)}>删除</Button></Space> }
  ]} /></Card></div>;
}
