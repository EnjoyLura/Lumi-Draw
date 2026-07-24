import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";

export async function assertNoSensitiveContent(prisma: PrismaService, values: Array<string | null | undefined>) {
  const content = values.filter((value): value is string => Boolean(value?.trim())).join("\n").toLocaleLowerCase();
  if (!content) return;
  const words = await prisma.sensitiveWord.findMany({ select: { word: true } });
  const blocked = words.some(({ word }) => {
    const normalized = word.trim().toLocaleLowerCase();
    return normalized.length > 0 && content.includes(normalized);
  });
  if (blocked) throw new BadRequestException("内容包含不适合发布的信息，请修改后重试");
}
