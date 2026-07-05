import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, User, Work } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { PrismaService } from "../prisma/prisma.service";

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
}
