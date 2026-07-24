import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreditsService } from "../credits/credits.service";
import { readInviteConfig } from "../credits/reward-policy";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService
  ) {}

  private async ensureCode(userId: number, current: string | null): Promise<string> {
    if (current) return current;
    for (let i = 0; i < 5; i++) {
      const code = `LM${userId.toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;
      try {
        await this.prisma.user.update({ where: { id: userId }, data: { inviteCode: code } });
        return code;
      } catch {
        // 冲突则重试
      }
    }
    throw new BadRequestException("邀请码生成失败");
  }

  async summary(userId: number) {
    const policy = await readInviteConfig(this.prisma);
    if (!policy.enabled) throw new NotFoundException("邀请活动暂未开放");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("用户不存在");
    const code = await this.ensureCode(userId, user.inviteCode);
    const records = await this.prisma.inviteRecord.findMany({ where: { inviterId: userId }, orderBy: { createdAt: "desc" } });
    const inviteeIds = records.map((record) => record.inviteeId);
    const invitees = inviteeIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: inviteeIds } },
          select: { id: true, nickname: true, avatarText: true, avatarColor: true, avatarUrl: true }
        })
      : [];
    const inviteeById = new Map(invitees.map((invitee) => [invitee.id, invitee]));
    const totalReward = records.reduce((sum, r) => sum + r.rewardInviter, 0);
    return {
      inviteCode: code,
      invitedCount: records.length,
      totalReward,
      rewardPerInvite: policy.inviterReward,
      invitedUsers: records.map((record) => {
        const invitee = inviteeById.get(record.inviteeId);
        return {
          id: record.inviteeId,
          name: invitee?.nickname ?? `用户${record.inviteeId}`,
          avatar: invitee?.avatarText || invitee?.nickname?.slice(0, 1) || "米",
          color: invitee?.avatarColor || "#5B9FE8",
          avatarUrl: invitee?.avatarUrl ?? null,
          date: record.createdAt.toISOString(),
          reward: record.rewardInviter
        };
      })
    };
  }

  async bind(userId: number, code: string) {
    const policy = await readInviteConfig(this.prisma);
    if (!policy.enabled) throw new NotFoundException("邀请活动暂未开放");
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      const me = await tx.user.findUnique({ where: { id: userId } });
      if (!me) throw new NotFoundException("用户不存在");
      if (me.invitedById) throw new BadRequestException("已绑定过邀请人");
      const inviter = await tx.user.findUnique({ where: { inviteCode: code } });
      if (!inviter) throw new BadRequestException("邀请码无效");
      if (inviter.id === userId) throw new BadRequestException("不能邀请自己");
      if (policy.cap > 0 && await tx.inviteRecord.count({ where: { inviterId: inviter.id } }) >= policy.cap) {
        throw new BadRequestException("该邀请人的奖励名额已用完");
      }
      const claimed = await tx.user.updateMany({ where: { id: userId, invitedById: null }, data: { invitedById: inviter.id } });
      if (!claimed.count) throw new BadRequestException("已绑定过邀请人");
      await tx.inviteRecord.create({
        data: { inviterId: inviter.id, inviteeId: userId, rewardInviter: policy.inviterReward, rewardInvitee: policy.inviteeReward }
      });
      if (policy.inviterReward > 0) {
        await this.credits.addTransactionInTx(tx, inviter.id, "invite", policy.inviterReward, `邀请好友 ${me.nickname}`, `invite:${userId}:inviter`);
      }
      const result = policy.inviteeReward > 0
        ? await this.credits.addTransactionInTx(tx, userId, "invite", policy.inviteeReward, "接受邀请奖励", `invite:${userId}:invitee`)
        : { balance: me.credits };
      return { ok: true, rewardCredits: policy.inviteeReward, balance: result.balance };
    });
  }
}
