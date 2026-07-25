import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMeDto } from "../auth/auth.dto";
import { DEFAULT_CREATOR_TITLE_TIERS, normalizeCreatorTitleTiers, resolveCreatorTitle } from "../common/creator-titles";
import { WechatContentSafetyService } from "../content-safety/wechat-content-safety.service";
import { UploadsService } from "../uploads/uploads.service";

function publicUser(user: User) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarText: user.avatarText,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl ?? undefined,
    bio: user.bio,
    gender: user.gender,
    phone: user.phone,
    credits: user.credits,
    memberPlan: user.memberPlan,
    status: user.status,
    worksCount: user.worksCount,
    likesCount: user.likesCount,
    followers: user.followers,
    following: user.following,
    avatarModerationStatus: user.avatarModerationStatus,
    avatarReviewPending: ["submitting", "pending"].includes(user.avatarModerationStatus)
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly safety: WechatContentSafetyService
  ) {}

  private async withCreatorTitle(user: User) {
    const [setting, publishedWorksCount] = await Promise.all([
      this.prisma.appSetting.findUnique({ where: { key: "creatorTitlesConfig" } }),
      this.prisma.work.count({ where: { userId: user.id, status: "published", isPublic: true } })
    ]);
    let rawTiers: unknown = DEFAULT_CREATOR_TITLE_TIERS;
    if (setting) {
      try { rawTiers = JSON.parse(setting.value).tiers; } catch { /* use defaults */ }
    }
    const tiers = normalizeCreatorTitleTiers(rawTiers);
    return { ...publicUser(user), publishedWorksCount, creatorTitle: resolveCreatorTitle(tiers, publishedWorksCount) };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("用户不存在");
    return this.withCreatorTitle(user);
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    await this.safety.checkText(userId, [dto.nickname, dto.bio], 1);
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new NotFoundException("用户不存在");
    const data: Prisma.UserUpdateInput = {};
    if (dto.nickname !== undefined) {
      data.nickname = dto.nickname;
      data.avatarText = dto.nickname.slice(0, 1) || "米";
    }
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.phone !== undefined) data.phone = dto.phone;
    await this.prisma.user.update({ where: { id: userId }, data });

    const avatarChanged = dto.avatarUrl !== undefined
      && dto.avatarUrl !== current.avatarUrl
      && dto.avatarUrl !== current.pendingAvatarUrl;
    if (avatarChanged) {
      this.uploads.assertManagedImageUrl(dto.avatarUrl!);
      await this.safety.beginAvatarReview(userId, dto.avatarUrl!, this.uploads.readUrl(dto.avatarUrl!, "private"));
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.withCreatorTitle(user);
  }

  async cancelAccount(userId: number) {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
      if (!user) throw new NotFoundException("用户不存在");
      if (user.status === "cancelled") return;

      const workIds = (
        await tx.work.findMany({
          where: { userId },
          select: { id: true }
        })
      ).map((work) => work.id);

      await tx.workInteraction.deleteMany({
        where: {
          OR: [{ userId }, ...(workIds.length ? [{ workId: { in: workIds } }] : [])]
        }
      });
      await tx.workView.deleteMany({
        where: {
          OR: [{ userId }, ...(workIds.length ? [{ workId: { in: workIds } }] : [])]
        }
      });
      await tx.report.deleteMany({
        where: {
          OR: [{ reporterId: userId }, ...(workIds.length ? [{ workId: { in: workIds } }] : [])]
        }
      });
      if (workIds.length) {
        await tx.generateResult.updateMany({ where: { workId: { in: workIds } }, data: { workId: null } });
      }
      await tx.work.deleteMany({ where: { userId } });
      await tx.generateJob.deleteMany({ where: { userId } });
      await tx.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } });
      await tx.inviteRecord.deleteMany({ where: { OR: [{ inviterId: userId }, { inviteeId: userId }] } });
      await tx.feedback.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.checkinRecord.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.contentModerationTask.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          openId: null,
          nickname: "已注销用户",
          avatarText: "",
          avatarColor: "#B8C2CC",
          avatarUrl: null,
          pendingAvatarUrl: null,
          avatarModerationStatus: "unchecked",
          bio: "",
          gender: "unknown",
          phone: "",
          credits: 0,
          memberPlan: "",
          memberExpireAt: null,
          status: "cancelled",
          inviteCode: null,
          invitedById: null,
          worksCount: 0,
          likesCount: 0,
          followers: 0,
          following: 0
        }
      });
    });

    return { ok: true };
  }
}
