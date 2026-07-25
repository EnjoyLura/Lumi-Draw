import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WechatContentSafetyService } from "../content-safety/wechat-content-safety.service";
import type { CreateFeedbackDto } from "./feedback.dto";

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: WechatContentSafetyService
  ) {}

  async create(userId: number, dto: CreateFeedbackDto) {
    const content = dto.content.trim();
    if (!content && !dto.imageUrls?.length) {
      throw new BadRequestException("反馈内容或截图至少填写一项");
    }
    await this.safety.checkText(userId, [content, dto.wechat], 2);

    const row = await this.prisma.feedback.create({
      data: {
        userId,
        type: dto.type,
        content,
        imageUrls: (dto.imageUrls ?? []).filter(Boolean).join(","),
        wechat: dto.wechat?.trim() ?? ""
      }
    });

    return {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt.toISOString()
    };
  }
}
