export interface RechargeTier {
  id?: number;
  price: number;
  credits: number;
  bonus: number;
  popular?: boolean;
}

export interface PointRecord {
  title: string;
  source?: string;
  model?: string;
  time: string;
  amount: string;
}

export interface Milestone {
  days: number;
  reward: number;
  state: "claimed" | "available" | "locked";
}

export interface InvitedUser {
  name: string;
  avatar: string;
  color: string;
  date: string;
  reward: number;
}

export interface MemberPlan {
  id?: number;
  name: string;
  price: number;
  unitPrice: string;
  totalCredits: number;
  rights?: string[];
  checkinBonus?: number;
  milestoneBonus?: number;
  publishBonus?: number;
  icon: string;
  accent: "accent" | "lavender" | "gold";
  badge?: string;
  recommended?: boolean;
}

export interface MemberBenefit {
  title: string;
  desc: string;
  icon: string;
  tone: "mint" | "accent" | "lavender" | "peach";
}

export const currentCredits = 2860;
export const inviteCode = "LUMI8829";

export const rechargeTiers: RechargeTier[] = [
  { price: 6, credits: 600, bonus: 0 },
  { price: 18, credits: 1800, bonus: 60 },
  { price: 30, credits: 3000, bonus: 150 },
  { price: 68, credits: 6800, bonus: 480, popular: true },
  { price: 128, credits: 12800, bonus: 1280 }
];

export const earnRecords: PointRecord[] = [
  { title: "充值 60 积分", source: "微信支付", time: "06-18 14:30", amount: "+60" },
  { title: "每日签到", source: "签到奖励", time: "06-17 09:12", amount: "+10" },
  { title: "充值 180 积分", source: "微信支付", time: "06-15 14:30", amount: "+180" },
  { title: "邀请好友奖励", source: "邀请 星辰大海", time: "06-15 10:05", amount: "+50" },
  { title: "充值 680 积分", source: "微信支付", time: "06-11 14:30", amount: "+680" }
];

export const spendRecords: PointRecord[] = [
  { title: "生成「霓虹都市」", model: "GPT Image 2", time: "06-18 16:20", amount: "-15" },
  { title: "生成「山水之间」", model: "Nano Banana 2", time: "06-17 20:15", amount: "-8" },
  { title: "生成「少女与猫」", model: "Flux Pro", time: "06-16 14:30", amount: "-12" },
  { title: "生成「抽象梦境」", model: "SDXL", time: "06-15 11:20", amount: "-6" },
  { title: "生成「古风少女」", model: "Midjourney", time: "06-14 09:40", amount: "-20" }
];

export const milestones: Milestone[] = [
  { days: 3, reward: 20, state: "claimed" },
  { days: 7, reward: 50, state: "available" },
  { days: 14, reward: 100, state: "locked" },
  { days: 30, reward: 300, state: "locked" }
];

export const initialSignedDays = [1, 2, 3, 4, 5, 6, 7];
export const today = 18;

export const invitedUsers: InvitedUser[] = [
  { name: "星辰大海", avatar: "星", color: "var(--mint)", date: "06-15", reward: 50 },
  { name: "月光如水", avatar: "月", color: "var(--peach)", date: "06-12", reward: 50 },
  { name: "风之绘师", avatar: "风", color: "var(--lavender)", date: "06-08", reward: 50 }
];

export const memberPlans: MemberPlan[] = [
  { name: "月卡", price: 18, unitPrice: "¥0.60/天", totalCredits: 100, rights: ["赠送100积分", "签到额外+1", "发布额外+1"], checkinBonus: 1, milestoneBonus: 2, publishBonus: 1, icon: "gem", accent: "accent" },
  { name: "季卡", price: 48, unitPrice: "¥0.53/天", totalCredits: 300, rights: ["赠送300积分", "签到额外+2", "发布额外+2"], checkinBonus: 2, milestoneBonus: 4, publishBonus: 2, icon: "gem", accent: "lavender", badge: "省 10%", recommended: true },
  { name: "年卡", price: 168, unitPrice: "¥0.46/天", totalCredits: 1200, rights: ["赠送1200积分", "签到额外+3", "发布额外+3"], checkinBonus: 3, milestoneBonus: 6, publishBonus: 3, icon: "crown", accent: "gold", badge: "省 18%" }
];

export const memberBenefits: MemberBenefit[] = [
  { title: "开通赠送", desc: "按会员方案赠送积分", icon: "gem", tone: "mint" },
  { title: "签到加成", desc: "每日签到额外送积分", icon: "sun", tone: "accent" },
  { title: "专属徽章", desc: "VIP 身份标识", icon: "crown", tone: "lavender" },
  { title: "发布加成", desc: "发布作品额外送积分", icon: "sparkles", tone: "peach" }
];
