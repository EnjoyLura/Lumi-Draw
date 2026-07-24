import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreditsService } from "./credits.service";
import { readCreditsConfig } from "./reward-policy";
import { WechatWalletService } from "../payments/wechat-wallet.service";

function shanghaiDayRange(now = new Date()) {
  const offsetMs = 8 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

@Injectable()
export class PublishRewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly wallet: WechatWalletService
  ) {}

  async awardPublishedWork(userId: number, workId: number) {
    const policy = await readCreditsConfig(this.prisma);
    const { start, end } = shanghaiDayRange();
    const refId = `publish_reward:${workId}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      const work = await tx.work.findFirst({
        where: { id: workId, userId, status: "published", isPublic: true },
        select: { id: true }
      });
      if (!work) return 0;

      const alreadyRewarded = await tx.creditTransaction.findFirst({
        where: { userId, refId },
        select: { id: true }
      });
      if (alreadyRewarded) return 0;

      const rewardedToday = await tx.creditTransaction.findFirst({
        where: {
          userId,
          refId: { startsWith: "publish_reward:" },
          createdAt: { gte: start, lt: end }
        },
        select: { id: true }
      });
      if (rewardedToday) return 0;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { memberPlan: true, memberExpireAt: true }
      });
      let memberBonus = 0;
      if (user?.memberPlan && (!user.memberExpireAt || user.memberExpireAt.getTime() > Date.now())) {
        const plan = await tx.memberPlan.findFirst({
          where: { name: user.memberPlan, enabled: true },
          select: { publishBonus: true }
        });
        memberBonus = Math.max(0, plan?.publishBonus ?? 0);
      }

      const amount = Math.max(0, policy.publishReward) + memberBonus;
      if (!amount) return 0;
      const reason = memberBonus > 0 ? `发布作品奖励（会员加成 +${memberBonus}）` : "发布作品奖励";
      const walletGift = await this.wallet.present(
        userId,
        amount,
        `publish_${userId}_${start.toISOString().slice(0, 10).replace(/-/g, "")}`,
        reason
      );
      if (walletGift) {
        await this.credits.syncExternalBalanceInTx(tx, userId, "adjust", amount, walletGift.balance, reason, refId);
      } else {
        await this.credits.addTransactionInTx(tx, userId, "adjust", amount, reason, refId);
      }
      return amount;
    });
  }
}
