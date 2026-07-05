import { api } from "../../services/api";
import type { InvitedUser, MemberPlan, PointRecord, RechargeTier } from "./pointsData";

interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface CreditBalance {
  credits: number;
}

interface CreditRecord {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

interface CheckinStatus {
  checkedToday: boolean;
  continuousDays: number;
  nextCredits: number;
  tiers: Array<{ day: number; credits: number }>;
}

interface CheckinResult {
  checked: boolean;
  credits: number;
  continuousDays: number;
  balance: number;
}

interface InviteSummary {
  inviteCode: string;
  invitedCount: number;
  totalReward: number;
  rewardPerInvite: number;
}

interface MemberPlanRow {
  id: number;
  name: string;
  price: number;
  rights: string[];
  giftCredits: number;
  checkinBonus: number;
}

interface MemberStatus {
  memberPlan: string;
  memberExpireAt: string | null;
  isMember: boolean;
}

interface PaymentParams {
  provider: "mock" | "wechat";
  mockCompleteUrl?: string;
  configured?: boolean;
  message?: string;
  timeStamp?: string;
  nonceStr?: string;
  package?: string;
  signType?: string;
  paySign?: string;
}

export interface PaymentOrderView {
  id: string;
  orderNo: string;
  type: "recharge" | "membership";
  status: "pending" | "paid" | "closed" | "failed";
  amountFen: number;
  amountYuan: number;
  subject: string;
  credits: number;
  bonusCredits: number;
  memberDays: number;
  paidAt: string | null;
  paymentParams: PaymentParams | null;
}

interface Bootstrap {
  rechargeTiers?: Array<{ id: number; price: number; credits: number; bonus: number }>;
  memberPlans?: MemberPlanRow[];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function recordTitle(record: CreditRecord) {
  if (record.reason) return record.reason;
  const titleMap: Record<string, string> = {
    recharge: "积分充值",
    consume: "AI 生成",
    refund: "生成失败退款",
    checkin: "每日签到",
    invite: "邀请好友奖励",
    membership: "会员权益",
    adjust: "后台调账"
  };
  return titleMap[record.type] || "积分变动";
}

function toPointRecord(record: CreditRecord): PointRecord {
  const amount = record.amount > 0 ? `+${record.amount}` : `${record.amount}`;
  return {
    title: recordTitle(record),
    source: record.type,
    model: record.type,
    time: formatDate(record.createdAt),
    amount
  };
}

function planAccent(index: number): MemberPlan["accent"] {
  if (index === 1) return "lavender";
  if (index >= 2) return "gold";
  return "accent";
}

function toMemberPlan(plan: MemberPlanRow, index: number): MemberPlan {
  const days = plan.name.includes("年") ? 365 : plan.name.includes("季") ? 90 : 30;
  const unit = plan.price > 0 ? `¥${(plan.price / days).toFixed(2)}/天` : "免费";
  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    unitPrice: unit,
    totalCredits: plan.giftCredits,
    icon: index >= 2 ? "♛" : "◆",
    accent: planAccent(index),
    badge: index === 1 ? "推荐" : index >= 2 ? "超值" : undefined,
    recommended: index === 1
  };
}

export async function fetchCreditsBalance() {
  const data = await api.get<CreditBalance>("/credits/balance");
  return data.credits;
}

export async function fetchCreditRecords(type: "earn" | "spend", page = 1, pageSize = 20) {
  const result = await api.get<PageResult<CreditRecord>>(`/credits/records?type=${type}&page=${page}&pageSize=${pageSize}`);
  return result.items.map(toPointRecord);
}

export async function fetchRechargeTiers() {
  const data = await api.get<Bootstrap>("/app/bootstrap", { skipAuth: true });
  return (data.rechargeTiers || []).map<RechargeTier>((tier, index) => ({
    id: tier.id,
    price: tier.price,
    credits: tier.credits,
    bonus: tier.bonus,
    popular: index === 3 || tier.bonus === Math.max(...(data.rechargeTiers || []).map((item) => item.bonus))
  }));
}

export async function fetchCheckinStatus() {
  return api.get<CheckinStatus>("/checkin/status");
}

export async function submitCheckin() {
  return api.post<CheckinResult>("/checkin");
}

export async function fetchInviteSummary() {
  const data = await api.get<InviteSummary>("/invite/summary");
  const invitedUsers: InvitedUser[] = Array.from({ length: data.invitedCount }, (_, index) => ({
    name: `已邀请用户 ${index + 1}`,
    avatar: `${index + 1}`,
    color: ["var(--mint)", "var(--peach)", "var(--lavender)", "var(--accent)"][index % 4],
    date: "",
    reward: data.rewardPerInvite
  }));
  return { ...data, invitedUsers };
}

export async function fetchMemberPlans() {
  const rows = await api.get<MemberPlanRow[]>("/membership/plans", { skipAuth: true });
  return rows.map(toMemberPlan);
}

export async function fetchMemberStatus() {
  return api.get<MemberStatus>("/membership/status");
}

export function createRechargeOrder(payload: { tierId?: number; amount?: number }) {
  return api.post<PaymentOrderView>("/payments/recharge/orders", payload);
}

export function createMembershipOrder(planId: number) {
  return api.post<PaymentOrderView>("/payments/membership/orders", { planId });
}

export function completeMockPayment(orderId: string) {
  return api.post<PaymentOrderView>(`/payments/${orderId}/mock-complete`);
}

export async function requestOrderPayment(order: PaymentOrderView) {
  const params = order.paymentParams;
  if (!params) return order;

  if (params.provider === "mock") {
    return completeMockPayment(order.id);
  }

  if (!params.configured || !params.timeStamp || !params.nonceStr || !params.package || !params.signType || !params.paySign) {
    throw new Error(params.message || "微信支付暂未配置");
  }

  await new Promise<void>((resolve, reject) => {
    uni.requestPayment({
      provider: "wxpay",
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType,
      paySign: params.paySign,
      success: () => resolve(),
      fail: (error) => reject(new Error(error.errMsg || "支付取消"))
    });
  });

  return order;
}
