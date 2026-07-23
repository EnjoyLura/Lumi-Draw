import { api } from "../../services/api";
import { getWechatLoginCode } from "../../services/auth";
import type { InvitedUser, MemberPlan, PointRecord, RechargeTier } from "./pointsData";

interface WechatVirtualPaymentApi {
  canIUse?: (schema: string) => boolean;
  requestVirtualPayment: (options: {
    signData: string;
    paySig: string;
    signature: string;
    mode: "short_series_coin" | "short_series_goods";
    success: () => void;
    fail: (error: { errMsg?: string; errCode?: number }) => void;
  }) => void;
}

declare const wx: WechatVirtualPaymentApi;

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
  invitedUsers?: Array<{
    id: number;
    name: string;
    avatar: string;
    color: string;
    avatarUrl?: string | null;
    date: string;
    reward: number;
  }>;
}

interface MemberPlanRow {
  id: number;
  name: string;
  price: number;
  rights: string | string[];
  giftCredits: number;
  checkinBonus: number;
  milestoneBonus: number;
  publishBonus: number;
}

interface MemberStatus {
  memberPlan: string;
  memberExpireAt: string | null;
  isMember: boolean;
}

interface PaymentParams {
  provider: "mock" | "wechat_virtual";
  mockCompleteUrl?: string;
  configured?: boolean;
  message?: string;
  signData?: string;
  paySig?: string;
  signature?: string;
  mode?: "short_series_coin" | "short_series_goods";
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
  creditsConfig?: { publishReward?: number };
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
  if (record.reason === "AI generation failed refund") return "AI生成任务失败返还";
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
  const sourceMap: Record<string, string> = {
    recharge: "微信充值", consume: "创作消耗", refund: "积分返还", checkin: "签到奖励",
    invite: "邀请奖励", membership: "会员权益", adjust: "积分调整"
  };
  const source = sourceMap[record.type] || "积分变动";
  return {
    title: recordTitle(record),
    source,
    model: source,
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
  const rights = Array.isArray(plan.rights)
    ? plan.rights
    : String(plan.rights || "")
        .split(/[·,，、\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    unitPrice: unit,
    totalCredits: plan.giftCredits,
    rights,
    checkinBonus: plan.checkinBonus,
    milestoneBonus: plan.milestoneBonus,
    publishBonus: plan.publishBonus,
    icon: index >= 2 ? "crown" : "gem",
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
  const result = await fetchCreditRecordPage(type, page, pageSize);
  return result.items;
}

export async function fetchCreditRecordPage(type: "earn" | "spend", page = 1, pageSize = 20) {
  const result = await api.get<PageResult<CreditRecord>>(`/credits/records?type=${type}&page=${page}&pageSize=${pageSize}`);
  return {
    ...result,
    items: result.items.map(toPointRecord)
  };
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
  const invitedUsers: InvitedUser[] = (data.invitedUsers || []).map((user, index) => ({
    name: user.name,
    avatar: user.avatar,
    color: user.color || ["var(--mint)", "var(--peach)", "var(--lavender)", "var(--accent)"][index % 4],
    date: formatDate(user.date),
    reward: user.reward
  }));
  return { ...data, invitedUsers };
}

export async function fetchMemberPlans() {
  const rows = await api.get<MemberPlanRow[]>("/membership/plans", { skipAuth: true });
  return rows.map(toMemberPlan);
}

export async function fetchPublishRewardConfig() {
  const data = await api.get<Bootstrap>("/app/bootstrap", { skipAuth: true });
  return Math.max(0, Number(data.creditsConfig?.publishReward ?? 50));
}

export async function fetchMemberStatus() {
  return api.get<MemberStatus>("/membership/status");
}

export async function createRechargeOrder(payload: { tierId?: number; amount?: number }) {
  const wxCode = await getWechatLoginCode();
  return api.post<PaymentOrderView>("/payments/recharge/orders", { ...payload, wxCode });
}

export async function createMembershipOrder(planId: number) {
  const wxCode = await getWechatLoginCode();
  return api.post<PaymentOrderView>("/payments/membership/orders", { planId, wxCode });
}

export function completeMockPayment(orderId: string) {
  return api.post<PaymentOrderView>(`/payments/${orderId}/mock-complete`);
}

export function fetchPaymentOrder(orderId: string) {
  return api.get<PaymentOrderView>(`/payments/${orderId}`);
}

export function reconcilePendingPayments() {
  return api.post<{ checked: number; paid: number }>("/payments/pending/reconcile");
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForPaidOrder(orderId: string) {
  let latest = await fetchPaymentOrder(orderId);
  for (let index = 0; index < 12 && latest.status === "pending"; index += 1) {
    await wait(1_000);
    latest = await fetchPaymentOrder(orderId);
  }
  return latest;
}

function isH5Runtime() {
  return typeof window !== "undefined";
}

function normalizePaymentError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("cancel")) return "支付已取消";
  const codeMatch = message.match(/虚拟支付错误\s*(-?\d+)/);
  const code = codeMatch ? Number(codeMatch[1]) : 0;
  const codeMessages: Record<number, string> = {
    [-2]: "支付已取消",
    [-4]: "支付暂时受限，请稍后重试",
    [-15002]: "订单已失效，请重新下单",
    [-15007]: "登录状态已过期，请重新支付",
    [-15008]: "虚拟支付商户尚未完成开通",
    [-15009]: "积分商品尚未发布，请联系客服",
    [-15010]: "会员商品尚未发布，请联系客服",
    [-15014]: "商品配置正在生效，请稍后重试",
    [-15017]: "商户收款暂时受限，请稍后重试",
    [-15020]: "操作过快，请稍后重试",
    [-15021]: "当前支付人数较多，请稍后重试"
  };
  if (codeMessages[code]) return codeMessages[code];
  if (message.includes("requestVirtualPayment") || message.includes("虚拟支付错误")) {
    return "虚拟支付未完成，请稍后重试";
  }
  return message || "支付失败，请稍后重试";
}

export async function requestOrderPayment(order: PaymentOrderView) {
  const params = order.paymentParams;
  if (!params) return order;

  if (params.provider === "mock") {
    return completeMockPayment(order.id);
  }

  if (
    !params.configured ||
    !params.signData ||
    !params.paySig ||
    !params.signature ||
    !params.mode
  ) {
    throw new Error(params.message || "虚拟支付暂未配置");
  }

  if (isH5Runtime()) {
    throw new Error("请在微信小程序中完成支付");
  }

  if (typeof wx === "undefined" || !wx.requestVirtualPayment) {
    throw new Error("当前微信版本不支持虚拟支付，请升级微信后重试");
  }
  if (wx.canIUse && !wx.canIUse("requestVirtualPayment")) {
    throw new Error("当前微信版本不支持虚拟支付，请升级微信后重试");
  }

  try {
    await new Promise<void>((resolve, reject) => {
      wx.requestVirtualPayment({
        signData: params.signData!,
        paySig: params.paySig!,
        signature: params.signature!,
        mode: params.mode!,
        success: () => resolve(),
        fail: (error) =>
          reject(
            new Error(
              error.errCode !== undefined
                ? `虚拟支付错误 ${error.errCode}：${error.errMsg || "支付未完成"}`
                : error.errMsg || "支付未完成"
            )
          )
      });
    });
  } catch (error) {
    throw new Error(normalizePaymentError(error));
  }

  return waitForPaidOrder(order.id);
}
