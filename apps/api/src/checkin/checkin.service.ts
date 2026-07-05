import { Injectable, NotFoundException } from "@nestjs/common";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";

// 阶梯积分（沿用原型）：连续第 N 天，按 7 天循环
const TIERS = [10, 10, 15, 15, 20, 20, 50];

function tierCredits(continuousDays: number) {
  const idx = ((continuousDays - 1) % 7 + 7) % 7;
  return TIERS[idx];
}

function dateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService
  ) {}

  private today() {
    return dateStr(new Date());
  }

  private yesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dateStr(d);
  }

  async status(userId: number) {
    const [todayRec, latest] = await Promise.all([
      this.prisma.checkinRecord.findUnique({ where: { userId_date: { userId, date: this.today() } } }),
      this.prisma.checkinRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } })
    ]);
    const checkedToday = !!todayRec;
    let currentStreak = 0;
    if (checkedToday) currentStreak = todayRec.continuousDays;
    else if (latest && latest.date === this.yesterday()) currentStreak = latest.continuousDays;
    const nextDay = checkedToday ? currentStreak : currentStreak + 1;
    return {
      checkedToday,
      continuousDays: currentStreak,
      nextCredits: tierCredits(nextDay || 1),
      tiers: TIERS.map((credits, i) => ({ day: i + 1, credits }))
    };
  }

  async checkin(userId: number) {
    const today = this.today();
    const existing = await this.prisma.checkinRecord.findUnique({ where: { userId_date: { userId, date: today } } });
    if (existing) {
      const balance = (await this.prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }))?.credits ?? 0;
      return { checked: false, credits: 0, continuousDays: existing.continuousDays, balance };
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("用户不存在");
    const latest = await this.prisma.checkinRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } });
    const continuousDays = latest && latest.date === this.yesterday() ? latest.continuousDays + 1 : 1;
    const credits = tierCredits(continuousDays);
    await this.prisma.checkinRecord.create({ data: { userId, date: today, credits, continuousDays } });
    const { balance } = await this.credits.addTransaction(userId, "checkin", credits, `签到第${continuousDays}天`);
    return { checked: true, credits, continuousDays, balance };
  }
}
