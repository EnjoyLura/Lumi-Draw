import { useNav } from "../shell/NavContext";
import { StatCard } from "../ui";

export function Finance() {
  const { go } = useNav();
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
      <div className="stat-grid" style={{ marginBottom: 4 }}>
        <StatCard label="今日收入" val="¥5,600" delta={24} icon="ri-money-cny-circle-line" color="#EF4444" soft="var(--danger-soft)" />
        <StatCard label="本月收入" val="¥128k" delta={9} icon="ri-line-chart-line" color="#6FD4B0" soft="var(--success-soft)" />
        <StatCard label="累计收入" val="¥1.86M" delta={0} icon="ri-bank-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="本月退款" val="¥860" delta={-5} icon="ri-refund-2-line" color="#F59E0B" soft="var(--warning-soft)" />
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
