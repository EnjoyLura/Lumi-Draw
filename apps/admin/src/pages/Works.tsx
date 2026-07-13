import { useState } from "react";
import { userName } from "../data/mock";
import { getWorks } from "../data/service";
import { apiGetWorks, apiGetWorksSummary, type AdminWorksSummary } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Chips, SearchBar, StatCard, WorkCard } from "../ui";
import { WorkUploadForm } from "./WorkUploadForm";

const FILTERS = ["全部", "已发布", "待审核", "已下架", "精选", "首页推荐"];

function isToday(dateText: string) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function Works() {
  const { openSheet } = useNav();
  const { useMock } = useAdminSession();
  const { data, reload } = useAsyncData(useMock ? null : apiGetWorks, [useMock]);
  const summaryState = useAsyncData(useMock ? null : apiGetWorksSummary, [useMock]);
  const works = useMock ? getWorks() : data ?? [];
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const localSummary: AdminWorksSummary = {
    total: works.length,
    todayNew: works.filter((w) => isToday(w.time)).length,
    featured: works.filter((w) => w.featured).length,
    offline: works.filter((w) => w.status === "已下架").length
  };
  const summary = useMock ? localSummary : summaryState.data ?? localSummary;
  const afterPublished = () => {
    reload();
    summaryState.reload();
  };

  const q = query.toLowerCase();
  const list = works.filter((w) => {
    if (filter === "精选") { if (!w.featured) return false; }
    else if (filter === "首页推荐") { if (!w.recommend) return false; }
    else if (filter !== "全部" && w.status !== filter) return false;
    if (q && (w.title || "").toLowerCase().indexOf(q) < 0 && w.prompt.toLowerCase().indexOf(q) < 0 && userName(w.userId).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 4 }}>
        <StatCard label="总作品" val={formatCount(summary.total)} icon="ri-image-2-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="今日新增" val={formatCount(summary.todayNew)} icon="ri-add-box-line" color="#6FD4B0" soft="var(--success-soft)" />
        <StatCard label="精选作品" val={formatCount(summary.featured)} icon="ri-star-line" color="#F59E0B" soft="var(--warning-soft)" />
        <StatCard label="已下架" val={formatCount(summary.offline)} icon="ri-eye-off-line" color="#9AA5B4" soft="var(--bg-soft)" />
      </div>
      <div style={{ height: 14 }} />
      <AddBtn text="上传并发布作品" onClick={() => openSheet("上传并发布作品", <WorkUploadForm useMock={useMock} onPublished={afterPublished} />)} />
      <SearchBar value={query} onChange={setQuery} placeholder="搜索作品标题 / 提示词 / 作者" />
      <Chips items={FILTERS} active={filter} onPick={setFilter} />
      {query ? (
        <div style={{ fontSize: 12, color: "var(--fg-muted)", margin: "0 2px 8px" }}>搜索“{query}” · {list.length} 个结果</div>
      ) : null}
      <div className="wgrid">
        {list.length === 0 ? (
          <div className="empty" style={{ gridColumn: "1/-1" }}><i className="ri-image-line" /><div className="et">暂无匹配作品</div></div>
        ) : (
          list.map((w) => <WorkCard key={w.id} w={w} />)
        )}
      </div>
    </>
  );
}
