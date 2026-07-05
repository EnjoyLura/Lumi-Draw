import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const CATEGORY_META: Record<string, { title: string; icon: string; gradient: string; color: string }> = {
  like: { title: "点赞", icon: "♡", gradient: "linear-gradient(135deg,#FFB3C1,#FF8FA3)", color: "#ff8fa3" },
  favorite: { title: "收藏", icon: "☆", gradient: "linear-gradient(135deg,#A8D8F0,#7CC4E8)", color: "#7cc4e8" },
  remake: { title: "同款", icon: "↻", gradient: "linear-gradient(135deg,#A3E4CC,#7DD4B0)", color: "#7dd4b0" },
  follow: { title: "关注", icon: "+", gradient: "linear-gradient(135deg,#FFD4A8,#FFC088)", color: "#ffc088" },
  system: { title: "系统通知", icon: "!", gradient: "linear-gradient(135deg,#B4C8F5,#96B0E8)", color: "#96b0e8" },
  service: { title: "客服消息", icon: "?", gradient: "linear-gradient(135deg,#C8B5E8,#B09DD8)", color: "#b09dd8" }
};

const CATEGORY_KEYS = Object.keys(CATEGORY_META);

function timeText(date: Date) {
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: number) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    return CATEGORY_KEYS.map((key) => {
      const items = rows.filter((row) => row.type === key);
      const latest = items[0];
      return {
        key,
        ...CATEGORY_META[key],
        unread: items.filter((item) => !item.read).length,
        latest: latest
          ? { desc: latest.content || latest.title, time: timeText(latest.createdAt) }
          : { desc: "暂无消息", time: "" }
      };
    });
  }

  async list(userId: number, type: string) {
    const safeType = CATEGORY_META[type] ? type : "system";
    const rows = await this.prisma.notification.findMany({
      where: { userId, type: safeType },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      unread: !row.read,
      time: timeText(row.createdAt),
      createdAt: row.createdAt.toISOString()
    }));
  }

  async markRead(userId: number, type: string) {
    const safeType = CATEGORY_META[type] ? type : "system";
    await this.prisma.notification.updateMany({
      where: { userId, type: safeType, read: false },
      data: { read: true }
    });
    return { ok: true, type: safeType };
  }
}
