import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, User, Work } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

type WorkWithAuthor = Work & { user: User };
type InteractionType = "like" | "favorite";

const PUBLIC_WORK_WHERE: Prisma.WorkWhereInput = { status: "published", isPublic: true };

function toAuthor(user: User) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarText: user.avatarText,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl ?? undefined
  };
}

function toWorkCard(work: WorkWithAuthor) {
  return {
    id: work.id,
    imageUrl: work.imageUrl,
    title: work.title,
    prompt: work.prompt,
    ratio: work.ratio,
    likes: work.likes,
    favorites: work.favorites,
    remakes: work.remakes,
    createdAt: work.createdAt.toISOString(),
    author: toAuthor(work.user)
  };
}

function toUserCard(user: User, following = false) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarText: user.avatarText,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl ?? undefined,
    bio: user.bio,
    gender: user.gender,
    worksCount: user.worksCount,
    likesCount: user.likesCount,
    followers: user.followers,
    following: user.following,
    isFollowing: following
  };
}

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private async publicWork(id: number) {
    const work = await this.prisma.work.findFirst({
      where: { id, ...PUBLIC_WORK_WHERE },
      include: { user: true }
    });
    if (!work) throw new NotFoundException("作品不存在或暂不可见");
    return work;
  }

  async workState(userId: number, workId: number) {
    const work = await this.publicWork(workId);
    const [like, favorite, follow] = await Promise.all([
      this.prisma.workInteraction.findUnique({
        where: { userId_workId_type: { userId, workId, type: "like" } }
      }),
      this.prisma.workInteraction.findUnique({
        where: { userId_workId_type: { userId, workId, type: "favorite" } }
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: work.userId } }
      })
    ]);
    return {
      liked: Boolean(like),
      favorited: Boolean(favorite),
      following: work.userId === userId ? false : Boolean(follow)
    };
  }

  async viewWork(userId: number, workId: number) {
    await this.publicWork(workId);
    await this.prisma.workView.upsert({
      where: { userId_workId: { userId, workId } },
      update: { viewedAt: new Date() },
      create: { userId, workId }
    });
    return { viewed: true };
  }

  toggleInteraction(userId: number, workId: number, type: InteractionType) {
    return this.prisma.$transaction(async (tx) => {
      const work = await tx.work.findFirst({
        where: { id: workId, ...PUBLIC_WORK_WHERE },
        include: { user: true }
      });
      if (!work) throw new NotFoundException("作品不存在或暂不可见");

      const existing = await tx.workInteraction.findUnique({
        where: { userId_workId_type: { userId, workId, type } }
      });
      const countField = type === "like" ? "likes" : "favorites";

      if (existing) {
        await tx.workInteraction.delete({ where: { id: existing.id } });
        const updated = await tx.work.update({
          where: { id: workId },
          data: { [countField]: { decrement: 1 } },
          select: { likes: true, favorites: true }
        });
        if (type === "like") {
          await tx.user.update({ where: { id: work.userId }, data: { likesCount: { decrement: 1 } } });
        }
        return {
          liked: type === "like" ? false : undefined,
          favorited: type === "favorite" ? false : undefined,
          likes: Math.max(0, updated.likes),
          favorites: Math.max(0, updated.favorites)
        };
      }

      await tx.workInteraction.create({ data: { userId, workId, type } });
      const updated = await tx.work.update({
        where: { id: workId },
        data: { [countField]: { increment: 1 } },
        select: { likes: true, favorites: true }
      });
      if (type === "like") {
        await tx.user.update({ where: { id: work.userId }, data: { likesCount: { increment: 1 } } });
      }
      if (work.userId !== userId) {
        const actor = await tx.user.findUnique({ where: { id: userId }, select: { nickname: true } });
        await tx.notification.create({
          data: {
            userId: work.userId,
            type,
            title: type === "like" ? "点赞" : "收藏",
            content: `${actor?.nickname || "有用户"} ${type === "like" ? "点赞" : "收藏"}了你的作品「${work.title}」`
          }
        });
      }
      return {
        liked: type === "like" ? true : undefined,
        favorited: type === "favorite" ? true : undefined,
        likes: updated.likes,
        favorites: updated.favorites
      };
    });
  }

  async recordRemake(userId: number, workId: number) {
    const work = await this.publicWork(workId);
    const updated = await this.prisma.work.update({
      where: { id: workId },
      data: { remakes: { increment: 1 } },
      select: { remakes: true }
    });
    if (work.userId !== userId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true }
      });
      await this.notifications.createSocialNotification({
        userId: work.userId,
        actorName: actor?.nickname ?? "",
        type: "remake",
        workTitle: work.title
      });
    }
    return { remakes: updated.remakes };
  }

  async reportWork(userId: number, workId: number, reason: string, description = "") {
    const work = await this.publicWork(workId);
    if (work.userId === userId) throw new BadRequestException("不能举报自己的作品");
    const existing = await this.prisma.report.findFirst({
      where: { workId, reporterId: userId, status: { in: ["pending", "processing"] } }
    });
    if (existing) {
      return {
        id: existing.id,
        status: existing.status,
        duplicated: true,
        createdAt: existing.createdAt.toISOString()
      };
    }
    const report = await this.prisma.report.create({
      data: {
        workId,
        reporterId: userId,
        reason: reason.trim(),
        description: description.trim()
      }
    });
    return {
      id: report.id,
      status: report.status,
      duplicated: false,
      createdAt: report.createdAt.toISOString()
    };
  }

  async profile(currentUserId: number | undefined, targetUserId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException("用户不存在");
    const follow =
      !currentUserId || currentUserId === targetUserId
        ? null
        : await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
          });
    return toUserCard(user, Boolean(follow));
  }

  async userWorks(targetUserId: number, page: number, pageSize: number) {
    const where: Prisma.WorkWhereInput = { userId: targetUserId, ...PUBLIC_WORK_WHERE };
    const [rows, total] = await Promise.all([
      this.prisma.work.findMany({ where, include: { user: true }, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.work.count({ where })
    ]);
    return buildPage(rows.map(toWorkCard), total, page, pageSize);
  }

  follow(currentUserId: number, targetUserId: number) {
    if (currentUserId === targetUserId) throw new BadRequestException("不能关注自己");
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: targetUserId } });
      if (!target) throw new NotFoundException("用户不存在");
      const existing = await tx.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
      });
      if (!existing) {
        await tx.follow.create({ data: { followerId: currentUserId, followingId: targetUserId } });
        await tx.user.update({ where: { id: currentUserId }, data: { following: { increment: 1 } } });
        await tx.user.update({ where: { id: targetUserId }, data: { followers: { increment: 1 } } });
        const actor = await tx.user.findUnique({
          where: { id: currentUserId },
          select: { nickname: true }
        });
        await tx.notification.create({
          data: {
            userId: targetUserId,
            type: "follow",
            title: "关注",
            content: `${actor?.nickname || "有用户"} 关注了你`
          }
        });
      }
      const updated = await tx.user.findUniqueOrThrow({ where: { id: targetUserId } });
      return { following: true, followers: updated.followers };
    });
  }

  unfollow(currentUserId: number, targetUserId: number) {
    if (currentUserId === targetUserId) throw new BadRequestException("不能取关自己");
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
      });
      if (existing) {
        await tx.follow.delete({ where: { id: existing.id } });
        await tx.user.update({ where: { id: currentUserId }, data: { following: { decrement: 1 } } });
        await tx.user.update({ where: { id: targetUserId }, data: { followers: { decrement: 1 } } });
      }
      const target = await tx.user.findUnique({ where: { id: targetUserId } });
      if (!target) throw new NotFoundException("用户不存在");
      return { following: false, followers: Math.max(0, target.followers) };
    });
  }

  async follows(currentUserId: number, type: "following" | "followers", page: number, pageSize: number) {
    const where = type === "following" ? { followerId: currentUserId } : { followingId: currentUserId };
    const [rows, total] = await Promise.all([
      this.prisma.follow.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.follow.count({ where })
    ]);
    const userIds = rows.map((row) => (type === "following" ? row.followingId : row.followerId));
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const byId = new Map(users.map((user) => [user.id, user]));
    const followingSet =
      type === "following"
        ? new Set(userIds)
        : new Set(
            (
              await this.prisma.follow.findMany({
                where: { followerId: currentUserId, followingId: { in: userIds } },
                select: { followingId: true }
              })
            ).map((row) => row.followingId)
          );
    const items = rows
      .map((row) => byId.get(type === "following" ? row.followingId : row.followerId))
      .filter((user): user is User => Boolean(user))
      .map((user) => toUserCard(user, followingSet.has(user.id)));
    return buildPage(items, total, page, pageSize);
  }

  async history(userId: number, page: number, pageSize: number) {
    const [views, total] = await Promise.all([
      this.prisma.workView.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.workView.count({ where: { userId } })
    ]);
    const workIds = views.map((view) => view.workId);
    const works = await this.prisma.work.findMany({
      where: { id: { in: workIds }, ...PUBLIC_WORK_WHERE },
      include: { user: true }
    });
    const byId = new Map(works.map((work) => [work.id, work]));
    const items = views
      .map((view) => {
        const work = byId.get(view.workId);
        return work ? { ...toWorkCard(work), viewedAt: view.viewedAt.toISOString() } : null;
      })
      .filter((work): work is NonNullable<typeof work> => Boolean(work));
    return buildPage(items, total, page, pageSize);
  }

  async clearHistory(userId: number) {
    await this.prisma.workView.deleteMany({ where: { userId } });
    return { ok: true };
  }
}
