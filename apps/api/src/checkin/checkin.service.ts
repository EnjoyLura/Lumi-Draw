import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreditsService } from "../credits/credits.service";
import { readCheckinConfig } from "../credits/reward-policy";
import { PrismaService } from "../prisma/prisma.service";
import { WechatWalletService } from "../payments/wechat-wallet.service";

const MILESTONE_DAYS = new Set([3, 7, 14, 30]);

function tierCredits(tiers: number[], continuousDays: number) {
  const idx = ((continuousDays - 1) % 7 + 7) % 7;
  return tiers[idx] ?? tiers[0] ?? 0;
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
    private readonly credits: CreditsService,
    private readonly wallet: WechatWalletService
  ) {}

  private today() {
    return dateStr(new Date());
  }

  private yesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dateStr(d);
  }

  private async activePlan(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { memberPlan: true, memberExpireAt: true } });
    if (!user || !user.memberPlan || (user.memberExpireAt && user.memberExpireAt.getTime() <= Date.now())) return null;
    return this.prisma.memberPlan.findFirst({ where: { name: user.memberPlan, enabled: true } });
  }

  async status(userId: number) {
    const [todayRec, latest, plan, policy] = await Promise.all([
      this.prisma.checkinRecord.findUnique({ where: { userId_date: { userId, date: this.today() } } }),
      this.prisma.checkinRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
      this.activePlan(userId),
      readCheckinConfig(this.prisma)
    ]);
    const checkedToday = !!todayRec;
    let currentStreak = 0;
    if (checkedToday) currentStreak = todayRec.continuousDays;
    else if (latest && latest.date === this.yesterday()) currentStreak = latest.continuousDays;
    const nextDay = checkedToday ? currentStreak : currentStreak + 1;
    return {
      checkedToday,
      continuousDays: currentStreak,
      nextCredits: tierCredits(policy.tiers, nextDay || 1) + (plan?.checkinBonus ?? 0) + (MILESTONE_DAYS.has(nextDay) ? (plan?.milestoneBonus ?? 0) : 0),
      tiers: policy.tiers.map((credits, i) => ({ day: i + 1, credits: credits + (plan?.checkinBonus ?? 0) })),
      memberBenefits: plan ? { checkinBonus: plan.checkinBonus, milestoneBonus: plan.milestoneBonus } : null
    };
  }

  async checkin(userId: number) {
    const today = this.today();
    const [plan, policy] = await Promise.all([this.activePlan(userId), readCheckinConfig(this.prisma)]);
    const dailyBonus = plan?.checkinBonus ?? 0;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      const existing = await tx.checkinRecord.findUnique({ where: { userId_date: { userId, date: today } } });
      if (existing) {
        const balance = (await tx.user.findUnique({ where: { id: userId }, select: { credits: true } }))?.credits ?? 0;
        return { checked: false, credits: 0, continuousDays: existing.continuousDays, balance };
      }
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException("用户不存在");
      const latest = await tx.checkinRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } });
      const continuousDays = latest && latest.date === this.yesterday() ? latest.continuousDays + 1 : 1;
      const milestoneBonus = MILESTONE_DAYS.has(continuousDays) ? (plan?.milestoneBonus ?? 0) : 0;
      const credits = tierCredits(policy.tiers, continuousDays) + dailyBonus + milestoneBonus;
      const bonusText = [dailyBonus ? `会员日签 +${dailyBonus}` : "", milestoneBonus ? `里程碑 +${milestoneBonus}` : ""].filter(Boolean).join("，");
      const reason = `签到第${continuousDays}天${bonusText ? `（${bonusText}）` : ""}`;
      const walletGift = await this.wallet.present(userId, credits, `checkin_${userId}_${today.replace(/-/g, "")}`, reason);
      const { balance } = walletGift
        ? await this.credits.syncExternalBalanceInTx(tx, userId, "checkin", credits, walletGift.balance, reason, `checkin:${today}`)
        : await this.credits.addTransactionInTx(tx, userId, "checkin", credits, reason, `checkin:${today}`);
      await tx.checkinRecord.create({ data: { userId, date: today, credits, continuousDays } });
      return { checked: true, credits, continuousDays, balance };
    });
  }
}
