import { useState } from "react";
import { userName, type AdminWork } from "../data/mock";
import { getWorks } from "../data/service";
import { apiFeatureWork, apiGetWorks, apiGetWorksSummary, apiRecommendWork, type AdminWorksSummary } from "../data/api";
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
  const { openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, reload } = useAsyncData(useMock ? null : apiGetWorks, [useMock]);
  const summaryState = useAsyncData(useMock ? null : apiGetWorksSummary, [useMock]);
  const works = useMock ? getWorks() : data ?? [];
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [workOverrides, setWorkOverrides] = useState<Record<number, Pick<AdminWork, "featured" | "recommend">>>({});
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const displayedWorks = works.map((work) => ({ ...work, ...workOverrides[work.id] }));
  const localSummary: AdminWorksSummary = {
    total: displayedWorks.length,
    todayNew: displayedWorks.filter((w) => isToday(w.time)).length,
    featured: displayedWorks.filter((w) => w.featured).length,
    offline: displayedWorks.filter((w) => w.status === "已下架").length
  };
  const summary = useMock ? localSummary : summaryState.data ?? localSummary;
  const afterPublished = () => {
    reload();
    summaryState.reload();
  };

  const q = query.toLowerCase();
  const list = displayedWorks.filter((w) => {
    if (filter === "精选") { if (!w.featured) return false; }
    else if (filter === "首页推荐") { if (!w.recommend) return false; }
    else if (filter !== "全部" && w.status !== filter) return false;
    if (q && (w.title || "").toLowerCase().indexOf(q) < 0 && w.prompt.toLowerCase().indexOf(q) < 0 && userName(w.userId).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });

  async function toggleWorkOperation(work: AdminWork, key: "featured" | "recommend") {
    const operationKey = `${work.id}:${key}`;
    if (pendingOperations.has(operationKey)) return;

    const previous = { featured: Boolean(work.featured), recommend: Boolean(work.recommend) };
    const next = !previous[key];
    setWorkOverrides((current) => ({ ...current, [work.id]: { ...previous, ...current[work.id], [key]: next } }));
    setPendingOperations((current) => new Set(current).add(operationKey));

    try {
      if (useMock) {
        const mockWork = works.find((item) => item.id === work.id);
        if (mockWork) mockWork[key] = next;
      } else {
        const updated = key === "featured"
          ? await apiFeatureWork(work.id, next)
          : await apiRecommendWork(work.id, next);
        setWorkOverrides((current) => ({
          ...current,
          [work.id]: { featured: updated.featured, recommend: updated.recommend }
        }));
        summaryState.reload();
      }
      toast(next ? `已开启${key === "featured" ? "精选" : "首页推荐"}` : `已关闭${key === "featured" ? "精选" : "首页推荐"}`);
    } catch (error) {
      setWorkOverrides((current) => ({ ...current, [work.id]: previous }));
      toast(error instanceof Error ? error.message : "操作失败，请稍后重试");
    } finally {
      setPendingOperations((current) => {
        const nextPending = new Set(current);
        nextPending.delete(operationKey);
        return nextPending;
      });
    }
  }

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
          list.map((w) => (
            <WorkCard
              key={w.id}
              w={w}
              operations={{
                featuredPending: pendingOperations.has(`${w.id}:featured`),
                recommendPending: pendingOperations.has(`${w.id}:recommend`),
                onToggleFeatured: () => void toggleWorkOperation(w, "featured"),
                onToggleRecommend: () => void toggleWorkOperation(w, "recommend")
              }}
            />
          ))
        )}
      </div>
    </>
  );
}
