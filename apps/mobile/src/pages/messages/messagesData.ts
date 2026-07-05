export type MessageCategoryKey = "like" | "favorite" | "remake" | "follow" | "system" | "service";

export interface MessageUser {
  name: string;
  avatar: string;
  color: string;
}

export interface MessageCategory {
  key: MessageCategoryKey;
  title: string;
  icon: string;
  gradient: string;
  color: string;
}

export interface MessageItem {
  content: string;
  time: string;
  unread: boolean;
  user?: MessageUser;
}

const users: MessageUser[] = [
  { name: "云端造梦师", avatar: "梦", color: "var(--accent)" },
  { name: "星辰大海", avatar: "星", color: "var(--mint)" },
  { name: "月光如水", avatar: "月", color: "var(--peach)" },
  { name: "风之绘师", avatar: "风", color: "var(--lavender)" },
  { name: "光影魔术", avatar: "光", color: "var(--lemon)" }
];

export const messageCategories: MessageCategory[] = [
  { key: "like", title: "点赞", icon: "♡", gradient: "linear-gradient(135deg,#FFB3C1,#FF8FA3)", color: "#ff8fa3" },
  { key: "favorite", title: "收藏", icon: "☆", gradient: "linear-gradient(135deg,#A8D8F0,#7CC4E8)", color: "#7cc4e8" },
  { key: "remake", title: "一键同款", icon: "↻", gradient: "linear-gradient(135deg,#A3E4CC,#7DD4B0)", color: "#7dd4b0" },
  { key: "follow", title: "关注", icon: "+", gradient: "linear-gradient(135deg,#FFD4A8,#FFC088)", color: "#ffc088" },
  { key: "system", title: "系统通知", icon: "!", gradient: "linear-gradient(135deg,#B4C8F5,#96B0E8)", color: "#96b0e8" },
  { key: "service", title: "客服消息", icon: "?", gradient: "linear-gradient(135deg,#C8B5E8,#B09DD8)", color: "#b09dd8" }
];

export const messageMap: Record<MessageCategoryKey, MessageItem[]> = {
  like: [
    { user: users[2], content: "赞了你的作品「少女与猫」", time: "2分钟前", unread: true },
    { user: users[3], content: "赞了你的作品「油画风景」", time: "1小时前", unread: true },
    { user: users[4], content: "赞了你的作品「古风少女」", time: "3小时前", unread: false }
  ],
  favorite: [
    { user: users[3], content: "收藏了你的作品「少女与猫」", time: "30分钟前", unread: true },
    { user: users[4], content: "收藏了你的作品「抽象梦境」", time: "2小时前", unread: true }
  ],
  remake: [
    { user: users[3], content: "使用你的作品生成了一键同款", time: "3小时前", unread: true }
  ],
  follow: [
    { user: users[2], content: "关注了你", time: "5小时前", unread: true },
    { user: users[4], content: "关注了你", time: "昨天", unread: false }
  ],
  system: [
    { content: "每日签到 +10 积分已到账", time: "昨天", unread: false },
    { content: "你的作品「少女与猫」已通过审核", time: "2天前", unread: false },
    { content: "欢迎使用 Lumi-Draw，注册赠送 100 积分", time: "3天前", unread: false }
  ],
  service: [
    { content: "欢迎来到 Lumi-Draw，有任何问题都可以向我们反馈", time: "3天前", unread: false },
    { content: "你的反馈已收到，我们会尽快处理", time: "5天前", unread: false }
  ]
};

export function getMessageCategory(key: string | undefined) {
  return messageCategories.find((item) => item.key === key) ?? messageCategories[0];
}

export function getMessages(key: MessageCategoryKey, readKeys: Set<string>) {
  return messageMap[key].map((item) => ({
    ...item,
    unread: readKeys.has(key) ? false : item.unread
  }));
}

export function getUnreadCount(key: MessageCategoryKey, readKeys: Set<string>) {
  if (readKeys.has(key)) return 0;
  return messageMap[key].filter((item) => item.unread).length;
}

export function getLatestMessage(key: MessageCategoryKey) {
  const latest = messageMap[key][0];
  if (!latest) return { desc: "暂无消息", time: "" };
  return {
    desc: latest.user ? `${latest.user.name} ${latest.content}` : latest.content,
    time: latest.time
  };
}
