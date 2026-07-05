import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, User, Work } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { AdminUserQueryDto, AdminWorkQueryDto } from "./admin.query";

function userRow(user: User) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarText: user.avatarText,
    avatarColor: user.avatarColor,
    bio: user.bio,
    gender: user.gender,
    credits: user.credits,
    memberPlan: user.memberPlan,
    status: user.status,
    phone: user.phone,
    worksCount: user.worksCount,
    likesCount: user.likesCount,
    followers: user.followers,
    following: user.following,
    createdAt: user.createdAt.toISOString()
  };
}

function workRow(work: Work & { user?: User | null }) {
  return {
    id: work.id,
    userId: work.userId,
    authorName: work.user?.nickname ?? `用户${work.userId}`,
    title: work.title,
    modelId: work.modelId,
    ratio: work.ratio,
    quality: work.quality,
    style: work.style,
    status: work.status,
    featured: work.featured,
    recommend: work.recommend,
    isPublic: work.isPublic,
    likes: work.likes,
    favorites: work.favorites,
    remakes: work.remakes,
    createdAt: work.createdAt.toISOString()
  };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async users(query: AdminUserQueryDto) {
    const { keyword, status, member, page, pageSize } = query;
    const where: Prisma.UserWhereInput = {};
    if (status) where.status = status;
    if (member) where.memberPlan = member;
    if (keyword?.trim()) {
      const kw = keyword.trim();
      const or: Prisma.UserWhereInput[] = [{ nickname: { contains: kw } }, { phone: { contains: kw } }];
      const asId = Number.parseInt(kw, 10);
      if (Number.isInteger(asId)) or.push({ id: asId });
      where.OR = or;
    }
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { id: "asc" }, ...skipTake(page, pageSize) }),
      this.prisma.user.count({ where })
    ]);
    return buildPage(rows.map(userRow), total, page, pageSize);
  }

  async userDetail(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("用户不存在");
    const recentWorks = await this.prisma.work.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 6
    });
    return { ...userRow(user), recentWorks: recentWorks.map((w) => workRow(w)) };
  }

  async works(query: AdminWorkQueryDto) {
    const { keyword, status, featured, recommend, page, pageSize } = query;
    const where: Prisma.WorkWhereInput = {};
    if (status) where.status = status;
    if (typeof featured === "boolean") where.featured = featured;
    if (typeof recommend === "boolean") where.recommend = recommend;
    if (keyword?.trim()) {
      const kw = keyword.trim();
      where.OR = [{ title: { contains: kw } }, { prompt: { contains: kw } }];
    }
    const [rows, total] = await Promise.all([
      this.prisma.work.findMany({ where, orderBy: { createdAt: "desc" }, include: { user: true }, ...skipTake(page, pageSize) }),
      this.prisma.work.count({ where })
    ]);
    return buildPage(rows.map((w) => workRow(w)), total, page, pageSize);
  }

  async workDetail(id: number) {
    const work = await this.prisma.work.findUnique({ where: { id }, include: { user: true } });
    if (!work) throw new NotFoundException("作品不存在");
    return {
      ...workRow(work),
      description: work.description,
      prompt: work.prompt,
      imageUrl: work.imageUrl,
      author: work.user ? { id: work.user.id, nickname: work.user.nickname, avatarText: work.user.avatarText, avatarColor: work.user.avatarColor } : null
    };
  }
}
