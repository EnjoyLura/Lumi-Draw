import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, User, Work } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { CreditsService } from "../credits/credits.service";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService
  ) {}

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

  async worksSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [total, todayNew, featured, offline] = await Promise.all([
      this.prisma.work.count(),
      this.prisma.work.count({ where: { createdAt: { gte: today } } }),
      this.prisma.work.count({ where: { featured: true } }),
      this.prisma.work.count({ where: { status: "offline" } })
    ]);
    return { total, todayNew, featured, offline };
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

  // ---------- 用户管理动作 ----------
  private async ensureUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("用户不存在");
    return user;
  }

  async updateUser(id: number, body: Record<string, unknown>) {
    await this.ensureUser(id);
    const data: Prisma.UserUpdateInput = {};
    if (typeof body.nickname === "string") data.nickname = body.nickname;
    if (typeof body.bio === "string") data.bio = body.bio;
    if (typeof body.phone === "string") data.phone = body.phone;
    if (typeof body.memberPlan === "string") data.memberPlan = body.memberPlan;
    if (typeof body.gender === "string") data.gender = body.gender;
    if (body.status === "normal" || body.status === "banned") data.status = body.status;
    const user = await this.prisma.user.update({ where: { id }, data });
    return userRow(user);
  }

  async banUser(id: number) {
    await this.ensureUser(id);
    return userRow(await this.prisma.user.update({ where: { id }, data: { status: "banned" } }));
  }

  async unbanUser(id: number) {
    await this.ensureUser(id);
    return userRow(await this.prisma.user.update({ where: { id }, data: { status: "normal" } }));
  }

  async adjustCredits(id: number, amount: unknown, reason: unknown) {
    await this.ensureUser(id);
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount === 0) {
      throw new BadRequestException("amount 必须为非零数字");
    }
    const { balance } = await this.credits.addTransaction(id, "adjust", amount, typeof reason === "string" && reason ? reason : "人工调整");
    return { id, balance, amount };
  }

  async giftMember(id: number, planId: unknown, reason: unknown) {
    const user = await this.ensureUser(id);
    const numericPlanId = Number(planId);
    if (!Number.isInteger(numericPlanId) || numericPlanId <= 0) {
      throw new BadRequestException("planId 必须为有效会员方案");
    }

    const plan = await this.prisma.memberPlan.findFirst({ where: { id: numericPlanId, enabled: true } });
    if (!plan) throw new NotFoundException("会员方案不存在");

    const note = typeof reason === "string" && reason.trim() ? reason.trim() : "后台赠送会员";
    const expireAt = this.resolveMemberExpireAt(user.memberExpireAt, this.resolveMemberDays(plan.name));
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id },
        data: {
          memberPlan: plan.name,
          memberExpireAt: expireAt
        }
      });
      if (plan.giftCredits > 0) {
        await this.credits.addTransactionInTx(tx, id, "membership", plan.giftCredits, `${note}：${plan.name}`, `admin_member_gift:${plan.id}`);
      }
      return next;
    });

    return userRow(updated);
  }

  // ---------- 作品管理动作 ----------
  private async ensureWork(id: number) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("作品不存在");
    return work;
  }

  async updateWork(id: number, body: Record<string, unknown>) {
    await this.ensureWork(id);
    const data: Prisma.WorkUpdateInput = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.style === "string") data.style = body.style;
    if (["draft", "pending", "published", "rejected", "offline"].includes(String(body.status))) data.status = String(body.status);
    const work = await this.prisma.work.update({ where: { id }, data, include: { user: true } });
    return workRow(work);
  }

  async featureWork(id: number, featured: unknown) {
    await this.ensureWork(id);
    const work = await this.prisma.work.update({ where: { id }, data: { featured: !!featured }, include: { user: true } });
    return workRow(work);
  }

  async recommendWork(id: number, recommend: unknown) {
    await this.ensureWork(id);
    const work = await this.prisma.work.update({ where: { id }, data: { recommend: !!recommend }, include: { user: true } });
    return workRow(work);
  }

  async offlineWork(id: number) {
    await this.ensureWork(id);
    const work = await this.prisma.work.update({ where: { id }, data: { status: "offline", isPublic: false }, include: { user: true } });
    return workRow(work);
  }

  async restoreWork(id: number) {
    await this.ensureWork(id);
    const work = await this.prisma.work.update({ where: { id }, data: { status: "published", isPublic: true }, include: { user: true } });
    return workRow(work);
  }

  async deleteWork(id: number) {
    const work = await this.ensureWork(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.workInteraction.deleteMany({ where: { workId: id } });
      await tx.workView.deleteMany({ where: { workId: id } });
      await tx.report.deleteMany({ where: { workId: id } });
      await tx.generateResult.updateMany({ where: { workId: id }, data: { workId: null } });
      await tx.work.delete({ where: { id } });
      await tx.user.updateMany({
        where: { id: work.userId, worksCount: { gt: 0 } },
        data: { worksCount: { decrement: 1 } }
      });
      if (work.likes > 0) {
        await tx.user.updateMany({
          where: { id: work.userId, likesCount: { gte: work.likes } },
          data: { likesCount: { decrement: work.likes } }
        });
        await tx.user.updateMany({
          where: { id: work.userId, likesCount: { lt: work.likes } },
          data: { likesCount: 0 }
        });
      }
    });
    return { ok: true, id, action: "delete" };
  }

  private resolveMemberExpireAt(current: Date | null, days: number) {
    const base = current && current.getTime() > Date.now() ? current : new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + Math.max(days, 1));
    return next;
  }

  private resolveMemberDays(name: string) {
    if (name.includes("年") || name.toLowerCase().includes("year")) return 365;
    if (name.includes("季") || name.toLowerCase().includes("quarter")) return 90;
    return 30;
  }
}
