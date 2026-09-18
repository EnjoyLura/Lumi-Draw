import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { EngineJob } from "@prisma/client";
import { resolveGeneratedImageSize } from "../common/generated-image-size";
import { rewriteProviderResultUrl } from "../common/provider-result-url";
import { ImageTransferClient } from "./image-transfer.client";
import { normalizeImage2Size } from "../common/provider-size";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import { EngineBillingService, transferRetryDelayMs, type GeneratedImage } from "./engine-billing.service";
import type { AdapterOutput, AdapterContext } from "./engine.types";
import { resolveFcGeneration } from "./provider-config";

const TRANSFER_DISPATCH_LEASE_MS = 12 * 60_000;

/**
 * 产物转存：所有 URL 结果统一经阿里云 FC 转存进私有 OSS（图片字节不经过 API 进程），
 * 每图一行独立状态机 + 租约退避重试；FC 未配置时退化为进程内转存。
 */
@Injectable()
export class EngineStorageService {
  private readonly logger = new Logger(EngineStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly imageTransfer: ImageTransferClient,
    private readonly billing: EngineBillingService
  ) {}

  /** FC 生成/转存执行器是否就绪；决定同步平台走 FC 自动识别还是进程内适配器。 */
  isImageFunctionConfigured(): boolean {
    return this.imageTransfer.isConfigured();
  }

  /**
   * 适配器产出落库：buffer 直接传 OSS（stored），URL 建转存资产并派发 FC。
   * 返回 direct images（全部无需转存时交账务直接结算），否则返回 null 由回调驱动。
   */
  async stageOutputs(job: EngineJob, outputs: AdapterOutput[], rules: unknown): Promise<GeneratedImage[] | null> {
    const selected = outputs.slice(0, job.count);
    const expected = resolveGeneratedImageSize(job.ratio, job.quality);
    const direct: GeneratedImage[] = [];
    const transferring: Array<{ assetId: string; sourceUrl: string }> = [];

    for (const [index, output] of selected.entries()) {
      if (output.buffer?.length) {
        try {
          const uploaded = await this.uploads.uploadBuffer("generate", `${job.id}-${index + 1}`, output.contentType || "image/png", output.buffer);
          direct.push({ url: uploaded.imageUrl, ossKey: uploaded.ossKey, sizeBytes: uploaded.sizeBytes, ...expected });
        } catch (error) {
          this.logger.warn(`Inline upload failed job=${job.id} #${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
        continue;
      }
      if (output.url && this.isHttpsUrl(output.url)) {
        const contentType = this.guessContentType(output.url);
        const reserved = this.uploads.reserveGenerationImage(job.id, index + 1, contentType);
        const asset = await this.prisma.engineAsset.create({
          data: {
            jobId: job.id,
            index: index + 1,
            status: "transferring",
            providerUrl: output.url,
            sourceUrl: output.url,
            ossKey: reserved.ossKey,
            width: expected?.width,
            height: expected?.height,
            transferNextAttemptAt: new Date()
          }
        });
        transferring.push({ assetId: asset.id, sourceUrl: output.url });
      }
    }

    if (!direct.length && !transferring.length) throw new Error("图片平台没有返回可用的图片结果");
    if (transferring.length) {
      if (!this.imageTransfer.isConfigured()) {
        // FC 未配置：进程内转存兜底（配置不完整的环境/本地开发）。
        await this.inlineFallback(job, transferring, rules);
        return null;
      }
      await this.prisma.engineJob.update({
        where: { id: job.id },
        data: { status: "settling", progress: 96, stageText: "图片已生成，正在安全保存原图" }
      });
      for (const item of transferring) {
        await this.dispatchTransfer(job.id, item.assetId, item.sourceUrl, rules);
      }
      return null;
    }
    return direct;
  }

  private async inlineFallback(job: EngineJob, items: Array<{ assetId: string; sourceUrl: string }>, rules: unknown) {
    // 与 FC 路径一致：先进入 settling，结算器只认领 settling 状态的任务。
    await this.prisma.engineJob.updateMany({
      where: { id: job.id, status: { in: ["queued", "submitted", "running"] } },
      data: { status: "settling", progress: 96, stageText: "图片已生成，正在安全保存原图" }
    });
    const results: GeneratedImage[] = [];
    for (const item of items) {
      const source = rewriteProviderResultUrl(item.sourceUrl, rules);
      try {
        const transferred = await this.uploads.transferRemoteImage("generate", source.url);
        results.push({ url: transferred.imageUrl, ossKey: transferred.ossKey, sizeBytes: transferred.sizeBytes });
        await this.prisma.engineAsset.update({
          where: { id: item.assetId },
          data: { status: "stored", url: transferred.imageUrl, ossKey: transferred.ossKey, sizeBytes: transferred.sizeBytes }
        });
      } catch (error) {
        await this.prisma.engineAsset.update({
          where: { id: item.assetId },
          data: { status: "failed", errorMessage: String(error instanceof Error ? error.message : error).slice(0, 500) }
        });
      }
    }
    const fresh = await this.prisma.engineJob.findUnique({ where: { id: job.id }, include: { assets: true } });
    if (fresh) await this.billing.settleTransferredJob(fresh.id);
    void results;
  }

  /** FC 转存任务派发：条件更新做租约，防并发重复派发。 */
  async dispatchTransfer(jobId: string, assetId: string, sourceUrl: string, rules: unknown) {
    const now = new Date();
    const leased = await this.prisma.engineAsset.updateMany({
      where: {
        id: assetId,
        jobId,
        status: "transferring",
        OR: [{ transferNextAttemptAt: null }, { transferNextAttemptAt: { lte: now } }]
      },
      data: {
        transferAttempts: { increment: 1 },
        transferLastAttemptAt: now,
        transferNextAttemptAt: new Date(now.getTime() + TRANSFER_DISPATCH_LEASE_MS),
        errorMessage: ""
      }
    });
    if (!leased.count) return;
    const asset = await this.prisma.engineAsset.findUnique({ where: { id: assetId } });
    if (!asset) return;
    const rewritten = rewriteProviderResultUrl(sourceUrl, rules);
    if (rewritten.fallbackUrl) {
      this.logger.log(`Image result host rewritten asset=${assetId}`);
    }
    try {
      await this.imageTransfer.dispatchInBackground({
        invocationKey: `${asset.id}:${asset.transferAttempts}`,
        jobId,
        resultId: asset.id,
        sourceUrl: rewritten.url,
        fallbackSourceUrl: rewritten.fallbackUrl || undefined,
        objectKey: asset.ossKey
      });
    } catch (error) {
      await this.deferTransferRetry(jobId, assetId, error instanceof Error ? error.message : "图片保存服务连接失败");
    }
  }

  async deferTransferRetry(jobId: string, assetId: string, errorMessage: string) {
    const asset = await this.prisma.engineAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status !== "transferring") return;
    const retryAt = new Date(Date.now() + transferRetryDelayMs(Math.max(1, asset.transferAttempts)));
    await this.prisma.$transaction([
      this.prisma.engineAsset.update({
        where: { id: assetId },
        data: { errorMessage: errorMessage.slice(0, 500), transferNextAttemptAt: retryAt }
      }),
      this.prisma.engineJob.updateMany({
        where: { id: jobId, status: "settling" },
        data: { stageText: "图片已生成，正在重试安全保存原图", failureMessage: "" }
      })
    ]);
  }

  /** FC 转存完成回调（token 校验 + 资产匹配 + 终态幂等）。 */
  async completeTransfer(
    token: string | undefined,
    input: {
      jobId?: string;
      resultId?: string;
      objectKey?: string;
      sizeBytes?: number;
      transferHost?: string;
      transferFallbackUsed?: boolean;
      transferTtfbMs?: number;
      transferDownloadMs?: number;
      transferUploadMs?: number;
      error?: string;
    }
  ) {
    if (!this.imageTransfer.matchesToken(token)) throw new UnauthorizedException("invalid image transfer token");
    if (!input.jobId || !input.resultId || !input.objectKey) throw new BadRequestException("invalid image transfer callback");
    const asset = await this.prisma.engineAsset.findUnique({ where: { id: input.resultId }, include: { job: true } });
    if (!asset || asset.jobId !== input.jobId) return { ok: true };
    if (asset.job.status !== "settling") return { ok: true };
    if (asset.ossKey !== input.objectKey) throw new BadRequestException("image transfer result does not match job");
    if (asset.status !== "transferring") return { ok: true };

    const metrics = {
      transferHost: String(input.transferHost || "").slice(0, 255),
      transferFallbackUsed: input.transferFallbackUsed === true,
      transferTtfbMs: finiteMs(input.transferTtfbMs),
      transferDownloadMs: finiteMs(input.transferDownloadMs),
      transferUploadMs: finiteMs(input.transferUploadMs)
    };

    if (input.error) {
      await this.prisma.engineAsset.update({ where: { id: asset.id }, data: metrics });
      await this.deferTransferRetry(input.jobId, asset.id, input.error);
      return { ok: true };
    }

    await this.prisma.engineAsset.update({
      where: { id: asset.id },
      data: {
        status: "stored",
        url: this.uploads.objectUrlForKey(asset.ossKey),
        sizeBytes: Math.max(0, Math.floor(input.sizeBytes || 0)),
        errorMessage: "",
        transferNextAttemptAt: null,
        ...metrics
      }
    });
    await this.billing.settleTransferredJob(input.jobId);
    return { ok: true };
  }

  /** 同步任务：整条生成（含上游调用、url/base64 识别与 OSS 直存）都交给 FC。 */
  async dispatchFcGeneration(job: EngineJob, ctx: AdapterContext, req: { providerModel: string; prompt: string; inputImageUrls: string[]; count: number }) {
    if (!ctx.config.baseUrl || !ctx.apiKey) throw new Error("Image provider configuration is incomplete");
    if (!this.imageTransfer.isConfigured()) throw new Error("Image generation function is not configured");
    const plan = resolveFcGeneration(ctx.config, job.operation as "text-to-image" | "image-to-image", req.providerModel);
    if (!plan) throw new Error("Provider protocol does not support FC generation dispatch");
    const { protocol, endpoint } = plan;
    // 图生图与文生图的请求参数集按操作区分（与适配器同语义）。
    const operationParams = job.operation === "image-to-image" ? ctx.config.imageRequestParams : ctx.config.requestParams;
    const outputFormat = String(operationParams.output_format || "png").toLowerCase();
    const contentType = outputFormat === "jpeg" || outputFormat === "jpg" ? "image/jpeg" : outputFormat === "webp" ? "image/webp" : "image/png";
    const objectKeys = Array.from({ length: req.count }, (_, index) => this.uploads.reserveGenerationImage(job.id, index + 1, contentType).ossKey);
    await this.imageTransfer.dispatchGeneration({
      operation: "generate",
      invocationKey: `${job.id}:${job.providerAttemptIndex}:${job.startedAt?.getTime() || 0}`,
      jobId: job.id,
      provider: {
        protocol,
        endpoint,
        apiKey: ctx.apiKey,
        model: req.providerModel,
        params: operationParams,
        requestMode: ctx.config.requestMode,
        queryEndpoint: ctx.config.queryEndpoint,
        responseMapping: ctx.config.responseMapping,
        sizeConfig: {
          mode: ctx.config.sizeMode,
          pixelSizeField: ctx.config.pixelSizeField,
          ratioField: ctx.config.ratioField,
          resolutionField: ctx.config.resolutionField
        },
        imageInputMode: ctx.config.imageInputMode,
        imageInputField: ctx.config.imageInputField,
        resultUrlRewriteRules: ctx.config.resultUrlRewriteRules
      },
      input: {
        mode: job.operation,
        prompt: req.prompt,
        inputImageUrl: req.inputImageUrls[0] || "",
        inputImageUrls: req.inputImageUrls,
        ratio: job.ratio,
        quality: job.quality,
        size: normalizeImage2Size(job.ratio, job.quality),
        count: req.count
      },
      objectKeys
    });
  }

  /** FC 生成完成回调（base64/auto 路径）。 */
  async completeGeneration(
    token: string | undefined,
    input: {
      jobId?: string;
      outputs?: Array<{ objectKey?: string; sizeBytes?: number; transferHost?: string; transferFallbackUsed?: boolean; transferTtfbMs?: number; transferDownloadMs?: number; transferUploadMs?: number }>;
      error?: string;
      progress?: number;
      stageText?: string;
    }
  ) {
    if (!this.imageTransfer.matchesToken(token)) throw new UnauthorizedException("invalid image generation token");
    if (!input.jobId) throw new BadRequestException("invalid image generation callback");
    const job = await this.prisma.engineJob.findUnique({ where: { id: input.jobId } });
    if (!job || ["succeeded", "partial_failed", "failed", "cancelled"].includes(job.status)) return { ok: true };
    if (!input.error && !input.outputs?.length && Number.isFinite(input.progress)) {
      await this.prisma.engineJob.updateMany({
        where: { id: job.id, status: { in: ["queued", "submitted", "running", "settling"] } },
        data: {
          progress: Math.max(5, Math.min(94, Math.floor(input.progress as number))),
          stageText: String(input.stageText || "AI 正在生成中").slice(0, 120)
        }
      });
      return { ok: true };
    }
    if (input.error) {
      return { ok: true, error: input.error };
    }
    const expected = resolveGeneratedImageSize(job.ratio, job.quality);
    const images: GeneratedImage[] = (input.outputs || []).flatMap((item) => {
      const objectKey = String(item.objectKey || "");
      if (!objectKey.startsWith("uploads/system/generate/") || !objectKey.includes(`/${job.id}/`)) return [];
      return [{
        url: this.uploads.objectUrlForKey(objectKey),
        ossKey: objectKey,
        sizeBytes: Math.max(0, Math.floor(item.sizeBytes || 0)),
        transferHost: String(item.transferHost || "").slice(0, 255),
        transferFallbackUsed: item.transferFallbackUsed === true,
        transferTtfbMs: finiteMs(item.transferTtfbMs) ?? undefined,
        transferDownloadMs: finiteMs(item.transferDownloadMs) ?? undefined,
        transferUploadMs: finiteMs(item.transferUploadMs) ?? undefined,
        ...expected
      }];
    });
    if (!images.length) throw new BadRequestException("image generation callback has no valid outputs");
    await this.billing.settleWithDrafts(job, images, "生成完成", ["queued", "submitted", "running", "settling"]);
    return { ok: true };
  }

  /** watchdog 转存重试扫描。 */
  async scanTransferRetries(batch = 30) {
    if (!this.imageTransfer.isConfigured()) return;
    const now = new Date();
    const pending = await this.prisma.engineAsset.findMany({
      where: {
        status: "transferring",
        ossKey: { not: "" },
        job: { status: "settling" },
        OR: [{ transferNextAttemptAt: null }, { transferNextAttemptAt: { lte: now } }]
      },
      include: { job: { select: { providerSnapshot: true } } },
      orderBy: { transferNextAttemptAt: "asc" },
      take: batch
    });
    for (const asset of pending) {
      await this.dispatchTransfer(asset.jobId, asset.id, asset.sourceUrl || asset.providerUrl, asset.job.providerSnapshot);
    }
  }

  /** 手动重试入口：把 failed 资产重新入队转存。 */
  async retryFailedAssets(jobId: string) {
    const updated = await this.prisma.engineAsset.updateMany({
      where: { jobId, status: "failed" },
      data: { status: "transferring", transferNextAttemptAt: new Date(), errorMessage: "" }
    });
    const job = await this.prisma.engineJob.findUnique({ where: { id: jobId } });
    if (job && updated.count) {
      await this.prisma.engineJob.update({
        where: { id: jobId },
        data: { status: "settling", stageText: "图片已生成，正在重试安全保存原图" }
      });
      const assets = await this.prisma.engineAsset.findMany({ where: { jobId, status: "transferring" } });
      for (const asset of assets) await this.dispatchTransfer(jobId, asset.id, asset.sourceUrl || asset.providerUrl, job.providerSnapshot);
    }
    return updated.count;
  }

  private isHttpsUrl(value: string): boolean {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }

  private guessContentType(url: string): string {
    const path = url.split("?")[0]?.toLowerCase() ?? "";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
    if (path.endsWith(".webp")) return "image/webp";
    return "image/png";
  }
}

function finiteMs(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : null;
}
