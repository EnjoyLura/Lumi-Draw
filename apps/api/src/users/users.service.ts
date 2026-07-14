import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMeDto } from "../auth/auth.dto";
import { DEFAULT_CREATOR_TITLE_TIERS, normalizeCreatorTitleTiers, resolveCreatorTitle } from "../common/creator-titles";

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
    following: user.following
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const data: Prisma.UserUpdateInput = {};
    if (dto.nickname !== undefined) {
      data.nickname = dto.nickname;
      data.avatarText = dto.nickname.slice(0, 1) || "米";
    }
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.phone !== undefined) data.phone = dto.phone;
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return this.withCreatorTitle(user);
  }
}
