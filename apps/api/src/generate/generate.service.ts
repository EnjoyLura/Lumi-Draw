import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { GenerateJob, GenerateResult, Prisma } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateGenerateJobDto } from "./generate.dto";

type JobWithResults = GenerateJob & { results: GenerateResult[] };

const TERMINAL_STATUSES = new Set(["succeeded", "partial_failed", "failed", "cancelled"]);
const RETRYABLE_STATUSES = new Set(["failed", "partial_failed", "cancelled"]);

@Injectable()
export class GenerateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService
  ) {}

  async createJob(userId: number, dto: CreateGenerateJobDto, retryOfJobId = "") {
    const normalized = this.normalizeCreateDto(dto);
    const [model, quality, ratio] = await Promise.all([
      this.prisma.modelConfig.findFirst({ where: { id: normalized.modelId, enabled: true } }),
      this.prisma.qualityConfig.findFirst({ where: { label: normalized.quality, enabled: true } }),
      this.prisma.ratioConfig.findFirst({ where: { label: normalized.ratio, enabled: true } })
    ]);

    if (!model) throw new BadRequestException("模型不可用");
    if (!quality) throw new BadRequestException("分辨率不可用");
    if (!ratio) throw new BadRequestException("尺寸比例不可用");
    if (normalized.mode === "text-to-image" && !model.supportsTextToImage) throw new BadRequestException("该模型不支持文生图");
    if (normalized.mode === "image-to-image" && !model.supportsImageToImage) throw new BadRequestException("该模型不支持图生图");
    if (normalized.mode === "image-to-image" && !normalized.inputImageUrl) throw new BadRequestException("图生图需要参考图");

    const costCredits = Math.ceil(model.costCredits * quality.multiplier * normalized.count);

    const created = await this.prisma.$transaction(async (tx) => {
      const job = await tx.generateJob.create({
        data: {
          userId,
          mode: normalized.mode,
          modelId: model.id,
          provider: model.provider,
          providerModel: model.providerModel,
          prompt: normalized.prompt,
          inputImageUrl: normalized.inputImageUrl,
          gameplayId: normalized.gameplayId,
          style: normalized.style,
          ratio: ratio.label,
          quality: quality.label,
          count: normalized.count,
          costCredits,
          status: "queued",
          progress: 0,
          stageText: "任务已创建，等待进入生成队列",
          retryOfJobId
        },
        include: { results: true }
      });
      const { balance } = await this.credits.addTransactionInTx(
        tx,
        userId,
        "consume",
        -costCredits,
        `AI生成任务：${model.name}`,
        job.id
      );
      return { job, balance };
    });

    return {
      jobId: created.job.id,
      status: created.job.status,
      costCredits,
      creditsAfter: created.balance,
      job: this.toJobView(created.job)
    };
  }

  async getJob(userId: number, id: string) {
    const job = await this.prisma.generateJob.findUnique({ where: { id }, include: { results: true } });
    if (!job) throw new NotFoundException("生成任务不存在");
    if (job.userId !== userId) throw new ForbiddenException("无权查看该任务");
    return this.toJobView(job);
  }

  async listJobs(userId: number, status: string | undefined, page: number, pageSize: number) {
    const where: Prisma.GenerateJobWhereInput = { userId };
    if (status) where.status = status;
    const [rows, total] = await Promise.all([
      this.prisma.generateJob.findMany({
        where,
        include: { results: true },
        orderBy: { createdAt: "desc" },
        ...skipTake(page, pageSize)
      }),
      this.prisma.generateJob.count({ where })
    ]);
    return buildPage(rows.map((job) => this.toJobView(job)), total, page, pageSize);
  }

  async cancelJob(userId: number, id: string) {
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const job = await tx.generateJob.findUnique({ where: { id }, include: { results: true } });
      if (!job) throw new NotFoundException("生成任务不存在");
      if (job.userId !== userId) throw new ForbiddenException("无权取消该任务");
      if (TERMINAL_STATUSES.has(job.status)) throw new BadRequestException("任务已结束，不能取消");

      const refundCredits = job.costCredits - job.refundCredits;
      const updated = await tx.generateJob.update({
        where: { id },
        data: {
          status: "cancelled",
          progress: 0,
          stageText: "任务已取消",
          refundCredits,
          cancelledAt: new Date(),
          finishedAt: new Date()
        },
        include: { results: true }
      });
      const { balance } =
        refundCredits > 0
          ? await this.credits.addTransactionInTx(tx, userId, "refund", refundCredits, "取消生成任务退回积分", id)
          : { balance: (await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } })).credits };
      return { job: updated, balance };
    });

    return { ...this.toJobView(cancelled.job), creditsAfter: cancelled.balance };
  }

  async retryJob(userId: number, id: string) {
    const source = await this.prisma.generateJob.findUnique({ where: { id } });
    if (!source) throw new NotFoundException("生成任务不存在");
    if (source.userId !== userId) throw new ForbiddenException("无权重试该任务");
    if (!RETRYABLE_STATUSES.has(source.status)) throw new BadRequestException("当前任务状态不能重试");

    return this.createJob(
      userId,
      {
        mode: source.mode as "text-to-image" | "image-to-image",
        modelId: source.modelId,
        prompt: source.prompt,
        inputImageUrl: source.inputImageUrl || undefined,
        gameplayId: source.gameplayId ?? undefined,
        style: source.style || undefined,
        ratio: source.ratio,
        quality: source.quality,
        count: source.count
      },
      source.id
    );
  }

  private normalizeCreateDto(dto: CreateGenerateJobDto) {
    return {
      mode: dto.mode,
      modelId: dto.modelId.trim(),
      prompt: dto.prompt.trim(),
      inputImageUrl: (dto.inputImageUrl ?? "").trim(),
      gameplayId: dto.gameplayId,
      style: (dto.style ?? "").trim(),
      ratio: dto.ratio.trim(),
      quality: dto.quality.trim(),
      count: dto.count ?? 1
    };
  }

  private toJobView(job: JobWithResults) {
    return {
      id: job.id,
      mode: job.mode,
      modelId: job.modelId,
      provider: job.provider,
      providerModel: job.providerModel,
      prompt: job.prompt,
      inputImageUrl: job.inputImageUrl || undefined,
      gameplayId: job.gameplayId ?? undefined,
      style: job.style,
      ratio: job.ratio,
      quality: job.quality,
      count: job.count,
      costCredits: job.costCredits,
      refundCredits: job.refundCredits,
      status: job.status,
      progress: job.progress,
      stageText: job.stageText,
      kieTaskId: job.kieTaskId ?? undefined,
      errorMessage: job.errorMessage || undefined,
      retryOfJobId: job.retryOfJobId || undefined,
      results: job.results.map((result) => ({
        id: result.id,
        status: result.status,
        imageUrl: result.imageUrl || undefined,
        width: result.width ?? undefined,
        height: result.height ?? undefined,
        sizeBytes: result.sizeBytes ?? undefined,
        ossKey: result.ossKey || undefined,
        errorMessage: result.errorMessage || undefined,
        workId: result.workId ?? undefined,
        createdAt: result.createdAt.toISOString()
      })),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      cancelledAt: job.cancelledAt?.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      finishedAt: job.finishedAt?.toISOString()
    };
  }
}
