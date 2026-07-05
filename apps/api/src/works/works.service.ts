import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, User, Work } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateWorkDto, UpdateWorkDto } from "./works.write.dto";

type WorkWithAuthor = Work & { user: User };

const PUBLIC_WHERE: Prisma.WorkWhereInput = { status: "published", isPublic: true };

function author(user: User) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarText: user.avatarText,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl ?? undefined
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
    author: author(work.user)
  };
}

@Injectable()
export class WorksService {
  constructor(private readonly prisma: PrismaService) {}

  private async listCards(where: Prisma.WorkWhereInput, orderBy: Prisma.WorkOrderByWithRelationInput[], page: number, pageSize: number) {
    const [rows, total] = await Promise.all([
      this.prisma.work.findMany({ where, orderBy, include: { user: true }, ...skipTake(page, pageSize) }),
      this.prisma.work.count({ where })
    ]);
    return buildPage(rows.map(toCard), total, page, pageSize);
  }

  feed(tab: "recommend" | "latest", page: number, pageSize: number) {
    if (tab === "latest") {
      return this.listCards(PUBLIC_WHERE, [{ createdAt: "desc" }], page, pageSize);
    }
    return this.listCards({ ...PUBLIC_WHERE, recommend: true }, [{ likes: "desc" }, { id: "desc" }], page, pageSize);
  }

  async plaza(categoryId: number | undefined, sort: "hot" | "latest", page: number, pageSize: number) {
    const where: Prisma.WorkWhereInput = { ...PUBLIC_WHERE };
    if (categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (category) {
        where.style = category.name;
      }
    }
    const orderBy: Prisma.WorkOrderByWithRelationInput[] =
      sort === "hot" ? [{ likes: "desc" }, { id: "desc" }] : [{ createdAt: "desc" }];
    return this.listCards(where, orderBy, page, pageSize);
  }

  search(keyword: string | undefined, page: number, pageSize: number) {
    const kw = (keyword ?? "").trim();
    const where: Prisma.WorkWhereInput = { ...PUBLIC_WHERE };
    if (kw) {
      where.OR = [{ title: { contains: kw } }, { prompt: { contains: kw } }];
    }
    return this.listCards(where, [{ likes: "desc" }, { id: "desc" }], page, pageSize);
  }

  async detail(id: number) {
    const work = await this.prisma.work.findUnique({ where: { id }, include: { user: true } });
    if (!work) {
      throw new NotFoundException("作品不存在");
    }
    const model = work.modelId
      ? await this.prisma.modelConfig.findUnique({ where: { id: work.modelId } })
      : null;
    return {
      id: work.id,
      imageUrl: work.imageUrl,
      title: work.title,
      description: work.description,
      prompt: work.prompt,
      ratio: work.ratio,
      quality: work.quality,
      modelId: work.modelId,
      modelName: model?.name ?? work.modelId,
      style: work.style,
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

  async publish(userId: number, dto: CreateWorkDto) {
    const manualReview = await this.isManualReview();
    const isPublic = dto.isPublic ?? true;
    const status = !isPublic ? "draft" : manualReview ? "pending" : "published";
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
        style: dto.style ?? "",
        isPublic,
        status
      }
    });
    await this.prisma.user.update({ where: { id: userId }, data: { worksCount: { increment: 1 } } });
    return this.detail(work.id);
  }

  async update(userId: number, id: number, dto: UpdateWorkDto) {
    await this.ownedWork(userId, id);
    const data: Prisma.WorkUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isPublic !== undefined) {
      data.isPublic = dto.isPublic;
      if (dto.isPublic) {
        data.status = (await this.isManualReview()) ? "pending" : "published";
      } else {
        data.status = "draft";
      }
    }
    await this.prisma.work.update({ where: { id }, data });
    return this.detail(id);
  }

  async remove(userId: number, id: number, action: "delete" | "offline" | "draft" = "delete") {
    await this.ownedWork(userId, id);
    if (action === "offline") {
      await this.prisma.work.update({ where: { id }, data: { status: "offline", isPublic: false } });
      return { ok: true, action };
    }
    if (action === "draft") {
      await this.prisma.work.update({ where: { id }, data: { status: "draft", isPublic: false } });
      return { ok: true, action };
    }
    await this.prisma.work.delete({ where: { id } });
    await this.prisma.user.update({ where: { id: userId }, data: { worksCount: { decrement: 1 } } });
    return { ok: true, action: "delete" };
  }

  async myGallery(userId: number, status: string | undefined, page: number, pageSize: number) {
    const where: Prisma.WorkWhereInput = { userId };
    if (status) where.status = status;
    const [rows, total] = await Promise.all([
      this.prisma.work.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.work.count({ where })
    ]);
    const items = rows.map((w) => ({
      id: w.id,
      imageUrl: w.imageUrl,
      title: w.title,
      ratio: w.ratio,
      status: w.status,
      isPublic: w.isPublic,
      likes: w.likes,
      favorites: w.favorites,
      createdAt: w.createdAt.toISOString()
    }));
    return buildPage(items, total, page, pageSize);
  }
}
