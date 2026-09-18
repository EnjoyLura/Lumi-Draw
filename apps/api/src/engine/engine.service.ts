import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { createHmac } from "node:crypto";
import type { EngineAsset, EngineAttempt, EngineJob, GenerationProvider, ModelConfig, QualityConfig, RatioConfig } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { resolveGeneratedImageSize } from "../common/generated-image-size";
import { timingSafeEqualStrings } from "../common/timing-safe";
import { WechatContentSafetyService } from "../content-safety/wechat-content-safety.service";
import { requiresManualReview } from "../common/review-policy";
import { CreditsService } from "../credits/credits.service";
import { PublishRewardsService } from "../credits/publish-rewards.service";
import { resolveProviderIds } from "../common/provider-routing";
import { decryptProviderApiKey } from "../common/provider-secret";
import { normalizeProviderParams } from "./provider-runtime";
import { normalizeProviderResultUrlRewriteRules, rewriteProviderResultUrl } from "../common/provider-result-url";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import { WechatWalletService } from "../payments/wechat-wallet.service";
import { EngineBillingService, type GeneratedImage } from "./engine-billing.service";
import { decideFailure } from "./engine-failover";
import {
  ASYNC_POLL_INTERVAL_MS,
  ENGINE_ACTIVE_STATUSES,
  ENGINE_TERMINAL_STATUSES,
  GENERATION_TOTAL_TIMEOUT_MS,
  MAX_ATTEMPTS_PER_PROVIDER,
  QUICK_FAILURE_WINDOW_MS,
  RETRY_BACKOFF_MS,
  SUBMIT_DEADLINE_MS,
  type AdapterContext,
  type AdapterKind,
  type AdapterOutput,
  type NormalizedRequest,
  type ProviderConfig,
  type ProviderErrorKind,
  type ProviderEvent,
  type ProviderResultMode
} from "./engine.types";
import { buildAdapterContext, kieCallbackTaskId, resolveAdapter } from "./adapters";
import { FAILURE_CODES } from "./provider-config";
import { readProviderConfig } from "./provider-config";
import { EngineStorageService } from "./engine-storage.service";

type JobWithRelations = EngineJob & { assets: EngineAsset[]; attempts?: EngineAttempt[] };

type ProviderSnapshot = {
  providerId: string;
  providerName: string;
  adapterKind: AdapterKind;
  requestMode: "sync" | "async";
  resultMode: ProviderResultMode;
  providerModel: string;
  config: ProviderConfig;
  apiKeyEncrypted: string;
  apiKeyEnv: string;
};

const REVERSE_PROMPT_COST = 2;

function mockImageUrl(seed: string) {
  const colors = [
    ["#5b9fe8", "#62c9b7", "#f6b28f"],
    ["#8b7cf6", "#63c6f2", "#ffe083"],
    ["#ff7f73", "#ffc766", "#74d4b3"],
    ["#6f8ff2", "#b797f4", "#f8a6c2"]
  ];
  const hash = Array.from(seed).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
  const [a, b, c] = colors[hash % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".58" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><text x="50%" y="52%" text-anchor="middle" font-family="Arial" font-size="48" fill="#fff" opacity=".7">${seed}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** KIE 回调 per-job 签名：HMAC-SHA256(secret, jobId)，回调侧 timing-safe 校验。 */
export function kieCallbackSignature(secret: string, jobId: string): string {
  return createHmac("sha256", secret).update(jobId).digest("hex");
}

/** 上游事件失败原因的文本分类（事件无状态码，这是唯一保留的文本匹配点）。 */
export function classifyEventError(message: string): { kind: ProviderErrorKind; maybeBilled: boolean } {
  const text = message.toLowerCase();
  if (/unsafe|safety|content.*(?:policy|filter)|不安全|违规|敏感/.test(text)) return { kind: "policy", maybeBilled: true };
  if (/尺寸|size|pixel|最长边/.test(text)) return { kind: "size", maybeBilled: true };
  if (/429|rate limit|任务较多/.test(text)) return { kind: "rate_limit", maybeBilled: true };
  if (/暂无可用产能|no available capacity|capacity/.test(text)) return { kind: "capacity", maybeBilled: true };
  if (/余额不足|insufficient.*(balance|fund)|欠费/.test(text)) return { kind: "quota", maybeBilled: true };
  if (/timeout|超时/.test(text)) return { kind: "timeout", maybeBilled: true };
  return { kind: "unknown", maybeBilled: true };
}

@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly wallet: WechatWalletService,
    private readonly config: ConfigService,
    private readonly uploads: UploadsService,
    private readonly safety: WechatContentSafetyService,
    private readonly publishRewards: PublishRewardsService,
    private readonly billing: EngineBillingService,
    private readonly storage: EngineStorageService
  ) {}

  // ---------------- 任务创建 ----------------

  async createJob(userId: number, dto: {
    clientRequestId: string;
    operation: "text-to-image" | "image-to-image";
    modelId: string;
    prompt: string;
    qualityId: number;
    ratioId: number;
    styleId?: number;
    gameplayId?: number;
    count: number;
    inputImageUrls?: string[];
  }, retryOfJobId = "") {
    const inputImageUrls = [...new Set((dto.inputImageUrls ?? []).filter((url) => typeof url === "string" && url.trim()))].slice(0, 5);
    const existing = await this.prisma.engineJob.findUnique({
      where: { clientRequestId: dto.clientRequestId },
      include: { assets: true }
    });
    if (existing) {
      if (existing.userId !== userId) throw new ConflictException("clientRequestId 已被其他任务占用");
      return this.submitIfQueued(existing);
    }

    await this.safety.checkText(userId, [dto.prompt], 3);
    const [model, quality, ratio] = await Promise.all([
      this.prisma.modelConfig.findFirst({ where: { id: dto.modelId, enabled: true } }),
      this.prisma.qualityConfig.findFirst({ where: { id: dto.qualityId, enabled: true } }),
      this.prisma.ratioConfig.findFirst({ where: { id: dto.ratioId, enabled: true } })
    ]);
    if (!model) throw new BadRequestException("模型不可用");
    if (!quality) throw new BadRequestException("分辨率不可用");
    if (!ratio) throw new BadRequestException("尺寸比例不可用");
    if (dto.operation === "text-to-image" && !model.supportsTextToImage) throw new BadRequestException("该模型不支持文生图");
    if (dto.operation === "image-to-image" && !model.supportsImageToImage) throw new BadRequestException("该模型不支持图生图");
    if (dto.operation === "image-to-image" && !inputImageUrls.length) throw new BadRequestException("图生图需要参考图");
    inputImageUrls.forEach((url) => this.uploads.assertManagedImageUrl(url));
    const pixelSize = resolveGeneratedImageSize(ratio.label, quality.label);
    if (!pixelSize) throw new BadRequestException("当前模型不支持所选图片尺寸");

    const snapshot = await this.resolvePrimaryProvider(model, quality, dto.operation);
    const costCredits = Math.ceil(model.costCredits * quality.multiplier * dto.count);

    const created = await this.prisma.$transaction(async (tx) => {
      // 用户级串行化：并发点击/多端同时提交不能重复扣费。
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      const activeJob = await tx.engineJob.findFirst({
        where: { userId, status: { in: ENGINE_ACTIVE_STATUSES } },
        select: { id: true }
      });
      if (activeJob) throw new ConflictException("当前已有任务正在生成，请等待完成后再试");

      const walletUser = this.wallet.enabled
        ? await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } })
        : null;
      if (walletUser && walletUser.credits < costCredits) {
        throw new BadRequestException(`积分不足，还差 ${costCredits - walletUser.credits} 积分`);
      }

      const job = await tx.engineJob.create({
        data: {
          clientRequestId: dto.clientRequestId,
          userId,
          operation: dto.operation,
          modelId: model.id,
          modelRevision: BigInt(Math.max(0, model.updatedAt.getTime())),
          qualityId: quality.id,
          ratioId: ratio.id,
          ratio: ratio.label,
          quality: quality.label,
          prompt: dto.prompt,
          styleId: dto.styleId ?? null,
          gameplayId: dto.gameplayId ?? null,
          count: dto.count,
          inputImageUrls,
          providerId: snapshot.providerId,
          providerCandidates: snapshot.candidates,
          providerSnapshot: {
            providerId: snapshot.providerId,
            providerName: snapshot.providerName,
            adapterKind: snapshot.adapterKind,
            requestMode: snapshot.requestMode,
            resultMode: snapshot.resultMode,
            providerModel: snapshot.providerModel,
            config: snapshot.config,
            apiKeyEncrypted: snapshot.apiKeyEncrypted,
            apiKeyEnv: snapshot.apiKeyEnv
          } as unknown as Prisma.InputJsonValue,
          costCredits,
          status: "queued",
          stageText: "任务已创建，等待进入生成队列",
          retryOfJobId: retryOfJobId || null
        }
      });
      const balance = this.wallet.enabled
        ? walletUser!.credits
        : (await this.credits.addTransactionInTx(tx, userId, "consume", -costCredits, `AI生成任务：${model.name}`, `engine_charge:${job.id}`)).balance;
      return { job, balance };
    });

    if (this.wallet.enabled) {
      const walletBillNo = `e_${created.job.id}`;
      try {
        const debit = await this.wallet.deduct(userId, costCredits, walletBillNo, `AI生成任务：${model.name}`);
        if (!debit) throw new Error("微信积分扣减未返回结果");
        await this.credits.syncExternalBalance(userId, "consume", -costCredits, debit.balance, `AI生成任务：${model.name}`, `engine_charge:${created.job.id}`);
        await this.prisma.engineJob.update({ where: { id: created.job.id }, data: { walletBillNo: debit.billNo } });
        created.balance = debit.balance;
      } catch (error) {
        try {
          const refunded = await this.wallet.refund(userId, walletBillNo, costCredits);
          if (refunded) {
            await this.credits.syncExternalBalance(userId, "refund", costCredits, refunded.balance, "生成任务扣款失败返还", `engine_refund:${created.job.id}`);
          }
        } catch {
          // 确定性账单号允许 watchdog 之后的对账重试。
        }
        const message = error instanceof Error ? error.message : "微信积分扣减失败";
        await this.prisma.engineJob.update({
          where: { id: created.job.id },
          data: { status: "failed", billingState: "charge_failed", failureCode: 40020, failureMessage: "积分扣减失败，请稍后重试", finishedAt: new Date() }
        });
        throw new BadRequestException(message);
      }
    }

    return this.submitIfQueued(await this.loadJob(created.job.id), created.balance);
  }

  private async resolvePrimaryProvider(model: ModelConfig, quality: QualityConfig, operation: string) {
    const providerIds = resolveProviderIds(model.provider, model.providerRouting, quality.label);
    const rows = await this.prisma.generationProvider.findMany({ where: { id: { in: providerIds }, enabled: true } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const usable = providerIds
      .map((id) => byId.get(id))
      .filter((row): row is GenerationProvider => {
        if (!row) return false;
        const config = readProviderConfig(row);
        const endpoint = operation === "image-to-image" ? config.imageEndpoint : config.baseUrl;
        const enabled = operation === "image-to-image" ? config.imageToImageEnabled && config.imageEndpoint : config.textToImageEnabled && config.baseUrl;
        return Boolean(enabled && endpoint && (config.authMode === "none" || this.resolveProviderApiKey(row.apiKeyEncrypted, row.apiKeyEnv)));
      });
    const primary = usable[0];
    if (!primary) throw new BadRequestException("当前模型和分辨率没有可用的 API 平台，请联系管理员");
    const config = readProviderConfig(primary);
    return {
      providerId: primary.id,
      providerName: primary.name,
      adapterKind: config.adapter,
      requestMode: config.requestMode,
      resultMode: operation === "image-to-image" ? config.imageResultMode : config.textResultMode,
      providerModel: normalizeProviderParams(operation === "image-to-image" ? config.imageRequestParams : config.requestParams).model || model.providerModel,
      config,
      apiKeyEncrypted: primary.apiKeyEncrypted,
      apiKeyEnv: primary.apiKeyEnv,
      candidates: usable.map((row) => row.id)
    };
  }

  // ---------------- 提交 ----------------

  private async submitIfQueued(job: JobWithRelations, balance?: number) {
    const submitted = job.status === "queued" ? await this.submitJob(job.id) : job;
    return {
      jobId: submitted.id,
      clientRequestId: submitted.clientRequestId,
      status: submitted.status,
      job: this.toJobView(submitted),
      creditsAfter: balance
    };
  }

  async submitJob(jobId: string): Promise<EngineJob> {
    let job = await this.loadJob(jobId);
    if (ENGINE_TERMINAL_STATUSES.has(job.status)) return job;

    if (this.config.get<boolean>("app.generate.allowMock")) {
      return this.completeMockJob(job);
    }

    const snapshot = this.readSnapshot(job);
    const ctx = this.buildContext(snapshot, job.id);
    const req: NormalizedRequest = {
      jobId: job.id,
      attemptId: `${job.id}:${job.providerAttemptIndex + 1}`,
      operation: job.operation as "text-to-image" | "image-to-image",
      providerModel: snapshot.providerModel,
      prompt: job.prompt,
      inputImageUrls: this.readInputImageUrls(job),
      ratio: job.ratio,
      quality: job.quality,
      pixelSize: `${resolveGeneratedImageSize(job.ratio, job.quality)?.width ?? 1024}x${resolveGeneratedImageSize(job.ratio, job.quality)?.height ?? 1024}`,
      count: job.count,
      params: job.operation === "image-to-image" ? snapshot.config.imageRequestParams : snapshot.config.requestParams
    };

    // base64/auto + 同步协议：整条调用交给 FC，避免大响应经过 API 进程。
    if (snapshot.resultMode !== "url" && snapshot.requestMode === "sync") {
      const attempt = await this.createAttempt(job, snapshot, "pending");
      await this.prisma.engineJob.update({
        where: { id: job.id },
        data: {
          status: "running",
          progress: 5,
          stageText: "任务已提交，正在生成",
          startedAt: job.startedAt ?? new Date(),
          submitDeadlineAt: new Date(Date.now() + SUBMIT_DEADLINE_MS),
          totalTimeoutAt: new Date(Date.now() + GENERATION_TOTAL_TIMEOUT_MS)
        }
      });
      try {
        await this.storage.dispatchFcGeneration(job, ctx, req);
        // FC 已受理（异步调用毫秒级返回）；生成耗时由 totalTimeoutAt 兜底。
        await this.prisma.engineJob.updateMany({
          where: { id: job.id, status: "running" },
          data: { submitDeadlineAt: null }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "FC generation dispatch failed";
        await this.handleProviderFailure(job.id, snapshot.adapterKind, message, "network", true, 0, attempt.id);
      }
      return this.loadJob(job.id);
    }

    const adapter = resolveAdapter(snapshot.adapterKind, snapshot.requestMode);
    const attempt = await this.createAttempt(job, snapshot, "pending");
    // 同步适配器的 submit 本身就是完整生成过程，不能用 2 分钟提交截止时间误杀。
    await this.prisma.engineJob.update({
      where: { id: job.id },
      data: {
        submitDeadlineAt: new Date(Date.now() + (snapshot.requestMode === "sync" ? GENERATION_TOTAL_TIMEOUT_MS : SUBMIT_DEADLINE_MS)),
        totalTimeoutAt: new Date(Date.now() + GENERATION_TOTAL_TIMEOUT_MS)
      }
    });
    const attemptStartedAt = Date.now();
    try {
      const result = await adapter.submit(ctx, req);
      const latencyMs = Date.now() - attemptStartedAt;
      if (result.taskId) {
        await this.prisma.$transaction([
          this.prisma.engineAttempt.update({
            where: { id: attempt.id },
            data: { state: "submitted", upstreamTaskId: result.taskId, latencyMs, nextPollAt: new Date(Date.now() + ASYNC_POLL_INTERVAL_MS) }
          }),
          this.prisma.engineJob.update({
            where: { id: job.id },
            data: {
              status: "running",
              progress: Math.max(job.progress, 8),
              stageText: "任务已提交，正在生成",
              startedAt: job.startedAt ?? new Date(),
              submitDeadlineAt: null,
              totalTimeoutAt: new Date(Date.now() + GENERATION_TOTAL_TIMEOUT_MS)
            }
          })
        ]);
      } else {
        const outputs = result.outputs ?? [];
        await this.prisma.engineAttempt.update({
          where: { id: attempt.id },
          data: { state: "succeeded", latencyMs, finishedAt: new Date() }
        });
        await this.prisma.engineJob.update({
          where: { id: job.id },
          data: { startedAt: job.startedAt ?? new Date(), totalTimeoutAt: null }
        });
        const direct = await this.storage.stageOutputs(job, outputs, snapshot.config.resultUrlRewriteRules);
        if (direct) {
          const settled = await this.billing.settleWithDrafts(await this.loadJob(job.id), direct, "生成完成");
          return settled;
        }
      }
      return this.loadJob(job.id);
    } catch (error) {
      const kind = this.errorKindOf(error);
      const maybeBilled = this.errorMaybeBilledOf(error);
      const message = error instanceof Error ? error.message : "provider submit failed";
      await this.handleProviderFailure(job.id, snapshot.adapterKind, message, kind, maybeBilled, Date.now() - attemptStartedAt, attempt.id);
      return this.loadJob(job.id);
    }
  }

  private errorKindOf(error: unknown): ProviderErrorKind {
    return (error as { kind?: ProviderErrorKind })?.kind ?? "unknown";
  }

  private errorMaybeBilledOf(error: unknown): boolean {
    return Boolean((error as { maybeBilled?: boolean })?.maybeBilled);
  }

  private async createAttempt(job: EngineJob, snapshot: ProviderSnapshot, state: string) {
    const index = await this.prisma.engineAttempt.count({ where: { jobId: job.id } });
    return this.prisma.engineAttempt.create({
      data: {
        jobId: job.id,
        index: index + 1,
        providerId: snapshot.providerId,
        providerName: snapshot.providerName,
        adapter: snapshot.adapterKind,
        state
      }
    });
  }

  async completeMockJob(job: EngineJob) {
    const images: GeneratedImage[] = Array.from({ length: job.count }, (_, index) => {
      const seed = `${job.id}-${index + 1}`;
      const expected = resolveGeneratedImageSize(job.ratio, job.quality);
      return {
        url: mockImageUrl(seed),
        ossKey: `mock/generate/${seed}.jpg`,
        sizeBytes: 512 * 1024,
        ...expected
      };
    });
    return this.billing.settleWithDrafts(job, images, "生成完成（模拟）");
  }

  // ---------------- 失败决策 / 故障转移 ----------------

  async handleProviderFailure(
    jobId: string,
    adapterKind: string,
    message: string,
    kind: ProviderErrorKind,
    maybeBilled: boolean,
    latencyMs: number,
    attemptId?: string
  ) {
    const job = await this.loadJob(jobId);
    if (ENGINE_TERMINAL_STATUSES.has(job.status)) return job;

    if (attemptId) {
      await this.prisma.engineAttempt.updateMany({
        where: { id: attemptId, state: { in: ["pending", "submitted"] } },
        data: { state: "failed", errorKind: kind, errorMessage: message.slice(0, 500), latencyMs, finishedAt: new Date() }
      });
    } else {
      const running = await this.prisma.engineAttempt.findFirst({
        where: { jobId, state: { in: ["pending", "submitted"] } },
        orderBy: { index: "desc" }
      });
      if (running) {
        await this.prisma.engineAttempt.update({
          where: { id: running.id },
          data: { state: "failed", errorKind: kind, errorMessage: message.slice(0, 500), finishedAt: new Date() }
        });
      }
    }

    const failedForProvider = await this.prisma.engineAttempt.count({
      where: { jobId, providerId: job.providerId, state: "failed" }
    });
    const candidates = this.readCandidates(job);
    const decision = decideFailure({
      kind,
      maybeBilled,
      latencyMs,
      attemptsForProvider: failedForProvider,
      maxAttemptsPerProvider: MAX_ATTEMPTS_PER_PROVIDER,
      quickFailureWindowMs: QUICK_FAILURE_WINDOW_MS,
      hasNextProvider: job.providerAttemptIndex + 1 < candidates.length
    });

    if (decision === "fail") {
      await this.billing.failJob(jobId, kind, message);
      return this.loadJob(jobId);
    }

    let targetIndex = decision === "retry-same" ? job.providerAttemptIndex : job.providerAttemptIndex + 1;
    // 试运行任务（modelId="dry-run"）没有 ModelConfig 行；缺失时回落到任务快照里的上游模型名。
    const model = await this.prisma.modelConfig.findUnique({ where: { id: job.modelId }, select: { providerModel: true } });
    let selected: { provider: GenerationProvider; config: ProviderConfig } | null = null;
    while (targetIndex < candidates.length) {
      const candidateId = candidates[targetIndex];
      const provider = await this.prisma.generationProvider.findFirst({ where: { id: candidateId, enabled: true } });
      if (provider) {
        const config = readProviderConfig(provider);
        const endpoint = job.operation === "image-to-image" ? config.imageEndpoint : config.baseUrl;
        const modeEnabled = job.operation === "image-to-image"
          ? config.imageToImageEnabled && config.imageEndpoint
          : config.textToImageEnabled && config.baseUrl;
        if (modeEnabled && endpoint && (config.authMode === "none" || this.resolveProviderApiKey(provider.apiKeyEncrypted, provider.apiKeyEnv))) {
          selected = { provider, config };
          break;
        }
      }
      targetIndex += 1;
    }
    if (!selected) {
      await this.billing.failJob(jobId, kind, message);
      return this.loadJob(jobId);
    }

    const nextConfig = selected.config;
    const params = normalizeProviderParams(job.operation === "image-to-image" ? nextConfig.imageRequestParams : nextConfig.requestParams);
    const nextSnapshot: ProviderSnapshot = {
      providerId: selected.provider.id,
      providerName: selected.provider.name,
      adapterKind: nextConfig.adapter,
      requestMode: nextConfig.requestMode,
      resultMode: job.operation === "image-to-image" ? nextConfig.imageResultMode : nextConfig.textResultMode,
      providerModel: params.model || model?.providerModel || this.readSnapshot(job).providerModel,
      config: nextConfig,
      apiKeyEncrypted: selected.provider.apiKeyEncrypted,
      apiKeyEnv: selected.provider.apiKeyEnv
    };
    const claimed = await this.prisma.engineJob.updateMany({
      where: {
        id: jobId,
        providerId: job.providerId,
        providerAttemptIndex: job.providerAttemptIndex,
        status: { in: ENGINE_ACTIVE_STATUSES }
      },
      data: {
        providerId: nextSnapshot.providerId,
        providerAttemptIndex: targetIndex,
        providerSnapshot: nextSnapshot as unknown as Prisma.InputJsonValue,
        status: "queued",
        progress: Math.max(3, Math.min(job.progress, 8)),
        stageText: targetIndex === job.providerAttemptIndex ? "线路连接失败，正在自动重试" : "线路异常，正在切换备用线路",
        failureCode: 0,
        failureMessage: ""
      }
    });
    if (!claimed.count) return this.loadJob(jobId);

    this.logger.warn(
      `engine provider ${job.providerId} failed (${kind}, ${latencyMs}ms); ${nextSnapshot.providerId === job.providerId ? "retrying same route" : `falling back to ${nextSnapshot.providerId}`} job=${jobId}`
    );
    if (nextSnapshot.providerId === job.providerId) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
    }
    return this.submitJob(jobId);
  }

  // ---------------- 事件应用（轮询 / 回调共用） ----------------

  async applyProviderEvent(jobId: string, event: ProviderEvent) {
    const job = await this.loadJob(jobId);
    if (ENGINE_TERMINAL_STATUSES.has(job.status)) return job;
    const attempt = await this.prisma.engineAttempt.findFirst({
      where: { jobId, state: "submitted" },
      orderBy: { index: "desc" }
    });

    if (event.state === "succeeded") {
      if (!event.imageUrls.length) {
        return this.handleProviderFailure(jobId, job.providerId, "上游任务成功但没有返回图片", "parse", true, 0, attempt?.id);
      }
      if (attempt) {
        await this.prisma.engineAttempt.update({
          where: { id: attempt.id },
          data: { state: "succeeded", finishedAt: new Date() }
        });
      }
      const outputs: AdapterOutput[] = event.imageUrls.map((url) => ({ url }));
      const snapshot = this.readSnapshot(job);
      const direct = await this.storage.stageOutputs(job, outputs, snapshot.config.resultUrlRewriteRules);
      if (direct) {
        return this.billing.settleWithDrafts(await this.loadJob(jobId), direct, "生成完成");
      }
      return this.loadJob(jobId);
    }

    if (event.state === "failed") {
      const { kind, maybeBilled } = classifyEventError(event.errorMessage || "上游任务失败");
      return this.handleProviderFailure(jobId, job.providerId, event.errorMessage || "上游任务失败", kind, maybeBilled, 0, attempt?.id);
    }

    const elapsedMs = job.startedAt ? Date.now() - job.startedAt.getTime() : 0;
    const simulated = Math.min(95, 5 + Math.floor(elapsedMs / 10_000) * 3);
    const progress = Math.max(event.progress ?? 0, Math.min(simulated, 95));
    await this.prisma.engineJob.updateMany({
      where: { id: jobId, status: { in: ["queued", "submitted", "running"] } },
      data: {
        status: "running",
        progress,
        stageText: event.stageText ? this.normalizeStage(event.stageText) : "AI 正在生成中",
        startedAt: job.startedAt ?? new Date()
      }
    });
    return this.loadJob(jobId);
  }

  private normalizeStage(stageText: string) {
    const normalized = stageText.trim();
    if (normalized && /[\u3400-\u9fff]/u.test(normalized)) return normalized;
    return "任务已提交，正在生成";
  }

  // ---------------- 查询 ----------------

  async getJob(userId: number, id: string) {
    const job = await this.loadJob(id);
    if (job.userId !== userId) throw new ForbiddenException("无权查看该任务");
    return this.toJobView(job);
  }

  async listJobs(userId: number, status: string | undefined, page: number, pageSize: number) {
    const where: Prisma.EngineJobWhereInput = { userId };
    if (status === "active") where.status = { in: ENGINE_ACTIVE_STATUSES };
    else if (status) {
      const statuses = [...new Set(status.split(",").map((item) => item.trim()).filter(Boolean))];
      where.status = { in: statuses };
    }
    const [rows, total] = await Promise.all([
      this.prisma.engineJob.findMany({ where, include: { assets: true }, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.engineJob.count({ where })
    ]);
    return buildPage(rows.map((job) => this.toJobView(job)), total, page, pageSize);
  }

  async findJobByClientRequest(userId: number, clientRequestId: string) {
    const job = await this.prisma.engineJob.findUnique({
      where: { clientRequestId },
      include: { assets: true }
    });
    if (!job || job.userId !== userId) return null;
    return this.toJobView(job);
  }

  // ---------------- 取消 / 发布 / 重试转存 ----------------

  async cancelJob(userId: number, id: string) {
    const current = await this.loadJob(id);
    if (current.userId !== userId) throw new ForbiddenException("无权取消该任务");
    if (ENGINE_TERMINAL_STATUSES.has(current.status)) throw new BadRequestException("任务已结束，不能取消");
    if (current.status !== "queued" || current.startedAt) {
      throw new BadRequestException("任务已提交到生成平台，不能取消");
    }
    const claimed = await this.prisma.engineJob.updateMany({
      where: { id, userId, status: "queued", startedAt: null },
      data: { status: "cancelled", stageText: "任务已取消", cancelledAt: new Date(), finishedAt: new Date() }
    });
    if (!claimed.count) throw new BadRequestException("任务已提交到生成平台，不能取消");
    const fresh = await this.loadJob(id);
    const refundCredits = await this.billing.refundJob(fresh, "取消生成任务退回积分", `engine_cancel_refund:${id}`);
    const updated = await this.loadJob(id);
    return { ...this.toJobView(updated), refundCredits, creditsAfter: await this.readCredits(userId) };
  }

  private async readCredits(userId: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
    return user.credits;
  }

  async publishAsset(userId: number, assetId: string, dto: { title: string; description?: string; isPublic?: boolean; isAnonymous?: boolean }) {
    const asset = await this.prisma.engineAsset.findUnique({ where: { id: assetId }, include: { job: true } });
    if (!asset) throw new NotFoundException("生成结果不存在或已被删除");
    if (asset.job.userId !== userId) throw new ForbiddenException("无权发布该生成结果");
    if (asset.status !== "stored" || !asset.url) throw new BadRequestException("该生成结果暂不可发布");
    if (asset.workId) throw new ConflictException("该生成结果已发布，请勿重复操作");

    const isPublic = dto.isPublic ?? true;
    const textModerationStatus = isPublic
      ? await this.safety.checkText(userId, [dto.title, dto.description, asset.job.prompt], 3)
      : "unchecked";
    const [manualReview, reviewSettings] = await Promise.all([requiresManualReview(this.prisma), this.safety.settings()]);
    const needsImageReview = isPublic && reviewSettings.imageEnabled;
    const status = !isPublic ? "draft" : needsImageReview || manualReview ? "pending" : "published";

    const published = await this.prisma.$transaction(async (tx) => {
      const work = await tx.work.create({
        data: {
          userId,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? "",
          prompt: asset.job.prompt,
          imageUrl: asset.url,
          ratio: asset.job.ratio,
          quality: asset.job.quality,
          modelId: asset.job.modelId,
          style: asset.job.styleId ? String(asset.job.styleId) : "",
          textModerationStatus,
          imageModerationStatus: needsImageReview ? "unchecked" : "skipped",
          isPublic,
          isAnonymous: dto.isAnonymous ?? false,
          status
        }
      });
      const linked = await tx.engineAsset.updateMany({ where: { id: asset.id, workId: null }, data: { workId: work.id } });
      if (!linked.count) throw new ConflictException("该生成结果已发布，请勿重复操作");
      await tx.user.update({ where: { id: userId }, data: { worksCount: { increment: 1 } } });
      return work;
    });

    if (needsImageReview) {
      await this.safety.beginWorkImageReview(userId, published.id, published.imageUrl, this.uploads.readUrl(published.imageUrl, "private"));
    }
    if (published.status === "published" && published.isPublic) {
      await this.publishRewards.awardPublishedWork(userId, published.id);
    }
    return {
      workId: published.id,
      status: published.status,
      isPublic: published.isPublic,
      isAnonymous: published.isAnonymous
    };
  }

  async retryStorage(userId: number, jobId: string) {
    const job = await this.loadJob(jobId);
    if (job.userId !== userId) throw new ForbiddenException("无权重试该任务");
    return { retried: await this.storage.retryFailedAssets(jobId) };
  }

  // ---------------- 回调 ----------------

  async handleKieCallback(body: Record<string, unknown>, query: { secret?: string; jobId?: string; sig?: string } = {}) {
    const callbackSecret = this.config.get<string>("app.callbackSecret") || "";
    let signedJobId = "";
    if (callbackSecret) {
      const signatureOk = Boolean(query.jobId && query.sig && timingSafeEqualStrings(kieCallbackSignature(callbackSecret, query.jobId), query.sig));
      const sharedOk = timingSafeEqualStrings(query.secret, callbackSecret);
      if (!signatureOk && !sharedOk) throw new UnauthorizedException("invalid callback signature");
      if (signatureOk) signedJobId = query.jobId as string;
    } else if (process.env.NODE_ENV === "production") {
      throw new UnauthorizedException("callback secret not configured");
    } else {
      this.logger.warn("CALLBACK_SECRET 未配置，开发环境放行 KIE 回调；生产环境将直接拒绝");
    }
    const taskId = kieCallbackTaskId(body);
    if (!taskId) throw new BadRequestException("callback missing taskId");
    const attempt = await this.prisma.engineAttempt.findFirst({
      where: { upstreamTaskId: taskId, state: { in: ["submitted", "pending"] } },
      orderBy: { index: "desc" }
    });
    if (!attempt) {
      const finished = await this.prisma.engineAttempt.findFirst({ where: { upstreamTaskId: taskId }, orderBy: { index: "desc" } });
      if (!finished) throw new NotFoundException("engine job not found");
      return this.toJobView(await this.loadJob(finished.jobId));
    }
    // 签名回调必须与任务归属一致，防止跨任务重放。
    if (signedJobId && attempt.jobId !== signedJobId) throw new UnauthorizedException("callback signature does not match job");
    const adapter = resolveAdapter((attempt.adapter || "kie") as AdapterKind, "async");
    if (!adapter.parseCallback) throw new BadRequestException("adapter does not support callbacks");
    return this.toJobView(await this.applyProviderEvent(attempt.jobId, adapter.parseCallback(body)));
  }

  async handleTransferCallback(token: string | undefined, input: Parameters<EngineStorageService["completeTransfer"]>[1]) {
    return this.storage.completeTransfer(token, input);
  }

  async handleGenerationCallback(token: string | undefined, input: Parameters<EngineStorageService["completeGeneration"]>[1]) {
    const result = await this.storage.completeGeneration(token, input);
    if (result && typeof result === "object" && "error" in result && result.error && input.jobId) {
      const { kind, maybeBilled } = classifyEventError(String(result.error));
      await this.handleProviderFailure(input.jobId, "", String(result.error), kind, maybeBilled, 0);
    } else if (input.jobId && input.outputs?.length) {
      // FC 生成成功：把挂起尝试标记为成功，健康统计与试运行面板依赖该终态。
      const pending = await this.prisma.engineAttempt.findFirst({
        where: { jobId: input.jobId, state: "pending" },
        orderBy: { index: "desc" },
        select: { id: true, startedAt: true }
      });
      if (pending) {
        await this.prisma.engineAttempt.update({
          where: { id: pending.id },
          data: { state: "succeeded", latencyMs: Date.now() - pending.startedAt.getTime(), finishedAt: new Date() }
        });
      }
    }
    return { ok: true };
  }

  // ---------------- 反推提示词（真实视觉调用） ----------------

  async reversePrompt(userId: number, dto: { imageUrl: string; hint?: string }) {
    const imageUrl = dto.imageUrl.trim();
    if (!/^https:\/\//i.test(imageUrl)) throw new BadRequestException("imageUrl must be a https URL");
    const providers = await this.prisma.generationProvider.findMany({ where: { enabled: true } });
    const vision = providers
      .map((row) => ({ row, config: readProviderConfig(row) }))
      .find((item) => item.config.adapter === "gemini" && this.resolveProviderApiKey(item.row.apiKeyEncrypted, item.row.apiKeyEnv));
    if (!vision) {
      throw new BadRequestException("反推提示词功能暂未开放");
    }
    const model = vision.config.requestParams.model || "gemini-3.1-flash-image-preview";
    const reference = await this.fetchVisionReference(imageUrl);
    const instruction = [
      "请根据这张图片反推出一段高质量的 AI 绘画提示词（prompt）。",
      "要求：描述主体、构图、风格、光线、色调、细节；输出一行中文提示词，不要解释。",
      dto.hint ? `用户补充说明：${dto.hint}` : ""
    ].filter(Boolean).join("\n");
    const endpoint = vision.config.baseUrl.includes("{model}")
      ? vision.config.baseUrl.replace("{model}", encodeURIComponent(model))
      : vision.config.baseUrl;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-goog-api-key": this.resolveProviderApiKey(vision.row.apiKeyEncrypted, vision.row.apiKeyEnv), "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: instruction }, { inlineData: { mimeType: reference.contentType, data: reference.buffer.toString("base64") } }]
          }]
        }),
        signal: AbortSignal.timeout(60_000)
      });
    } catch {
      throw new BadRequestException("反推服务连接失败，本次未扣除积分，请稍后重试");
    }
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !payload) throw new BadRequestException("反推服务暂时不可用，本次未扣除积分");
    const text = this.extractGeminiText(payload);
    if (!text) throw new BadRequestException("未获取到反推结果，本次未扣除积分");

    const { balance } = await this.credits.addTransaction(userId, "consume", -REVERSE_PROMPT_COST, "反推提示词", imageUrl.slice(0, 200));
    return { prompt: text, costCredits: REVERSE_PROMPT_COST, creditsAfter: balance, provider: "engine-vision" };
  }

  private extractGeminiText(payload: Record<string, unknown>): string {
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    for (const candidate of candidates) {
      const content = (candidate as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
      const parts = Array.isArray(content?.parts) ? content.parts : [];
      const texts = parts
        .map((part) => (part as Record<string, unknown>)?.text)
        .filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
      if (texts.length) return texts.join(" ").trim().slice(0, 1200);
    }
    return "";
  }

  private async fetchVisionReference(imageUrl: string) {
    let response: Response;
    try {
      response = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    } catch {
      throw new BadRequestException("图片下载失败，请重试");
    }
    if (!response.ok) throw new BadRequestException("图片下载失败，请重试");
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.byteLength > 20 * 1024 * 1024) throw new BadRequestException("图片大小无效");
    return { buffer, contentType };
  }

  // ---------------- 内部工具 ----------------

  private async loadJob(jobId: string): Promise<JobWithRelations> {
    const job = await this.prisma.engineJob.findUnique({ where: { id: jobId }, include: { assets: true, attempts: true } });
    if (!job) throw new NotFoundException("生成任务不存在");
    return job;
  }

  readSnapshot(job: EngineJob): ProviderSnapshot {
    const raw = job.providerSnapshot as unknown as ProviderSnapshot | null;
    if (!raw?.config) throw new Error(`engine job ${job.id} missing provider snapshot`);
    return raw;
  }

  private readCandidates(job: EngineJob): string[] {
    const value = job.providerCandidates;
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && Boolean(item));
    return [job.providerId];
  }

  readInputImageUrls(job: Pick<EngineJob, "inputImageUrls">): string[] {
    const values = Array.isArray(job.inputImageUrls) ? job.inputImageUrls : [];
    return [...new Set(values.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))].slice(0, 5);
  }

  resolveProviderApiKey(encrypted: string, envName: string) {
    if (encrypted) {
      return decryptProviderApiKey(encrypted, this.config.get<string>("app.generationProviderEncryptionKey") || "");
    }
    return process.env[envName] || "";
  }

  buildContext(snapshot: ProviderSnapshot, jobId?: string): AdapterContext {
    return buildAdapterContext({
      config: snapshot.config,
      apiKey: this.resolveProviderApiKey(snapshot.apiKeyEncrypted, snapshot.apiKeyEnv),
      callbackUrl: this.buildCallbackUrl(jobId),
      allowedReferenceHosts: this.referenceHosts()
    });
  }

  /**
   * KIE 回调地址：兼容旧 env（/generate/callback 自动改写为 v3 路由），
   * 并对具体任务附加 per-job HMAC 签名，回调侧 timing-safe 校验。
   */
  private buildCallbackUrl(jobId?: string): string {
    const kie = this.config.get<{ callbackUrl?: string }>("app.kie");
    let base = (kie?.callbackUrl || "").trim();
    if (!base) return "";
    if (base.includes("/generate/callback")) base = base.replace("/generate/callback", "/engine/callbacks/kie");
    const secret = this.config.get<string>("app.callbackSecret") || "";
    if (!jobId || !secret) return base;
    try {
      const url = new URL(base);
      url.searchParams.set("jobId", jobId);
      url.searchParams.set("sig", kieCallbackSignature(secret, jobId));
      return url.toString();
    } catch {
      return base;
    }
  }

  private referenceHosts(): string[] {
    const hosts = new Set<string>();
    const bucket = process.env.OSS_BUCKET || "";
    const endpoint = process.env.OSS_ENDPOINT || "";
    if (bucket && endpoint) hosts.add(`${bucket}.${endpoint}`.toLowerCase());
    const cdn = process.env.CDN_BASE_URL || "";
    const publicCdn = process.env.CDN_PUBLIC_BASE_URL || "";
    for (const value of [cdn, publicCdn]) {
      if (!value) continue;
      try {
        hosts.add(new URL(value).hostname.toLowerCase());
      } catch {
        // 无效配置不扩大白名单。
      }
    }
    return [...hosts];
  }

  toJobView(job: EngineJob & { assets?: EngineAsset[] }) {
    const rules = this.readSnapshotSafe(job)?.config.resultUrlRewriteRules ?? [];
    return {
      id: job.id,
      clientRequestId: job.clientRequestId,
      operation: job.operation,
      modelId: job.modelId,
      prompt: job.prompt,
      inputImageUrls: this.readInputImageUrls(job).map((url) => this.uploads.readUrl(url, "private")),
      styleId: job.styleId ?? undefined,
      gameplayId: job.gameplayId ?? undefined,
      ratio: job.ratio,
      quality: job.quality,
      count: job.count,
      status: job.status,
      progress: job.progress,
      stage: job.stageText,
      costCredits: job.costCredits,
      refundCredits: job.refundCredits,
      billing: job.billingState,
      failure: job.failureCode
        ? { code: job.failureCode, message: job.failureMessage }
        : job.status === "failed"
          ? { code: FAILURE_CODES.unknown, message: "生成失败，请稍后重试" }
          : undefined,
      providerId: job.providerId,
      retryOfJobId: job.retryOfJobId || undefined,
      assets: [...(job.assets ?? [])]
        .sort((a, b) => a.index - b.index)
        .map((asset) => {
          const displaySource = asset.status === "transferring" && asset.providerUrl
            ? rewriteProviderResultUrl(asset.providerUrl, normalizeProviderResultUrlRewriteRules(rules)).url
            : asset.url || asset.providerUrl;
          const imageUrl = displaySource ? this.uploads.readUrl(displaySource, "private") : undefined;
          return {
            id: asset.id,
            index: asset.index,
            status: asset.status,
            temporary: asset.status === "transferring",
            imageUrl,
            cardUrl: imageUrl ? this.uploads.readResponsiveImageUrl(imageUrl, "private") : undefined,
            previewUrl: imageUrl ? this.uploads.readDetailPreviewImageUrl(imageUrl, "private") : undefined,
            originalUrl: imageUrl,
            width: asset.width ?? undefined,
            height: asset.height ?? undefined,
            sizeBytes: asset.sizeBytes ?? undefined,
            workId: asset.workId ?? undefined,
            errorMessage: asset.errorMessage || undefined,
            createdAt: asset.createdAt.toISOString()
          };
        }),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      finishedAt: job.finishedAt?.toISOString()
    };
  }

  private readSnapshotSafe(job: EngineJob): ProviderSnapshot | null {
    try {
      return this.readSnapshot(job);
    } catch {
      return null;
    }
  }
}
