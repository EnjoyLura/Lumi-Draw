import { EditOutlined, FireOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { apiDeleteHotSearch, apiGetHotSearches, apiSaveHotSearch } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { HOT_SEARCHES, nextId, type AdminHotSearch } from "../data/mock";
import { getHotSearches } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { SortCtrl, Switch } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function HotForm({ id, item, useMock, onSaved, nextSort }: { id: number; item?: AdminHotSearch; useMock: boolean; onSaved: () => void; nextSort: number }) {
  const { closeSheet, toast } = useNav();
  const s = item ?? (id ? HOT_SEARCHES.find((x) => x.id === id) : undefined);
  const [k, setK] = useState(s?.k ?? "");
  const [top, setTop] = useState(s?.top ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!k.trim()) { toast("请输入关键词"); return; }
    setSaving(true);
    try {
      if (useMock) {
        if (s) { s.k = k.trim(); s.top = top; }
        else HOT_SEARCHES.push({ id: nextId(HOT_SEARCHES), k: k.trim(), top, hot: 0, sort: HOT_SEARCHES.length + 1 });
      } else {
        await apiSaveHotSearch(id, { k: k.trim(), top, hot: s?.hot ?? 0, sort: s?.sort ?? nextSort });
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
      <label className="field-label">关键词</label>
      <input className="input" value={k} onChange={(e) => setK(e.target.value)} placeholder="如：赛博朋克" />
      <div className="kv" style={{ marginTop: 8 }}>
        <span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>置顶显示</span>
        <Switch on={top} onToggle={() => setTop((v) => !v)} />
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 10, lineHeight: 1.5 }}>展示顺序通过列表的上移/下移调整。</div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsHotSearch() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminHotSearch[]>(useMock ? null : () => apiGetHotSearches(), [useMock]);
  const hots = useMock ? getHotSearches() : data ?? [];
  const [sorting, setSorting] = useState(false);
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑热搜" : "新增热搜", <HotForm id={id} item={hots.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} nextSort={hots.length + 1} />);
  const moveHotSearch = async (index: number, dir: number) => {
    if (sorting) return;
    const next = [...hots];
    moveItem(next, index, dir);
    next.forEach((item, idx) => {
      item.sort = idx + 1;
    });
    if (useMock) {
      hots.splice(0, hots.length, ...next);
      refresh();
      return;
    }
    setSorting(true);
    try {
      await Promise.all(next.map((item) => apiSaveHotSearch(item.id, { k: item.k, hot: item.hot, top: item.top, sort: item.sort })));
      reload();
      toast("顺序已保存");
    } catch (e) {
      toast(e instanceof Error ? e.message : "顺序保存失败");
    } finally {
      setSorting(false);
    }
  };
  const del = (s: AdminHotSearch) => confirmDlg("删除热搜词", "确定删除该热搜词吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = hots.findIndex((x) => x.id === s.id);
          if (i > -1) hots.splice(i, 1);
          refresh();
        } else {
          await apiDeleteHotSearch(s.id);
          reload();
        }
        toast("已删除");
      } catch (e) {
        toast(e instanceof Error ? e.message : "删除失败");
      }
    })();
  }, true);

  return <div className="lumi-admin-page"><Card className="lumi-table-card" title="热门搜索词" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(0)}>新增热搜词</Button>}><Table<AdminHotSearch> rowKey="id" loading={loading || sorting} dataSource={hots} pagination={false} locale={{ emptyText: error || "暂无热搜词" }} columns={[
    { title: "排序", width: 100, render: (_, __, index) => <Typography.Text strong>#{index + 1}</Typography.Text> },
    { title: "关键词", dataIndex: "k", render: (keyword, item) => <Space><span className="lumi-table-icon"><FireOutlined /></span><Typography.Text strong>{keyword}</Typography.Text>{item.top ? <Tag color="red">置顶</Tag> : null}</Space> },
    { title: "热度", dataIndex: "hot", width: 160, render: (hot) => hot ? hot.toLocaleString("zh-CN") : "—" },
    { title: "优先级", width: 170, render: (_, __, index) => <SortCtrl index={index} len={hots.length} onMove={(direction) => void moveHotSearch(index, direction)} /> },
    { title: "操作", width: 160, render: (_, item) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(item.id)}>编辑</Button><Button type="link" danger onClick={() => del(item)}>删除</Button></Space> }
  ]} /></Card></div>;
}
