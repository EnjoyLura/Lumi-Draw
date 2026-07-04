import { TREND, WEEK } from "../data/mock";
import { BarChart, Sec } from "../ui";

interface Drill {
  name: string;
  unit: string;
  key: keyof typeof TREND;
  grad: string;
}

export const DRILL: Record<string, Drill> = {
  users: { name: "新增用户", unit: "人", key: "users", grad: "linear-gradient(180deg,#7BB8F0,#5B9FE8)" },
  active: { name: "活跃用户", unit: "人", key: "users", grad: "linear-gradient(180deg,#7BB8F0,#5B9FE8)" },
  works: { name: "新增作品", unit: "件", key: "works", grad: "linear-gradient(180deg,#8FE0C4,#6FD4B0)" },
  income: { name: "今日收入", unit: "元", key: "income", grad: "linear-gradient(180deg,#FF9AA8,#EF4444)" }
};

export function DataDetail({ param }: { param?: string }) {
  const d = DRILL[param ?? ""] || DRILL.users;
  const data = TREND[d.key];
  const sum = data.reduce((a, b) => a + b, 0);
  const isIncome = d.key === "income";

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>{d.name} · 近7日累计</div>
        <div style={{ fontSize: 28, fontWeight: 800, margin: "4px 0" }}>{isIncome ? "¥" : ""}{sum.toLocaleString()}</div>
        <BarChart data={data} labels={WEEK} grad={d.grad} />
      </div>

      <Sec title="每日明细" />
      <div className="card">
        {WEEK.map((w, i) => (
          <div key={w} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-main"><div className="lr-t">{w}</div></div>
            <span style={{ fontWeight: 700 }}>{isIncome ? "¥" : ""}{data[i].toLocaleString()}{isIncome ? "" : ` ${d.unit}`}</span>
          </div>
        ))}
      </div>
    </>
  );
}
