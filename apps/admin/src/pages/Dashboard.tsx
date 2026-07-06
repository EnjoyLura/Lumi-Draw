import { useState } from "react";
import { WEEK } from "../data/mock";
import {
  apiGetDashboardTrends,
  apiGetFinanceSummary,
  apiGetGenerationStats,
  apiGetModels,
  apiGetStyles,
  type AdminDashboardTrends,
  type AdminFinanceSummary,
  type AdminGenerationStats
} from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { getModels, getStyles, getTrend } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { BarChart, RankBar, Sec, Seg, StatCard } from "../ui";

const TREND_GRAD: Record<string, string> = {
  users: "linear-gradient(180deg,#7BB8F0,#5B9FE8)",
  works: "linear-gradient(180deg,#8FE0C4,#6FD4B0)",
  income: "linear-gradient(180deg,#FF9AA8,#EF4444)"
};

const MODEL_USE = [3200, 2800, 1900, 1500, 600, 2100];
const MODEL_COLORS = ["#5B9FE8", "#6FD4B0", "#8B7FD6", "#F59E0B", "#EF4444", "#FFA8B8"];

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function money(fen: number) {
  const yuan = fen / 100;
  if (yuan >= 10000) return `¥${Math.round(yuan / 1000) / 10}w`;
  return `¥${yuan.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function Dashboard() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const [trendKey, setTrendKey] = useState("users");
  const trendsState = useAsyncData<AdminDashboardTrends>(useMock ? null : () => apiGetDashboardTrends(), [useMock]);
  const financeState = useAsyncData<AdminFinanceSummary>(useMock ? null : () => apiGetFinanceSummary(), [useMock]);
  const generationState = useAsyncData<AdminGenerationStats>(useMock ? null : () => apiGetGenerationStats(), [useMock]);
  const modelsState = useAsyncData(useMock ? null : () => apiGetModels(), [useMock]);
  const stylesState = useAsyncData(useMock ? null : () => apiGetStyles(), [useMock]);
  const mockTrend = useMock ? getTrend() : null;
  const trend = useMock ? { labels: WEEK, users: mockTrend!.users, works: mockTrend!.works, income: mockTrend!.income } : trendsState.data ?? { labels: [], users: [], works: [], income: [] };
  const models = useMock ? getModels() : modelsState.data ?? [];
  const styles = useMock ? getStyles() : stylesState.data ?? [];
  const sMax = Math.max(1, ...styles.map((s) => s.s));
  const trendData = trend[trendKey as keyof Omit<AdminDashboardTrends, "labels">] ?? [];
  const todayWorks = trend.works.length ? trend.works[trend.works.length - 1] : 0;
  const weeklyUsers = trend.users.reduce((sum, value) => sum + value, 0);
  const todayIncomeFen = useMock ? 560000 : financeState.data?.todayIncomeFen ?? 0;
  const modelUse = useMock
    ? new Map(models.map((model, index) => [model.id, MODEL_USE[index] ?? 0]))
    : new Map((generationState.data?.models ?? []).map((item) => [item.id, item.count]));
  const modelMax = Math.max(1, ...models.map((model) => modelUse.get(model.id) ?? 0));
  const qualityRows = useMock
    ? [
        { name: "1K 全高清", count: 5400 },
        { name: "2K 超清", count: 9000 },
        { name: "4K 超高清", count: 3200 }
      ]
    : generationState.data?.qualities ?? [];
  const qualityMax = Math.max(1, ...qualityRows.map((item) => item.count));
  const conversionRate = useMock ? 3.2 : generationState.data?.conversionRate ?? 0;

  return (
    <>
      <Sec title="数据趋势（近7日）" />
      <div className="card" style={{ padding: 14 }}>
        {trendsState.loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载趋势中</div></div> : null}
        {trendsState.error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{trendsState.error}</div></div> : null}
        <Seg
          items={[["users", "用户"], ["works", "作品"], ["income", "收入"]]}
          active={trendKey}
          onPick={setTrendKey}
        />
        <BarChart data={trendData} labels={trend.labels} grad={TREND_GRAD[trendKey]} />
      </div>

      <Sec title="数据对比" />
      <div className="stat-grid">
        <StatCard label="今日收入" val={money(todayIncomeFen)} delta={0} icon="ri-money-cny-circle-line" color="#EF4444" soft="var(--danger-soft)" />
        <StatCard label="近7日新增用户" val={formatCount(weeklyUsers)} delta={0} icon="ri-team-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="今日新增作品" val={formatCount(todayWorks)} delta={0} icon="ri-image-line" color="#8B7FD6" soft="var(--purple-soft)" />
        <StatCard label="转化率" val={`${conversionRate}%`} delta={0} icon="ri-exchange-line" color="#6FD4B0" soft="var(--success-soft)" />
      </div>

      <Sec title="模型使用占比" />
      <div className="card" style={{ padding: 14 }}>
        {modelsState.loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载模型中</div></div> : null}
        {modelsState.error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{modelsState.error}</div></div> : null}
        {models.map((m, i) => (
          <RankBar key={m.id} name={m.name} val={modelUse.get(m.id) ?? 0} max={modelMax} color={MODEL_COLORS[i % MODEL_COLORS.length]} />
        ))}
      </div>

      <Sec title="风格 TOP" more="查看全部" onMore={() => go("opsStyle")} />
      <div className="card" style={{ padding: 14 }}>
        {stylesState.loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载风格中</div></div> : null}
        {stylesState.error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{stylesState.error}</div></div> : null}
        {styles.slice(0, 5).map((s, i) => (
          <RankBar key={s.id} name={`${i + 1}. ${s.n}`} val={s.s} max={sMax} color="linear-gradient(90deg,#7BB8F0,#5B9FE8)" />
        ))}
      </div>

      <Sec title="分辨率分布" />
      <div className="card" style={{ padding: 14 }}>
        {generationState.loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载分布中</div></div> : null}
        {generationState.error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{generationState.error}</div></div> : null}
        {qualityRows.length ? qualityRows.map((item, index) => (
          <RankBar key={item.name} name={item.name} val={item.count} max={qualityMax} color={MODEL_COLORS[index % MODEL_COLORS.length]} />
        )) : <div className="empty"><i className="ri-bar-chart-line" /><div className="et">暂无分辨率数据</div></div>}
      </div>
    </>
  );
}
