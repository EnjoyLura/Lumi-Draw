import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, User, Work } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import type { CreateWorkDto, UpdateWorkDto } from "./works.write.dto";

type WorkWithAuthor = Work & { user: User };
type PlazaFilters = {
  categoryId?: number;
  categoryIds?: string;
  modelIds?: string;
  ratios?: string;
  qualities?: string;
};

const PUBLIC_WHERE: Prisma.WorkWhereInput = { status: "published", isPublic: true };

function author(user: User) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarText: user.avatarText,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl ?? undefined,
    worksCount: user.worksCount,
    likesCount: user.likesCount,
    followers: user.followers,
    following: user.following
  };
}

function toCard(work: WorkWithAuthor) {
  return {
    id: work.id,
    imageUrl: work.imageUrl,
    title: work.title,
    prompt: work.prompt,
    ratio: work.ratio,
    likes: work.likes,
    favorites: work.favorites,
    remakes: work.remakes,
    author: author(work.user)
  };
}

function splitCsv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitCsvNumbers(value?: string) {
  return splitCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function normalizeTags(tags?: string[], fallback = "") {
  const cleaned = (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!cleaned.length && fallback.trim()) cleaned.push(fallback.trim());
  return Array.from(new Set(cleaned));
}

async function withInteractionState(prisma: PrismaService, userId: number | undefined, cards: ReturnType<typeof toCard>[]) {
  if (!userId || cards.length === 0) return cards;

  const interactions = await prisma.workInteraction.findMany({
    where: {
      userId,
      workId: { in: cards.map((card) => card.id) },
      type: { in: ["like", "favorite"] }
    },
    select: { workId: true, type: true }
  });
  const likedIds = new Set(interactions.filter((item) => item.type === "like").map((item) => item.workId));
  const favoritedIds = new Set(interactions.filter((item) => item.type === "favorite").map((item) => item.workId));
  return cards.map((card) => ({
    ...card,
    liked: likedIds.has(card.id),
    favorited: favoritedIds.has(card.id)
  }));
}

@Injectable()
export class WorksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly credits: CreditsService
  ) {}

  private toCard(work: WorkWithAuthor) {
    return {
      ...toCard(work),
      imageUrl: this.uploads.readUrl(work.imageUrl, "public"),
      thumbnailUrl: this.uploads.readStyledPublicUrl(work.imageUrl, "lumi-card")
    };
  }

  private async listCards(
    where: Prisma.WorkWhereInput,
    orderBy: Prisma.WorkOrderByWithRelationInput[],
    page: number,
    pageSize: number,
    currentUserId?: number
  ) {
    const [rows, total] = await Promise.all([
      this.prisma.work.findMany({ where, orderBy, include: { user: true }, ...skipTake(page, pageSize) }),
      this.prisma.work.count({ where })
    ]);
    const items = await withInteractionState(this.prisma, currentUserId, rows.map((work) => this.toCard(work)));
    return buildPage(items, total, page, pageSize);
  }

  feed(tab: "recommend" | "latest", page: number, pageSize: number, currentUserId?: number) {
    if (tab === "latest") {
      return this.listCards(PUBLIC_WHERE, [{ createdAt: "desc" }], page, pageSize, currentUserId);
    }
    return this.listCards({ ...PUBLIC_WHERE, recommend: true }, [{ likes: "desc" }, { id: "desc" }], page, pageSize, currentUserId);
  }

  async plaza(filters: PlazaFilters, sort: "hot" | "latest", page: number, pageSize: number, currentUserId?: number) {
    const where: Prisma.WorkWhereInput = { ...PUBLIC_WHERE };
    const categoryIds = Array.from(new Set([filters.categoryId, ...splitCsvNumbers(filters.categoryIds)].filter((id): id is number => Boolean(id))));
    if (categoryIds.length) {
      const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });
      const names = categories.map((category) => category.name);
      if (names.length) where.style = { in: names };
    }
    const modelIds = splitCsv(filters.modelIds);
    if (modelIds.length) where.modelId = { in: modelIds };
    const ratios = splitCsv(filters.ratios);
    if (ratios.length) where.ratio = { in: ratios };
    const qualities = splitCsv(filters.qualities);
    if (qualities.length) where.quality = { in: qualities };
    const orderBy: Prisma.WorkOrderByWithRelationInput[] =
      sort === "hot" ? [{ likes: "desc" }, { id: "desc" }] : [{ createdAt: "desc" }];
    return this.listCards(where, orderBy, page, pageSize, currentUserId);
  }

  search(keyword: string | undefined, page: number, pageSize: number, currentUserId?: number) {
    const kw = (keyword ?? "").trim();
    const where: Prisma.WorkWhereInput = { ...PUBLIC_WHERE };
    if (kw) {
      where.OR = [{ title: { contains: kw } }, { prompt: { contains: kw } }];
    }
    return this.listCards(where, [{ likes: "desc" }, { id: "desc" }], page, pageSize, currentUserId);
  }

  async detail(id: number, currentUserId?: number) {
    const work = await this.prisma.work.findUnique({ where: { id }, include: { user: true } });
    if (!work) {
      throw new NotFoundException("作品不存在");
    }
    if ((work.status !== "published" || !work.isPublic) && work.userId !== currentUserId) {
      throw new NotFoundException("work not found");
    }
    const model = work.modelId
      ? await this.prisma.modelConfig.findUnique({ where: { id: work.modelId } })
      : null;
    const visibility = work.status === "published" && work.isPublic ? "public" : "private";
    return {
      id: work.id,
      imageUrl: this.uploads.readUrl(work.imageUrl, visibility),
      previewUrl: visibility === "public" ? this.uploads.readStyledPublicUrl(work.imageUrl, "lumi-preview") : this.uploads.readUrl(work.imageUrl, visibility),
      title: work.title,
      description: work.description,
      prompt: work.prompt,
      ratio: work.ratio,
      quality: work.quality,
      modelId: work.modelId,
      modelName: model?.name ?? work.modelId,
      style: work.style,
      tags: work.tags,
      status: work.status,
      likes: work.likes,
      favorites: work.favorites,
      remakes: work.remakes,
      isPublic: work.isPublic,
      createdAt: work.createdAt.toISOString(),
      author: author(work.user)
    };
  }

  private async isManualReview() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: "manualReviewEnabled" } });
    return row ? row.value === "true" : true;
  }

  private async ownedWork(userId: number, id: number) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("作品不存在");
    if (work.userId !== userId) throw new ForbiddenException("无权操作该作品");
    return work;
  }

  private async awardPublishReward(userId: number, workId: number) {
    const refId = `publish_reward:${workId}`;
    const alreadyRewarded = await this.prisma.creditTransaction.findFirst({ where: { userId, refId }, select: { id: true } });
    if (alreadyRewarded) return 0;

    const [setting, user] = await Promise.all([
      this.prisma.appSetting.findUnique({ where: { key: "creditsConfig" } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { memberPlan: true, memberExpireAt: true } })
    ]);
    let baseReward = 50;
    try {
      baseReward = Number(JSON.parse(setting?.value ?? "{}").publishReward ?? 50);
    } catch {
      // Keep the safe default when the stored settings cannot be parsed.
    }

    let memberBonus = 0;
    if (user?.memberPlan && (!user.memberExpireAt || user.memberExpireAt.getTime() > Date.now())) {
      const plan = await this.prisma.memberPlan.findFirst({ where: { name: user.memberPlan, enabled: true }, select: { publishBonus: true } });
      memberBonus = plan?.publishBonus ?? 0;
    }
    const amount = Math.max(0, baseReward) + Math.max(0, memberBonus);
    if (!amount) return 0;
    await this.credits.addTransaction(
      userId,
      "adjust",
      amount,
      memberBonus ? `发布作品奖励（会员加成 +${memberBonus}）` : "发布作品奖励",
      refId
    );
    return amount;
  }

  async publish(userId: number, dto: CreateWorkDto) {
    const manualReview = await this.isManualReview();
    const isPublic = dto.isPublic ?? true;
    const status = !isPublic ? "draft" : manualReview ? "pending" : "published";
    const tags = normalizeTags(dto.tags, dto.style);
    const work = await this.prisma.work.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? "",
        prompt: dto.prompt ?? "",
        imageUrl: dto.imageUrl,
        ratio: dto.ratio ?? "1:1",
        quality: dto.quality ?? "1K",
        modelId: dto.modelId ?? "",
        style: dto.style ?? tags[0] ?? "",
        tags,
        isPublic,
        status
      }
    });
    await this.prisma.user.update({ where: { id: userId }, data: { worksCount: { increment: 1 } } });
    if (isPublic) await this.awardPublishReward(userId, work.id);
    return this.detail(work.id, userId);
  }

  async update(userId: number, id: number, dto: UpdateWorkDto) {
    const existing = await this.ownedWork(userId, id);
    const data: Prisma.WorkUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.style !== undefined) data.style = dto.style;
    if (dto.tags !== undefined) {
      const tags = normalizeTags(dto.tags, dto.style);
      data.tags = tags;
      data.style = dto.style ?? tags[0] ?? "";
    }
    if (dto.isPublic !== undefined) {
      data.isPublic = dto.isPublic;
      if (dto.isPublic) {
        data.status = (await this.isManualReview()) ? "pending" : "published";
      } else {
        data.status = "draft";
      }
    }
    await this.prisma.work.update({ where: { id }, data });
    if (dto.isPublic && !existing.isPublic) await this.awardPublishReward(userId, id);
    return this.detail(id, userId);
  }

  async remove(userId: number, id: number, action: "delete" | "offline" | "draft" = "delete") {
    const work = await this.ownedWork(userId, id);
    if (action === "offline") {
      await this.prisma.work.update({ where: { id }, data: { status: "offline", isPublic: false } });
      return { ok: true, action };
    }
    if (action === "draft") {
      await this.prisma.work.update({ where: { id }, data: { status: "draft", isPublic: false } });
      return { ok: true, action };
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.workInteraction.deleteMany({ where: { workId: id } });
      await tx.workView.deleteMany({ where: { workId: id } });
      await tx.report.deleteMany({ where: { workId: id } });
      await tx.generateResult.updateMany({ where: { workId: id }, data: { workId: null } });
      await tx.work.delete({ where: { id } });
      await tx.user.updateMany({
        where: { id: userId, worksCount: { gt: 0 } },
        data: { worksCount: { decrement: 1 } }
      });
      if (work.likes > 0) {
        await tx.user.updateMany({
          where: { id: userId, likesCount: { gte: work.likes } },
          data: { likesCount: { decrement: work.likes } }
        });
        await tx.user.updateMany({
          where: { id: userId, likesCount: { lt: work.likes } },
          data: { likesCount: 0 }
        });
      }
    });
    return { ok: true, action: "delete" };
  }

  async myGallery(userId: number, status: string | undefined, page: number, pageSize: number) {
    const where: Prisma.WorkWhereInput = { userId };
    if (status) where.status = status;
    const [rows, total] = await Promise.all([
      this.prisma.work.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.work.count({ where })
    ]);
    const modelIds = Array.from(new Set(rows.map((work) => work.modelId).filter(Boolean)));
    const models = modelIds.length
      ? await this.prisma.modelConfig.findMany({ where: { id: { in: modelIds } }, select: { id: true, name: true } })
      : [];
    const modelNames = new Map(models.map((model) => [model.id, model.name]));
    const items = rows.map((w) => ({
      id: w.id,
      imageUrl: this.uploads.readUrl(w.imageUrl, w.status === "published" && w.isPublic ? "public" : "private"),
      thumbnailUrl:
        w.status === "published" && w.isPublic
          ? this.uploads.readStyledPublicUrl(w.imageUrl, "lumi-card")
          : this.uploads.readUrl(w.imageUrl, "private"),
      title: w.title,
      ratio: w.ratio,
      status: w.status,
      isPublic: w.isPublic,
      likes: w.likes,
      favorites: w.favorites,
      modelId: w.modelId,
      modelName: modelNames.get(w.modelId) ?? w.modelId,
      createdAt: w.createdAt.toISOString()
    }));
    return buildPage(items, total, page, pageSize);
  }
}
