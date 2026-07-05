import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";

const INVITER_REWARD = 50;
const INVITEE_REWARD = 30;

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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("用户不存在");
    const code = await this.ensureCode(userId, user.inviteCode);
    const records = await this.prisma.inviteRecord.findMany({ where: { inviterId: userId }, orderBy: { createdAt: "desc" } });
    const totalReward = records.reduce((sum, r) => sum + r.rewardInviter, 0);
    return {
      inviteCode: code,
      invitedCount: records.length,
      totalReward,
      rewardPerInvite: INVITER_REWARD
    };
  }

  async bind(userId: number, code: string) {
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) throw new NotFoundException("用户不存在");
    if (me.invitedById) throw new BadRequestException("已绑定过邀请人");
    const inviter = await this.prisma.user.findUnique({ where: { inviteCode: code } });
    if (!inviter) throw new BadRequestException("邀请码无效");
    if (inviter.id === userId) throw new BadRequestException("不能邀请自己");

    await this.prisma.user.update({ where: { id: userId }, data: { invitedById: inviter.id } });
    await this.prisma.inviteRecord.create({
      data: { inviterId: inviter.id, inviteeId: userId, rewardInviter: INVITER_REWARD, rewardInvitee: INVITEE_REWARD }
    });
    await this.credits.addTransaction(inviter.id, "invite", INVITER_REWARD, `邀请好友 ${me.nickname}`);
    const { balance } = await this.credits.addTransaction(userId, "invite", INVITEE_REWARD, "接受邀请奖励");
    return { ok: true, rewardCredits: INVITEE_REWARD, balance };
  }
}
