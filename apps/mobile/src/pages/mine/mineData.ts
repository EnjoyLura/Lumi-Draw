export interface MineUser {
  name: string;
  avatar: string;
  color: string;
  userNo: string;
  credits: number;
}

export interface QuickAction {
  key: string;
  label: string;
  icon: string;
  gradient: string;
}

export interface MineListItem {
  key: string;
  label: string;
  icon: string;
  color?: string;
  badge?: string;
  dot?: boolean;
}

export const mineUser: MineUser = {
  name: "云端造梦师",
  avatar: "梦",
  color: "var(--accent)",
  userNo: "LUMI8829",
  credits: 2860
};

export const quickActions: QuickAction[] = [
  { key: "recharge", label: "充值", icon: "gem", gradient: "linear-gradient(135deg, #a8d8f8, #b0e6d0)" },
  { key: "checkin", label: "签到", icon: "calendar-check", gradient: "linear-gradient(135deg, #ffd4c8, #ffc8d6)" },
  { key: "membership", label: "会员", icon: "crown", gradient: "linear-gradient(135deg, #d4c8f0, #b8a8e0)" },
  { key: "invite", label: "邀请", icon: "gift", gradient: "linear-gradient(135deg, #a3e4cc, #8bd8b8)" }
];

export const accountItems: MineListItem[] = [
  { key: "messages", label: "消息中心", icon: "bell", color: "var(--rose)", badge: "5" },
  { key: "settings", label: "设置", icon: "settings", color: "var(--accent)" },
  { key: "history", label: "浏览记录", icon: "history", color: "var(--mint)" },
  { key: "generationHistory", label: "生成记录", icon: "rotate-ccw", color: "var(--lavender)" },
  { key: "drafts", label: "草稿箱", icon: "file-text", color: "var(--lemon)", dot: true },
  { key: "following", label: "我的关注", icon: "heart", color: "var(--peach)" }
];

export const supportItems: MineListItem[] = [
  { key: "feedback", label: "意见反馈", icon: "pencil" },
  { key: "service", label: "联系客服", icon: "message-circle" }
];
