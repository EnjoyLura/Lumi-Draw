import { useState } from "react";
import { userName } from "../data/mock";
import { getWorks } from "../data/service";
import { Chips, SearchBar, StatCard, WorkCard } from "../ui";

const FILTERS = ["全部", "已发布", "待审核", "已下架", "精选"];

export function Works() {
  const works = getWorks();
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");

  const q = query.toLowerCase();
  const list = works.filter((w) => {
    if (filter === "精选") { if (!w.featured) return false; }
    else if (filter !== "全部" && w.status !== filter) return false;
    if (q && (w.title || "").toLowerCase().indexOf(q) < 0 && w.prompt.toLowerCase().indexOf(q) < 0 && userName(w.userId).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 4 }}>
        <StatCard label="总作品" val="48,620" delta={15} icon="ri-image-2-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="今日新增" val="1,380" delta={11} icon="ri-add-box-line" color="#6FD4B0" soft="var(--success-soft)" />
        <StatCard label="精选作品" val="326" delta={5} icon="ri-star-line" color="#F59E0B" soft="var(--warning-soft)" />
        <StatCard label="已下架" val="142" delta={-2} icon="ri-eye-off-line" color="#9AA5B4" soft="var(--bg-soft)" />
      </div>
      <div style={{ height: 14 }} />
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
