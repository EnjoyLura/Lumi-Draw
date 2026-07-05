import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GenerateJob, GenerateResult, Prisma } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import type { CreateGenerateJobDto } from "./generate.dto";
import { KieClient } from "./kie.client";

type JobWithResults = GenerateJob & { results: GenerateResult[] };

const TERMINAL_STATUSES = new Set(["succeeded", "partial_failed", "failed", "cancelled"]);
const RETRYABLE_STATUSES = new Set(["failed", "partial_failed", "cancelled"]);

@Injectable()
export class GenerateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly kie: KieClient,
    private readonly config: ConfigService,
    private readonly uploads: UploadsService
  ) {}

  async createJob(userId: number, dto: CreateGenerateJobDto, retryOfJobId = "") {
    const normalized = this.normalizeCreateDto(dto);
    const [model, quality, ratio] = await Promise.all([
      this.prisma.modelConfig.findFirst({ where: { id: normalized.modelId, enabled: true } }),
      this.resolveQuality(normalized.quality),
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

    const submitted = await this.submitToProvider(created.job.id);

    return {
      jobId: submitted.id,
      status: submitted.status,
      costCredits,
      creditsAfter: submitted.status === "failed" ? submitted.creditsAfter : created.balance,
      job: this.toJobView(submitted.job)
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

  async handleCallback(body: Record<string, unknown>, secret?: string) {
    const callbackSecret = this.config.get<string>("app.callbackSecret");
    if (callbackSecret && secret !== callbackSecret) throw new UnauthorizedException("invalid callback secret");

    const event = this.normalizeCallback(body);
    if (!event.taskId) throw new BadRequestException("callback missing taskId");

    const job = await this.prisma.generateJob.findUnique({ where: { kieTaskId: event.taskId }, include: { results: true } });
    if (!job) throw new NotFoundException("generate job not found");
    if (TERMINAL_STATUSES.has(job.status)) return this.toJobView(job);

    if (event.status === "succeeded") {
      if (!event.imageUrls.length) {
        const failed = await this.failAndRefund(job.id, "KIE callback did not include images");
        return this.toJobView(failed.job);
      }
      const results = await this.transferGeneratedImages(job.id, event.imageUrls);
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.generateResult.deleteMany({ where: { jobId: job.id } });
        await tx.generateResult.createMany({
          data: results.map((result) => ({
            jobId: job.id,
            status: "succeeded",
            imageUrl: result.imageUrl,
            ossKey: result.ossKey,
            sizeBytes: result.sizeBytes
          }))
        });
        return tx.generateJob.update({
          where: { id: job.id },
          data: {
            status: "succeeded",
            progress: 100,
            stageText: "Generation completed",
            errorMessage: "",
            finishedAt: new Date()
          },
          include: { results: true }
        });
      });
      return this.toJobView(updated);
    }

    if (event.status === "failed") {
      const failed = await this.failAndRefund(job.id, event.errorMessage || "KIE task failed");
      return this.toJobView(failed.job);
    }

    const running = await this.prisma.generateJob.update({
      where: { id: job.id },
      data: {
        status: event.status,
        progress: event.status === "running" ? Math.max(job.progress, 30) : job.progress,
        stageText: event.stageText || "Generation is processing",
        startedAt: job.startedAt ?? new Date()
      },
      include: { results: true }
    });
    return this.toJobView(running);
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

  private async resolveQuality(value: string) {
    const normalized = value.trim();
    const exact = await this.prisma.qualityConfig.findFirst({ where: { label: normalized, enabled: true } });
    if (exact) return exact;

    const shorthand = normalized.match(/\b(1K|2K|4K)\b/i)?.[1]?.toUpperCase();
    if (!shorthand) return null;
    return this.prisma.qualityConfig.findFirst({
      where: { enabled: true, OR: [{ label: { contains: shorthand } }, { pixel: { contains: shorthand.replace("K", "") } }] },
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
  }

  private async submitToProvider(jobId: string) {
    const job = await this.prisma.generateJob.findUniqueOrThrow({ where: { id: jobId }, include: { results: true } });
    if (!this.kie.isConfigured()) {
      return { job, id: job.id, status: job.status, creditsAfter: undefined as number | undefined };
    }

    const model = await this.prisma.modelConfig.findUniqueOrThrow({ where: { id: job.modelId } });
    try {
      const submitted = await this.kie.submitGenerateJob({
        jobId: job.id,
        mode: job.mode,
        model,
        prompt: job.prompt,
        inputImageUrl: job.inputImageUrl,
        ratio: job.ratio,
        quality: job.quality,
        count: job.count
      });
      const updated = await this.prisma.generateJob.update({
        where: { id: job.id },
        data: {
          status: "running",
          progress: 5,
          stageText: "Submitted to KIE",
          kieTaskId: submitted.taskId,
          startedAt: new Date()
        },
        include: { results: true }
      });
      return { job: updated, id: updated.id, status: updated.status, creditsAfter: undefined as number | undefined };
    } catch (error) {
      const failed = await this.failAndRefund(job.id, error instanceof Error ? error.message : "KIE submit failed");
      return { job: failed.job, id: failed.job.id, status: failed.job.status, creditsAfter: failed.balance };
    }
  }

  private async failAndRefund(jobId: string, errorMessage: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.generateJob.findUniqueOrThrow({ where: { id: jobId }, include: { results: true } });
      const refundCredits = job.costCredits - job.refundCredits;
      const updated = await tx.generateJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          progress: 0,
          stageText: "Generation failed",
          errorMessage: errorMessage.slice(0, 500),
          refundCredits: job.refundCredits + Math.max(refundCredits, 0),
          finishedAt: new Date()
        },
        include: { results: true }
      });
      const { balance } =
        refundCredits > 0
          ? await this.credits.addTransactionInTx(tx, job.userId, "refund", refundCredits, "AI generation failed refund", job.id)
          : { balance: (await tx.user.findUniqueOrThrow({ where: { id: job.userId }, select: { credits: true } })).credits };
      return { job: updated, balance };
    });
  }

  private async transferGeneratedImages(jobId: string, imageUrls: string[]) {
    const results = [];
    try {
      for (const imageUrl of imageUrls) {
        const transferred = await this.uploads.transferRemoteImage("generate", imageUrl);
        results.push(transferred);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "OSS transfer failed";
      await this.failAndRefund(jobId, message);
      throw new BadRequestException(message);
    }
    return results;
  }

  private normalizeCallback(body: Record<string, unknown>) {
    const data = this.asRecord(body.data) ?? body;
    const result = this.parseJsonRecord(data.resultJson);
    const state = String(data.state ?? data.status ?? body.state ?? body.status ?? "");
    const taskId = String(data.taskId ?? body.taskId ?? "");
    const imageUrls = this.extractImageUrls(result);
    return {
      taskId,
      status: this.mapKieState(state),
      imageUrls,
      stageText: String(data.stageText ?? data.msg ?? body.msg ?? ""),
      errorMessage: String(data.failMsg ?? data.errorMessage ?? data.msg ?? body.msg ?? "")
    };
  }

  private parseJsonRecord(value: unknown) {
    if (!value) return undefined;
    if (typeof value === "object") return this.asRecord(value);
    if (typeof value !== "string") return undefined;
    try {
      return this.asRecord(JSON.parse(value));
    } catch {
      return undefined;
    }
  }

  private extractImageUrls(result: Record<string, unknown> | undefined) {
    if (!result) return [];
    const candidates = [result.resultUrls, result.result_urls, result.urls, result.images, result.imageUrls];
    const urls: string[] = [];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          if (typeof item === "string") urls.push(item);
          else {
            const itemRecord = this.asRecord(item);
            const url = itemRecord ? itemRecord.url ?? itemRecord.imageUrl : undefined;
            if (typeof url === "string") urls.push(url);
          }
        }
      } else if (typeof candidate === "string") {
        urls.push(candidate);
      }
    }
    return [...new Set(urls.filter(Boolean))];
  }

  private mapKieState(state: string) {
    const normalized = state.toLowerCase();
    if (["success", "succeeded", "completed"].includes(normalized)) return "succeeded";
    if (["fail", "failed", "error"].includes(normalized)) return "failed";
    if (["generating", "running", "processing"].includes(normalized)) return "running";
    return "queued";
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    return undefined;
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
