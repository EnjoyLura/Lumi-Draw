import { TREND, WEEK } from "../data/mock";
import { apiGetDashboardDetail, type AdminDashboardDetail } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { BarChart, Sec } from "../ui";

interface Drill {
  name: string;
  unit: string;
  key: string;
  mockKey: keyof typeof TREND;
  grad: string;
}

export const DRILL: Record<string, Drill> = {
  newUsers: { name: "新增用户", unit: "人", key: "newUsers", mockKey: "users", grad: "linear-gradient(180deg,#7BB8F0,#5B9FE8)" },
  totalUsers: { name: "总用户", unit: "人", key: "totalUsers", mockKey: "users", grad: "linear-gradient(180deg,#7BB8F0,#5B9FE8)" },
  newWorks: { name: "新增作品", unit: "件", key: "newWorks", mockKey: "works", grad: "linear-gradient(180deg,#8FE0C4,#6FD4B0)" },
  totalWorks: { name: "总作品", unit: "件", key: "totalWorks", mockKey: "works", grad: "linear-gradient(180deg,#FF9AA8,#EF4444)" },
  users: { name: "新增用户", unit: "人", key: "newUsers", mockKey: "users", grad: "linear-gradient(180deg,#7BB8F0,#5B9FE8)" },
  active: { name: "总用户", unit: "人", key: "totalUsers", mockKey: "users", grad: "linear-gradient(180deg,#7BB8F0,#5B9FE8)" },
  works: { name: "新增作品", unit: "件", key: "newWorks", mockKey: "works", grad: "linear-gradient(180deg,#8FE0C4,#6FD4B0)" },
  income: { name: "今日收入", unit: "元", key: "income", mockKey: "income", grad: "linear-gradient(180deg,#FF9AA8,#EF4444)" }
};

const MOCK_TOTALS = {
  totalUsers: [11215, 11360, 11492, 11670, 11880, 12076, 12486],
  totalWorks: [41890, 42810, 43860, 44840, 45960, 47200, 48620]
};

function mockSeries(d: Drill) {
  if (d.key === "totalUsers") return MOCK_TOTALS.totalUsers;
  if (d.key === "totalWorks") return MOCK_TOTALS.totalWorks;
  return TREND[d.mockKey];
}

function mockTotal(d: Drill, data: number[]) {
  if (d.key === "newUsers" || d.key === "newWorks") return data[data.length - 1] ?? 0;
  return data[data.length - 1] ?? data.reduce((a, b) => a + b, 0);
}

export function DataDetail({ param }: { param?: string }) {
  const d = DRILL[param ?? ""] || DRILL.users;
  const { useMock } = useAdminSession();
  const isIncome = d.key === "income";
  const shouldLoad = !useMock && !isIncome;
  const { data: detail, loading, error } = useAsyncData<AdminDashboardDetail>(shouldLoad ? () => apiGetDashboardDetail(d.key) : null, [shouldLoad, d.key]);
  const data = useMock || isIncome ? mockSeries(d) : detail?.series ?? [];
  const labels = useMock || isIncome ? WEEK : detail?.labels ?? [];
  const sum = useMock || isIncome ? mockTotal(d, data) : detail?.total ?? 0;

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载数据中</div></div> : null}
        {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
        <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>{d.name} · 近7日趋势</div>
        <div style={{ fontSize: 28, fontWeight: 800, margin: "4px 0" }}>{isIncome ? "¥" : ""}{sum.toLocaleString()}</div>
        <BarChart data={data} labels={labels} grad={d.grad} />
      </div>

      <Sec title="每日明细" />
      <div className="card">
        {labels.map((w, i) => (
          <div key={w} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-main"><div className="lr-t">{w}</div></div>
            <span style={{ fontWeight: 700 }}>{isIncome ? "¥" : ""}{data[i].toLocaleString()}{isIncome ? "" : ` ${d.unit}`}</span>
          </div>
        ))}
      </div>
    </>
  );
}
