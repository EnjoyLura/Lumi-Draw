export interface RechargeTier {
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

export const currentCredits = 2860;

export const rechargeTiers: RechargeTier[] = [
  { price: 6, credits: 60, bonus: 0 },
  { price: 18, credits: 180, bonus: 10 },
  { price: 30, credits: 300, bonus: 30 },
  { price: 68, credits: 680, bonus: 100, popular: true },
  { price: 128, credits: 1280, bonus: 280 }
];

export const earnRecords: PointRecord[] = [
  { title: "充值60积分", source: "微信支付", time: "06-18 14:30", amount: "+60" },
  { title: "每日签到", source: "签到奖励", time: "06-17 09:12", amount: "+10" },
  { title: "充值180积分", source: "微信支付", time: "06-15 14:30", amount: "+180" },
  { title: "邀请好友奖励", source: "邀请·星辰大海", time: "06-15 10:05", amount: "+50" },
  { title: "充值680积分", source: "微信支付", time: "06-11 14:30", amount: "+680" }
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
