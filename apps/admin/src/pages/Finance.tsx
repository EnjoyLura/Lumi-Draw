import { useAdminSession } from "../data/adminSession";
import { apiGetFinanceSummary, type AdminFinanceSummary } from "../data/api";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatCard } from "../ui";

const MOCK_SUMMARY: AdminFinanceSummary = {
  todayIncomeFen: 560000,
  monthIncomeFen: 12800000,
  totalIncomeFen: 186000000,
  monthRefundFen: 86000,
  paidOrders: 0,
  pendingOrders: 0
};

function money(fen: number) {
  const yuan = fen / 100;
  if (yuan >= 10000) return `¥${Math.round(yuan / 1000) / 10}w`;
  return `¥${yuan.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function Finance() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const summaryState = useAsyncData<AdminFinanceSummary>(useMock ? null : apiGetFinanceSummary, [useMock]);
  const summary = useMock ? MOCK_SUMMARY : summaryState.data ?? { ...MOCK_SUMMARY, todayIncomeFen: 0, monthIncomeFen: 0, totalIncomeFen: 0, monthRefundFen: 0 };
  const items: Array<[string, string, string, string]> = [
    ["finRecharge", "充值方案", "ri-coins-line", "#F59E0B"],
    ["finMember", "会员方案", "ri-vip-crown-line", "#8B7FD6"],
    ["finCheckin", "签到配置", "ri-calendar-check-line", "#6FD4B0"],
    ["finInvite", "邀请配置", "ri-user-add-line", "#5B9FE8"],
    ["finTxn", "交易记录", "ri-exchange-funds-line", "#EF4444"],
    ["setBase", "积分基础配置", "ri-settings-4-line", "#6FD4B0"]
  ];
  return (
    <>
      {!useMock && summaryState.loading ? <div className="empty" style={{ minHeight: 72 }}>财务数据加载中...</div> : null}
      {!useMock && summaryState.error ? (
        <div className="empty" style={{ minHeight: 96 }}>
          <i className="ri-error-warning-line" />
          <div className="et">财务数据加载失败</div>
          <button className="btn btn-soft btn-sm" onClick={summaryState.reload}>重新加载</button>
        </div>
      ) : null}
      <div className="stat-grid" style={{ marginBottom: 4 }}>
        <StatCard label="今日收入" val={money(summary.todayIncomeFen)} delta={0} icon="ri-money-cny-circle-line" color="#EF4444" soft="var(--danger-soft)" />
        <StatCard label="本月收入" val={money(summary.monthIncomeFen)} delta={0} icon="ri-line-chart-line" color="#6FD4B0" soft="var(--success-soft)" />
        <StatCard label="累计收入" val={money(summary.totalIncomeFen)} delta={0} icon="ri-bank-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="本月退款" val={money(summary.monthRefundFen)} delta={0} icon="ri-refund-2-line" color="#F59E0B" soft="var(--warning-soft)" />
      </div>
      <div style={{ height: 14 }} />
      <div className="card">
        {items.map(([id, title, icon, color]) => (
          <div key={id} className="lrow" onClick={() => go(id)}>
            <div className="lr-ico" style={{ background: `${color}22`, color }}><i className={icon} /></div>
            <div className="lr-main"><div className="lr-t">{title}</div></div>
            <i className="ri-arrow-right-s-line lr-arrow" />
          </div>
        ))}
      </div>
    </>
  );
}
