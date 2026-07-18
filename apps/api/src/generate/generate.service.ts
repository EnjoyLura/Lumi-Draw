import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnApplicationBootstrap, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import type { GenerateJob, GenerateResult } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import type { CreateGenerateJobDto, PublishGenerateResultDto, ReversePromptDto } from "./generate.dto";
import { Change2ProClient, normalizeImage2Size, type Change2ProOutput } from "./change2pro.client";
import { AinbClient } from "./ainb.client";
import { ImageTransferClient } from "./image-transfer.client";
import { KieClient } from "./kie.client";

type JobWithResults = GenerateJob & { results: GenerateResult[] };
type ProviderEvent = {
  taskId: string;
  status: string;
  imageUrls: string[];
  stageText: string;
  errorMessage: string;
  progress?: number;
};
type GeneratedImage = {
  imageUrl: string;
  ossKey: string;
  sizeBytes: number;
};

const TERMINAL_STATUSES = new Set(["succeeded", "partial_failed", "failed", "cancelled"]);
const ACTIVE_JOB_STATUSES = ["queued", "running", "finalizing"];
const RETRYABLE_STATUSES = new Set(["failed", "partial_failed", "cancelled"]);
const JOB_STATUSES = new Set(["queued", "running", "succeeded", "partial_failed", "failed", "cancelled"]);
const REVERSE_PROMPT_COST = 2;

function userFacingGenerateError(errorMessage: string) {
  const message = errorMessage.toLowerCase();
  if (/服务重启/.test(message)) return "生成服务已重启，本次任务已自动退款";
  if (/unsafe|safety|content.*(?:policy|filter)|不安全|违规|敏感/.test(message)) return "内容可能不安全，请修改提示词重试";
  if (/尺寸|size|pixel|最长边/.test(message)) return "当前模型不支持所选图片尺寸，请调整比例或清晰度后重试";
  if (/429|rate limit|任务较多|too many requests/.test(message)) return "当前生成任务较多，请稍后重试";
  if (/超时|timeout|aborted/.test(message)) return "生成等待超时，请稍后重试";
  if (/参考图|input image|image.*(?:invalid|download)/.test(message)) return "参考图不可用，请重新上传后重试";
  if (/连接失败|network|fetch failed|econn|enotfound/.test(message)) return "生成服务连接异常，请稍后重试";
  if (/did not include an image|no usable images|未获取到/.test(message)) return "未获取到生成图片，请稍后重试";
  return "生成失败，请稍后重试";
}

function mockGeneratedImageUrl(seed: string) {
  const colors = [
    ["#5b9fe8", "#62c9b7", "#f6b28f"],
    ["#8b7cf6", "#63c6f2", "#ffe083"],
    ["#ff7f73", "#ffc766", "#74d4b3"],
    ["#6f8ff2", "#b797f4", "#f8a6c2"]
  ];
  const hash = Array.from(seed).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
  const [a, b, c] = colors[hash % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".58" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient><radialGradient id="r" cx="32%" cy="26%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".78"/><stop offset=".45" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><circle cx="${220 + (hash % 420)}" cy="260" r="310" fill="url(#r)"/><path d="M0 742 C250 576 430 930 1024 635 L1024 1024 L0 1024 Z" fill="#0f1f3a" opacity=".2"/><path d="M0 842 C260 716 560 1005 1024 778 L1024 1024 L0 1024 Z" fill="#fff" opacity=".2"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

@Injectable()
export class GenerateService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly kie: KieClient,
    private readonly change2pro: Change2ProClient,
    private readonly ainb: AinbClient,
    private readonly imageTransfer: ImageTransferClient,
    private readonly config: ConfigService,
    private readonly uploads: UploadsService
  ) {}

  async onApplicationBootstrap() {
    const interrupted = await this.prisma.generateJob.findMany({
      where: { provider: "change2pro", status: { in: ["queued", "running", "finalizing"] } },
      select: { id: true }
    });
    for (const job of interrupted) {
      await this.failAndRefund(job.id, "生成服务重启，任务已自动退款").catch(() => undefined);
    }
    await this.resumeAinbJobsAfterRestart();
  }

  private async resumeAinbJobsAfterRestart() {
    const jobs = await this.prisma.generateJob.findMany({
      where: { provider: "ainb", status: { in: ["queued", "running", "finalizing"] } },
      include: { results: true }
    });
    for (const job of jobs) {
      if (job.status === "finalizing") {
        this.resumeAinbTransfers(job);
        continue;
      }
      if (!job.kieTaskId) {
        await this.failAndRefund(job.id, "generation service restarted before task could resume").catch(() => undefined);
        continue;
      }
      void this.completeAinbJob(job).catch(async (error) => {
        await this.failProviderJobIfActive(job.id, error instanceof Error ? error.message : "Ainb generation failed");
      });
    }
  }

  private resumeAinbTransfers(job: JobWithResults) {
    if (!this.imageTransfer.isConfigured()) return;
    for (const result of job.results.filter((item) => item.status === "transferring" && item.imageUrl && item.ossKey)) {
      this.imageTransfer.dispatchInBackground({ jobId: job.id, resultId: result.id, sourceUrl: result.imageUrl, objectKey: result.ossKey });
    }
  }

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

    const useAinb = this.ainb.isConfiguredFor(model.id, normalized.mode);
    const useChange2Pro = !useAinb && this.change2pro.isConfiguredFor(model.id);
    if ((useAinb || useChange2Pro) && model.id === "gpt-image-2") normalizeImage2Size(ratio.label, quality.label);
    const costCredits = Math.ceil(model.costCredits * quality.multiplier * normalized.count);
    const created = await this.prisma.$transaction(async (tx) => {
      // Serialize per user so rapid taps and parallel clients cannot consume credits twice.
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      const activeJob = await tx.generateJob.findFirst({
        where: { userId, status: { in: ACTIVE_JOB_STATUSES } },
        select: { id: true }
      });
      if (activeJob) throw new ConflictException("A generation task is already in progress");

      const job = await tx.generateJob.create({
        data: {
          userId,
          mode: normalized.mode,
          modelId: model.id,
          provider: useAinb ? "ainb" : useChange2Pro ? "change2pro" : model.provider,
          providerModel: useAinb ? "gpt-image-2" : useChange2Pro ? this.change2pro.providerModel(model.id) || model.providerModel : model.providerModel,
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
    return this.toJobView(await this.syncProviderJob(job));
  }

  async listJobs(userId: number, status: string | undefined, page: number, pageSize: number) {
    const where: Prisma.GenerateJobWhereInput = { userId };
    const statuses = this.parseStatusQuery(status);
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
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

  private parseStatusQuery(status: string | undefined) {
    if (!status) return [];
    const statuses = [...new Set(status.split(",").map((item) => item.trim()).filter(Boolean))];
    if (statuses.some((item) => !JOB_STATUSES.has(item))) throw new BadRequestException("invalid generate job status");
    return statuses;
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

  async publishResult(userId: number, resultId: string, dto: PublishGenerateResultDto) {
    const result = await this.prisma.generateResult.findUnique({ where: { id: resultId }, include: { job: true } });
    if (!result) throw new NotFoundException("generate result not found");
    if (result.job.userId !== userId) throw new ForbiddenException("no permission to publish this result");
    if (result.status !== "succeeded" || !result.imageUrl) throw new BadRequestException("generate result is not publishable");
    if (result.workId) throw new ConflictException("generate result has already been published");

    const manualReview = await this.isManualReview();
    const isPublic = dto.isPublic ?? true;
    const status = !isPublic ? "draft" : manualReview ? "pending" : "published";

    const published = await this.prisma.$transaction(async (tx) => {
      const work = await tx.work.create({
        data: {
          userId,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? "",
          prompt: result.job.prompt,
          imageUrl: result.imageUrl,
          ratio: result.job.ratio,
          quality: result.job.quality,
          modelId: result.job.modelId,
          style: result.job.style,
          isPublic,
          status
        }
      });
      const linked = await tx.generateResult.updateMany({ where: { id: result.id, workId: null }, data: { workId: work.id } });
      if (linked.count === 0) throw new ConflictException("generate result has already been published");
      await tx.user.update({ where: { id: userId }, data: { worksCount: { increment: 1 } } });
      return work;
    });

    return {
      workId: published.id,
      status: published.status,
      isPublic: published.isPublic,
      work: {
        id: published.id,
        imageUrl: this.uploads.readUrl(
          published.imageUrl,
          published.status === "published" && published.isPublic ? "public" : "private"
        ),
        title: published.title,
        description: published.description,
        prompt: published.prompt,
        ratio: published.ratio,
        quality: published.quality,
        modelId: published.modelId,
        style: published.style,
        status: published.status,
        isPublic: published.isPublic,
        createdAt: published.createdAt.toISOString()
      }
    };
  }

  async reversePrompt(userId: number, dto: ReversePromptDto) {
    const imageUrl = dto.imageUrl.trim();
    if (!/^https?:\/\//i.test(imageUrl)) throw new BadRequestException("imageUrl must be a public URL");

    const hint = dto.hint?.trim() ?? "";
    const prompt = this.buildReversePrompt(imageUrl, hint);
    const { balance } = await this.credits.addTransaction(
      userId,
      "consume",
      -REVERSE_PROMPT_COST,
      "反推提示词",
      imageUrl.slice(0, 200)
    );

    return {
      prompt,
      costCredits: REVERSE_PROMPT_COST,
      creditsAfter: balance,
      provider: "local-mvp"
    };
  }

  async handleCallback(body: Record<string, unknown>, secret?: string) {
    const callbackSecret = this.config.get<string>("app.callbackSecret");
    if (callbackSecret && secret !== callbackSecret) throw new UnauthorizedException("invalid callback secret");

    const event = this.normalizeCallback(body);
    if (!event.taskId) throw new BadRequestException("callback missing taskId");

    const job = await this.prisma.generateJob.findUnique({ where: { kieTaskId: event.taskId }, include: { results: true } });
    if (!job) throw new NotFoundException("generate job not found");
    if (TERMINAL_STATUSES.has(job.status)) return this.toJobView(job);

    return this.toJobView(await this.applyProviderEvent(job, event));
  }

  private async syncProviderJob(job: JobWithResults) {
    if (job.provider !== "kie" || TERMINAL_STATUSES.has(job.status) || !job.kieTaskId || !this.kie.isConfigured()) return job;

    try {
      const detail = await this.kie.getTaskDetail(job.kieTaskId);
      const event = this.normalizeCallback({ data: { ...detail, taskId: detail.taskId || job.kieTaskId } });
      if (!event.taskId) event.taskId = job.kieTaskId;
      if (event.taskId !== job.kieTaskId) return job;
      return this.applyProviderEvent(job, event);
    } catch {
      return job;
    }
  }

  private async applyProviderEvent(job: JobWithResults, event: ProviderEvent) {
    if (event.status === "succeeded") {
      if (!event.imageUrls.length) {
        const failed = await this.failAndRefund(job.id, "KIE callback did not include images");
        return failed.job;
      }
      const results = await this.transferGeneratedImages(job.id, event.imageUrls);
      return this.finishJobWithDrafts(job, results, "Generation completed");
    }

    if (event.status === "failed") {
      const failed = await this.failAndRefund(job.id, event.errorMessage || "KIE task failed");
      return failed.job;
    }

    const running = await this.prisma.generateJob.update({
      where: { id: job.id },
      data: {
        status: event.status,
        progress: event.progress ?? (event.status === "running" ? Math.max(job.progress, 30) : job.progress),
        stageText: event.stageText || "AI 正在生成中",
        startedAt: job.startedAt ?? new Date()
      },
      include: { results: true }
    });
    return running;
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

  private async isManualReview() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: "manualReviewEnabled" } });
    return row ? row.value === "true" : true;
  }

  private draftTitle(prompt: string, index?: number) {
    const base = prompt.trim().replace(/\s+/g, " ").slice(0, 24) || "AI generated work";
    return index ? `${base} ${index}` : base;
  }

  private buildReversePrompt(imageUrl: string, hint: string) {
    const filename = decodeURIComponent(imageUrl.split("?")[0]?.split("/").pop() || "");
    const lower = `${filename} ${hint}`.toLowerCase();
    const styleParts: string[] = [];

    if (/anime|二次元|cartoon|comic/.test(lower)) styleParts.push("anime illustration, clean line art");
    if (/photo|portrait|人像|face/.test(lower)) styleParts.push("photorealistic portrait, natural skin texture");
    if (/landscape|scene|风景|山|海|forest/.test(lower)) styleParts.push("wide landscape composition, atmospheric depth");
    if (/cyber|neon|赛博/.test(lower)) styleParts.push("cyberpunk neon lighting, futuristic city mood");
    if (/ink|chinese|国风|古风/.test(lower)) styleParts.push("Chinese ink painting mood, elegant traditional details");

    const style = styleParts.length ? styleParts.join(", ") : "high quality visual description, clear subject, balanced composition";
    const subject = hint || "the main subject and background from the reference image";
    return [
      subject,
      style,
      "soft cinematic lighting",
      "rich details",
      "harmonious color palette",
      "sharp focus",
      "professional AI art prompt"
    ].join(", ");
  }

  private async submitToProvider(jobId: string) {
    const job = await this.prisma.generateJob.findUniqueOrThrow({ where: { id: jobId }, include: { results: true } });
    if (this.config.get<boolean>("app.generate.allowMock")) {
      return this.completeMockProviderJob(job);
    }

    const model = await this.prisma.modelConfig.findUniqueOrThrow({ where: { id: job.modelId } });
    if (this.ainb.isConfiguredFor(model.id, job.mode)) {
      try {
        const submitted = await this.ainb.submit({
          mode: job.mode,
          prompt: job.prompt,
          inputImageUrl: job.inputImageUrl,
          ratio: job.ratio,
          quality: job.quality,
          count: job.count
        });
        const updated = await this.prisma.generateJob.update({
          where: { id: job.id },
          data: {
            provider: "ainb",
            providerModel: "gpt-image-2",
            kieTaskId: submitted.taskId,
            status: "running",
            progress: 8,
            stageText: "任务已提交，正在生成",
            startedAt: new Date()
          },
          include: { results: true }
        });
        void this.completeAinbJob(updated).catch(async (error) => {
          await this.failProviderJobIfActive(updated.id, error instanceof Error ? error.message : "Ainb generation failed");
        });
        return { job: updated, id: updated.id, status: updated.status, creditsAfter: undefined as number | undefined };
      } catch (error) {
        const failed = await this.failAndRefund(job.id, error instanceof Error ? error.message : "Ainb submit failed");
        return { job: failed.job, id: failed.job.id, status: failed.job.status, creditsAfter: failed.balance };
      }
    }

    if (this.change2pro.isConfiguredFor(model.id)) {
      const updated = await this.prisma.generateJob.update({
        where: { id: job.id },
        data: {
          provider: "change2pro",
          providerModel: this.change2pro.providerModel(model.id) || model.providerModel,
          status: "running",
          progress: 5,
          stageText: "任务已提交，正在生成",
          startedAt: new Date()
        },
        include: { results: true }
      });
      void this.completeChange2ProJob(updated, model.id).catch(async (error) => {
        await this.failProviderJobIfActive(updated.id, error instanceof Error ? error.message : "Change2Pro generation failed");
      });
      return { job: updated, id: updated.id, status: updated.status, creditsAfter: undefined as number | undefined };
    }

    if (!this.kie.isConfigured()) {
      return { job, id: job.id, status: job.status, creditsAfter: undefined as number | undefined };
    }

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

  private async completeChange2ProJob(job: JobWithResults, modelId: string) {
    const outputs = await this.change2pro.generate({
      jobId: job.id,
      modelId,
      mode: job.mode,
      prompt: job.prompt,
      inputImageUrl: job.inputImageUrl,
      ratio: job.ratio,
      quality: job.quality,
      count: job.count
    });
    const results = await this.storeChange2ProOutputs(outputs);
    const current = await this.prisma.generateJob.findUniqueOrThrow({ where: { id: job.id }, include: { results: true } });
    if (TERMINAL_STATUSES.has(current.status)) return current;
    return this.finishJobWithDrafts(current, results, "生成完成");
  }

  private async completeAinbJob(job: JobWithResults) {
    if (!job.kieTaskId) throw new Error("Ainb task id is missing");
    const startedAt = job.startedAt?.getTime() ?? Date.now();
    const outputs = await this.ainb.waitForOutputs(job.kieTaskId, async (providerElapsedMs) => {
      const elapsedMs = Math.max(providerElapsedMs, Date.now() - startedAt);
      const progress = Math.min(90, 8 + Math.floor(elapsedMs / 10_000) * 3);
      await this.prisma.generateJob.updateMany({
        where: { id: job.id, status: "running" },
        data: { progress, stageText: "AI 正在生成中" }
      });
    });
    if (this.imageTransfer.isConfigured() && outputs.every((output) => Boolean(output.url))) {
      return this.startAinbImageTransfer(job, outputs);
    }
    const results = await this.storeChange2ProOutputs(outputs);
    const current = await this.prisma.generateJob.findUniqueOrThrow({ where: { id: job.id }, include: { results: true } });
    if (TERMINAL_STATUSES.has(current.status)) return current;
    return this.finishJobWithDrafts(current, results, "生成完成");
  }

  private async startAinbImageTransfer(job: JobWithResults, outputs: Change2ProOutput[]) {
    const pending = outputs.flatMap((output) => {
      if (!output.url) return [];
      const target = this.uploads.reserveSystemImage("generate", "image/png");
      return [{ sourceUrl: output.url, ...target }];
    });
    if (!pending.length) throw new Error("Ainb result did not include an image URL");

    const prepared = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.generateJob.updateMany({
        where: { id: job.id, status: "running" },
        data: { status: "finalizing", progress: 96, stageText: "生成完成，正在保存高清原图" }
      });
      if (!claimed.count) return tx.generateJob.findUniqueOrThrow({ where: { id: job.id }, include: { results: true } });
      await tx.generateResult.deleteMany({ where: { jobId: job.id } });
      for (const item of pending) {
        await tx.generateResult.create({
          data: { jobId: job.id, status: "transferring", imageUrl: item.sourceUrl, ossKey: item.ossKey }
        });
      }
      return tx.generateJob.findUniqueOrThrow({ where: { id: job.id }, include: { results: true } });
    });
    this.resumeAinbTransfers(prepared);
    return prepared;
  }

  async completeImageTransfer(
    token: string | undefined,
    input: { jobId?: string; resultId?: string; objectKey?: string; sizeBytes?: number; error?: string }
  ) {
    if (!this.imageTransfer.matchesToken(token)) throw new UnauthorizedException("invalid image transfer token");
    if (!input.jobId || !input.resultId || !input.objectKey) throw new BadRequestException("invalid image transfer callback");
    const job = await this.prisma.generateJob.findUnique({ where: { id: input.jobId }, include: { results: true } });
    if (!job || job.provider !== "ainb" || job.status !== "finalizing") return { ok: true };
    const result = job.results.find((item) => item.id === input.resultId);
    if (!result || result.ossKey !== input.objectKey) throw new BadRequestException("image transfer result does not match job");

    if (input.error) {
      await this.prisma.generateResult.update({ where: { id: result.id }, data: { status: "failed", imageUrl: "", errorMessage: input.error.slice(0, 500) } });
      await this.failAndRefund(job.id, input.error);
      return { ok: true };
    }

    await this.prisma.generateResult.update({
      where: { id: result.id },
      data: {
        status: "succeeded",
        imageUrl: this.uploads.objectUrlForKey(result.ossKey),
        sizeBytes: Math.max(0, Math.floor(input.sizeBytes || 0)),
        errorMessage: ""
      }
    });
    const current = await this.prisma.generateJob.findUniqueOrThrow({ where: { id: job.id }, include: { results: true } });
    if (current.results.some((item) => item.status !== "succeeded")) return { ok: true };
    const generated = current.results.map((item) => ({ imageUrl: item.imageUrl, ossKey: item.ossKey, sizeBytes: item.sizeBytes ?? 0 }));
    await this.finishTransferredAinbJob(current, generated);
    return { ok: true };
  }

  private async storeChange2ProOutputs(outputs: Change2ProOutput[]) {
    const results: GeneratedImage[] = [];
    for (const output of outputs) {
      if (output.url) {
        results.push(await this.uploads.transferRemoteImage("generate", output.url));
      } else if (output.buffer?.length && output.contentType) {
        results.push(await this.uploads.uploadBuffer("generate", "generated-image", output.contentType, output.buffer));
      }
    }
    if (!results.length) throw new Error("Change2Pro did not return a valid image");
    return results;
  }

  private async failProviderJobIfActive(jobId: string, message: string) {
    try {
      const job = await this.prisma.generateJob.findUnique({ where: { id: jobId }, select: { status: true } });
      if (job && !TERMINAL_STATUSES.has(job.status)) await this.failAndRefund(jobId, message);
    } catch {
      // The original request has already returned; polling will surface the persisted job state.
    }
  }

  private async completeMockProviderJob(job: JobWithResults) {
    const images: GeneratedImage[] = Array.from({ length: job.count }, (_, index) => {
      const seed = `${job.id}-${index + 1}`;
      return {
        imageUrl: mockGeneratedImageUrl(seed),
        ossKey: `mock/generate/${seed}.jpg`,
        sizeBytes: 512 * 1024
      };
    });
    const updated = await this.finishJobWithDrafts(job, images, "Mock generation completed");
    return { job: updated, id: updated.id, status: updated.status, creditsAfter: undefined as number | undefined };
  }

  private async finishTransferredAinbJob(job: JobWithResults, results: GeneratedImage[]) {
    const claimed = await this.prisma.generateJob.updateMany({
      where: { id: job.id, status: "finalizing", progress: 96 },
      data: { progress: 97, stageText: "正在保存作品" }
    });
    if (!claimed.count) return job;
    const current = await this.prisma.generateJob.findUniqueOrThrow({ where: { id: job.id }, include: { results: true } });
    return this.finishJobWithDrafts(current, results, "生成完成", ["finalizing"], 97);
  }

  private async finishJobWithDrafts(
    job: JobWithResults,
    results: GeneratedImage[],
    stageText: string,
    allowedStatuses: string[] = ["queued", "running"],
    expectedProgress?: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.generateJob.updateMany({
        where: { id: job.id, status: { in: allowedStatuses }, ...(expectedProgress === undefined ? {} : { progress: expectedProgress }) },
        data: { status: "finalizing", stageText: "正在保存作品" }
      });
      if (!claimed.count) {
        return tx.generateJob.findUniqueOrThrow({ where: { id: job.id }, include: { results: true } });
      }
      await tx.generateResult.deleteMany({ where: { jobId: job.id } });
      for (const [index, result] of results.entries()) {
        const work = await tx.work.create({
          data: {
            userId: job.userId,
            title: this.draftTitle(job.prompt, results.length > 1 ? index + 1 : undefined),
            description: "",
            prompt: job.prompt,
            imageUrl: result.imageUrl,
            ratio: job.ratio,
            quality: job.quality,
            modelId: job.modelId,
            style: job.style,
            isPublic: false,
            status: "draft"
          }
        });
        await tx.generateResult.create({
          data: {
            jobId: job.id,
            status: "succeeded",
            imageUrl: result.imageUrl,
            ossKey: result.ossKey,
            sizeBytes: result.sizeBytes,
            workId: work.id
          }
        });
      }
      if (results.length) {
        await tx.user.update({ where: { id: job.userId }, data: { worksCount: { increment: results.length } } });
      }
      return tx.generateJob.update({
        where: { id: job.id },
        data: {
          status: "succeeded",
          progress: 100,
          stageText,
          errorMessage: "",
          startedAt: job.startedAt ?? new Date(),
          finishedAt: new Date()
        },
        include: { results: true }
      });
    });
  }

  private async failAndRefund(jobId: string, errorMessage: string) {
    const userMessage = userFacingGenerateError(errorMessage);
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.generateJob.findUniqueOrThrow({ where: { id: jobId }, include: { results: true } });
      const refundCredits = job.costCredits - job.refundCredits;
      const updated = await tx.generateJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          progress: 0,
          stageText: "Generation failed",
          errorMessage: userMessage,
          refundCredits: job.refundCredits + Math.max(refundCredits, 0),
          finishedAt: new Date()
        },
        include: { results: true }
      });
      const { balance } =
        refundCredits > 0
          ? await this.credits.addTransactionInTx(tx, job.userId, "refund", refundCredits, "AI生成任务失败返还", job.id)
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
      errorMessage: String(data.failMsg ?? data.errorMessage ?? data.msg ?? body.msg ?? ""),
      progress: this.normalizeProgress(data.progress ?? body.progress)
    };
  }

  private normalizeProgress(value: unknown) {
    const progress = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(progress)) return undefined;
    return Math.max(0, Math.min(100, progress));
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
    if (["success", "succeeded", "completed", "complete"].includes(normalized)) return "succeeded";
    if (["fail", "failed", "error", "failure"].includes(normalized)) return "failed";
    if (["generating", "running", "processing", "in_progress"].includes(normalized)) return "running";
    if (["waiting", "queued", "queue", "pending", "created"].includes(normalized)) return "queued";
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
      inputImageUrl: job.inputImageUrl ? this.uploads.readUrl(job.inputImageUrl, "private") : undefined,
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
        imageUrl: result.imageUrl ? this.uploads.readUrl(result.imageUrl, "private") : undefined,
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
