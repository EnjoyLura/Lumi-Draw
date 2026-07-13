import { useState } from "react";
import { apiGetPaymentOrders } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { userName, type AdminTxn } from "../data/mock";
import { getTransactions } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Chips, StatusBadge } from "../ui";

const TXN_ICO: Record<string, string> = { 充值: "arrow-down-line", 会员: "vip-crown-line", 签到: "calendar-check-line", 退款: "refund-2-line", 消费: "arrow-up-line" };
const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function txnColor(type: string) {
  if (type === "充值" || type === "会员" || type === "签到") return "#22C55E";
  if (type === "退款") return "#8B7FD6";
  return "#EF4444";
}

function TxnDetail({ t }: { t: AdminTxn }) {
  const { closeSheet, toast } = useNav();
  const refundable = t.type === "充值" && t.status === "成功";
  return (
    <>
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k">交易用户</span><span className="v">{t.userName || userName(t.userId)}</span></div>
        <div className="kv"><span className="k">类型</span><span className="v">{t.type}</span></div>
        <div className="kv"><span className="k">支付金额</span><span className="v">{t.amount}</span></div>
        <div className="kv"><span className="k">到账积分</span><span className="v">{t.credits || "—"}</span></div>
        <div className="kv"><span className="k">状态</span><span className="v">{t.status}</span></div>
        <div className="kv"><span className="k">时间</span><span className="v">{t.time}</span></div>
        <div className="kv"><span className="k">订单号</span><span className="v">{t.orderNo || t.id}</span></div>
        {t.transactionId ? <div className="kv"><span className="k">微信交易号</span><span className="v" style={{ overflowWrap: "anywhere" }}>{t.transactionId}</span></div> : null}
      </div>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>关闭</button>
        {refundable ? <button className="btn btn-danger btn-block" onClick={() => { closeSheet(); toast("微信支付退款需上线前配置商户退款证书"); }}>发起退款</button> : null}
      </div>
    </>
  );
}

export function FinTxn() {
  const { openSheet } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error } = useAsyncData<AdminTxn[]>(useMock ? null : () => apiGetPaymentOrders(), [useMock]);
  const all = useMock ? getTransactions() : data ?? [];
  const [type, setType] = useState("全部");
  const [status, setStatus] = useState("全部");

  const list = all.filter((t) => (type === "全部" || t.type === type) && (status === "全部" || t.status === status));

  return (
    <>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", margin: "0 2px 4px" }}>类型</div>
      <Chips items={["全部", "充值", "会员"]} active={type} onPick={setType} />
      <div style={{ fontSize: 11, color: "var(--fg-muted)", margin: "0 2px 4px" }}>状态</div>
      <Chips items={["全部", "成功", "待支付", "失败", "已退款"]} active={status} onPick={setStatus} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载交易记录中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      {list.length ? <div style={{ fontSize: 12, color: "var(--fg-muted)", margin: "0 2px 8px" }}>共 {list.length} 条记录</div> : null}
      <div className="card">
        {!list.length ? <div className="empty"><i className="ri-exchange-line" /><div className="et">暂无记录</div></div> : null}
        {list.map((t) => {
          const col = txnColor(t.type);
          return (
            <div key={t.id} className="lrow" onClick={() => openSheet("交易详情", <TxnDetail t={t} />)}>
              <div className="lr-ico" style={{ background: `${col}22`, color: col }}><i className={`ri-${TXN_ICO[t.type] || "exchange-line"}`} /></div>
              <div className="lr-main">
                <div className="lr-t">{t.userName || userName(t.userId)} · {t.type}</div>
                <div className="lr-s">{t.time}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: col }}>{t.amount}</div>
                <StatusBadge s={t.status} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
