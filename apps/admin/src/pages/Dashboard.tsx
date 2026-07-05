import { useState } from "react";
import { WEEK } from "../data/mock";
import { apiGetDashboardTrends, apiGetModels, apiGetStyles, type AdminDashboardTrends } from "../data/api";
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

export function Dashboard() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const [trendKey, setTrendKey] = useState("users");
  const trendsState = useAsyncData<AdminDashboardTrends>(useMock ? null : () => apiGetDashboardTrends(), [useMock]);
  const modelsState = useAsyncData(useMock ? null : () => apiGetModels(), [useMock]);
  const stylesState = useAsyncData(useMock ? null : () => apiGetStyles(), [useMock]);
  const mockTrend = useMock ? getTrend() : null;
  const trend = useMock ? { labels: WEEK, users: mockTrend!.users, works: mockTrend!.works, income: mockTrend!.income } : trendsState.data ?? { labels: [], users: [], works: [], income: [] };
  const models = useMock ? getModels() : modelsState.data ?? [];
  const styles = useMock ? getStyles() : stylesState.data ?? [];
  const sMax = Math.max(1, ...styles.map((s) => s.s));
  const trendData = trend[trendKey as keyof Omit<AdminDashboardTrends, "labels">] ?? [];

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
        <StatCard label="今日 vs 昨日 · 收入" val="¥5,600" delta={24} icon="ri-money-cny-circle-line" color="#EF4444" soft="var(--danger-soft)" />
        <StatCard label="本周 vs 上周 · 用户" val="1,271" delta={9} icon="ri-team-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="今日 vs 昨日 · 作品" val="1,380" delta={11} icon="ri-image-line" color="#8B7FD6" soft="var(--purple-soft)" />
        <StatCard label="本周 vs 上周 · 转化" val="3.2%" delta={-2} icon="ri-exchange-line" color="#6FD4B0" soft="var(--success-soft)" />
      </div>

      <Sec title="模型使用占比" />
      <div className="card" style={{ padding: 14 }}>
        {modelsState.loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载模型中</div></div> : null}
        {modelsState.error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{modelsState.error}</div></div> : null}
        {models.map((m, i) => (
          <RankBar key={m.id} name={m.name} val={MODEL_USE[i]} max={3200} color={MODEL_COLORS[i % MODEL_COLORS.length]} />
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
        <RankBar name="1K 全高清" val={5400} max={9000} color="#6FD4B0" />
        <RankBar name="2K 超清" val={9000} max={9000} color="#5B9FE8" />
        <RankBar name="4K 超高清" val={3200} max={9000} color="#8B7FD6" />
      </div>
    </>
  );
}
