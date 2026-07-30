import { CalendarOutlined, CreditCardOutlined, DollarOutlined, GiftOutlined, SettingOutlined, TeamOutlined, TransactionOutlined, WalletOutlined } from "@ant-design/icons";
import { Alert, Spin } from "antd";
import { AdminFeatureGrid, type AdminFeatureItem } from "../components/AdminFeatureGrid";
import { useAdminSession } from "../data/adminSession";
import { apiGetFinanceSummary, type AdminFinanceSummary } from "../data/api";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatCard } from "../ui";

const MOCK_SUMMARY: AdminFinanceSummary = { todayIncomeFen: 560000, monthIncomeFen: 12800000, totalIncomeFen: 186000000, monthRefundFen: 86000, paidOrders: 0, pendingOrders: 0 };

function money(fen: number) {
  const yuan = fen / 100;
  return yuan >= 10000 ? `¥${Math.round(yuan / 1000) / 10}万` : `¥${yuan.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function Finance() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const summaryState = useAsyncData<AdminFinanceSummary>(useMock ? null : apiGetFinanceSummary, [useMock]);
  const summary = useMock ? MOCK_SUMMARY : summaryState.data ?? { ...MOCK_SUMMARY, todayIncomeFen: 0, monthIncomeFen: 0, totalIncomeFen: 0, monthRefundFen: 0 };
  const items: AdminFeatureItem[] = [
    { id: "finRecharge", title: "充值方案", description: "配置积分档位、赠送积分和展示顺序", icon: <CreditCardOutlined />, color: "#d88900" },
    { id: "finMember", title: "会员方案", description: "管理露米会员权益与订阅价格", icon: <GiftOutlined />, color: "#8b7fd6" },
    { id: "finCheckin", title: "签到配置", description: "设置每日签到与连续签到奖励", icon: <CalendarOutlined />, color: "#22a06b" },
    { id: "finInvite", title: "邀请配置", description: "维护邀请活动和奖励规则", icon: <TeamOutlined />, color: "#5b9fe8" },
    { id: "finTxn", title: "交易记录", description: "查询支付、充值和退款订单", icon: <TransactionOutlined />, color: "#d85c7f" },
    { id: "setBase", title: "积分基础配置", description: "统一管理各场景积分发放规则", icon: <SettingOutlined />, color: "#22a06b" }
  ];
  return (
    <div className="lumi-admin-page">
      {summaryState.error && !useMock ? <Alert showIcon type="error" message="财务数据加载失败" description={summaryState.error} /> : null}
      <Spin spinning={summaryState.loading && !useMock}>
        <div className="lumi-metrics stat-grid">
          <StatCard label="今日收入" val={money(summary.todayIncomeFen)} icon="ri-money-cny-circle-line" color="#d85c7f" soft="#fff0f3" />
          <StatCard label="本月收入" val={money(summary.monthIncomeFen)} icon="ri-line-chart-line" color="#22a06b" soft="#effbf5" />
          <StatCard label="累计收入" val={money(summary.totalIncomeFen)} icon="ri-bank-line" color="#5b9fe8" soft="#eff6ff" />
          <StatCard label="待支付订单" val={summary.pendingOrders.toLocaleString("zh-CN")} icon="ri-time-line" color="#d88900" soft="#fff8e8" />
        </div>
      </Spin>
      <AdminFeatureGrid items={items} onSelect={(id) => go(id, undefined, true)} />
    </div>
  );
}
