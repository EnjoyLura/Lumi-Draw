import { Injectable, Logger } from "@nestjs/common";
import type { EngineJob } from "@prisma/client";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import { WechatWalletService } from "../payments/wechat-wallet.service";
import { FAILURE_CODES, FAILURE_STAGE_MESSAGES, FAILURE_USER_MESSAGES, type FailureStage } from "./provider-config";
import { resolveGeneratedImageSize } from "../common/generated-image-size";
import type { ProviderErrorKind } from "./engine.types";

export type GeneratedImage = {
  /** 最终可访问 URL（data:/OSS/CDN）。转存路径在转存完成后回填。 */
  url?: string;
  ossKey: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  transferHost?: string;
  transferFallbackUsed?: boolean;
  transferTtfbMs?: number;
  transferDownloadMs?: number;
  transferUploadMs?: number;
};

/** 转存退避节奏：1/3/10/30 分钟，之后每小时兜底。 */
export function transferRetryDelayMs(attempt: number): number {
  const delays = [60_000, 3 * 60_000, 10 * 60_000, 30 * 60_000];
  return delays[Math.max(0, Math.min(delays.length - 1, attempt - 1))] ?? 60 * 60_000;
}

export function calculatePartialRefund(costCredits: number, refundCredits: number, requestedCount: number, resultCount: number) {
  const safeCount = Math.max(1, requestedCount);
  const missingCount = Math.max(0, safeCount - Math.min(resultCount, safeCount));
  if (!missingCount) return { missingCount: 0, refundCredits: 0 };
  const remainingCredits = Math.max(0, costCredits - refundCredits);
  return {
    missingCount,
    refundCredits: Math.min(remainingCredits, Math.floor((costCredits * missingCount) / safeCount))
  };
}

type WalletAdjustment = { balance: number; billNo: string; refunded: boolean } | null;

/**
 * 引擎账务：预扣 → 按张结算 → 部分退/全退 + 微信钱包对账补偿。
 * DB 积分变动全部事务内 + refId 幂等；钱包退款失败置 walletPendingRefund，
 * watchdog 用确定性退款单号重试（上游幂等，不会重复退款）。
 */
@Injectable()
export class EngineBillingService {
  private readonly logger = new Logger(EngineBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly wallet: WechatWalletService
  ) {}

  draftTitle(prompt: string, index?: number) {
    const base = prompt.trim().replace(/\s+/g, " ").slice(0, 24) || "AI generated work";
    return index ? `${base} ${index}` : base;
  }

  /**
   * 用户可见文案按失败阶段给，只有用户自己能处置的几类（内容安全、尺寸、参数）
   * 才保留按 kind 的细文案；其余一律“上游/下载/平台”三档，不摊开上游错误码。
   */
  failure(kind: ProviderErrorKind, stage: FailureStage = "upstream") {
    const actionable = kind === "policy" || kind === "size" || kind === "invalid_request";
    const message = actionable
      ? FAILURE_USER_MESSAGES[kind] ?? FAILURE_USER_MESSAGES.unknown
      : FAILURE_STAGE_MESSAGES[stage] ?? FAILURE_STAGE_MESSAGES.upstream;
    return { code: FAILURE_CODES[kind] ?? 42004, message };
  }

  /** 终态失败退款。返回实际记入的退款积分。 */
  async refundJob(job: EngineJob, reason: string, refId: string): Promise<number> {
    const refundCredits = Math.max(0, job.costCredits - job.refundCredits);
    if (refundCredits <= 0) return 0;
    if (job.walletBillNo) {
      return this.refundWalletJob(job, refundCredits, reason, refId);
    }
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.engineJob.findUniqueOrThrow({ where: { id: job.id } });
      if (current.billingState === "refunded") return 0;
      const credited = Math.max(0, current.costCredits - current.refundCredits);
      await tx.engineJob.update({
        where: { id: job.id },
        data: { billingState: "refunded", refundCredits: current.refundCredits + credited }
      });
      await this.credits.addTransactionInTx(tx, job.userId, "refund", credited, reason, refId);
      return credited;
    });
  }

  private async refundWalletJob(job: EngineJob, refundCredits: number, reason: string, refId: string): Promise<number> {
    let walletRefund: Awaited<ReturnType<WechatWalletService["refund"]>> = null;
    try {
      walletRefund = await this.wallet.refund(job.userId, job.walletBillNo, refundCredits);
    } catch (error) {
      this.logger.error(`微信钱包退款转入补偿队列 job=${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      await this.prisma.engineJob.update({
        where: { id: job.id, walletPendingRefund: 0 },
        data: { walletPendingRefund: refundCredits }
      });
      return 0;
    }
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.engineJob.findUniqueOrThrow({ where: { id: job.id } });
      if (current.billingState === "refunded") return 0;
      const credited = Math.max(0, current.costCredits - current.refundCredits);
      await tx.engineJob.update({
        where: { id: job.id },
        data: { billingState: "refunded", refundCredits: current.refundCredits + credited, walletRefunded: true }
      });
      if (walletRefund) {
        await this.credits.syncExternalBalanceInTx(tx, job.userId, "refund", credited, walletRefund.balance, reason, refId);
      } else {
        // 钱包返回 null（功能关闭）时按普通流水入账。
        await this.credits.addTransactionInTx(tx, job.userId, "refund", credited, reason, refId);
      }
      return credited;
    });
  }

  /** watchdog 钱包退款补偿：逐笔重试 walletPendingRefund > 0 的任务。 */
  async reconcilePendingWalletRefunds(limit = 20): Promise<void> {
    const jobs = await this.prisma.engineJob.findMany({
      where: { walletPendingRefund: { gt: 0 } },
      orderBy: { updatedAt: "asc" },
      take: limit
    });
    for (const job of jobs) {
      try {
        const refunded = await this.wallet.refund(job.userId, job.walletBillNo, job.walletPendingRefund);
        if (!refunded) continue;
        await this.prisma.$transaction(async (tx) => {
          await tx.engineJob.update({
            where: { id: job.id },
            data: { walletPendingRefund: 0, walletRefunded: true }
          });
          await this.credits.syncExternalBalanceInTx(
            tx,
            job.userId,
            "refund",
            job.walletPendingRefund,
            refunded.balance,
            "AI生成任务退款补偿",
            `engine_wallet_reconcile:${job.id}`
          );
        });
        this.logger.log(`微信钱包退款补偿成功 job=${job.id} amount=${job.walletPendingRefund}`);
      } catch (error) {
        this.logger.warn(`微信钱包退款补偿失败 job=${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /** 直接产出（buffer/FC base64/mock）：一次落库 stored 资产 + 草稿作品 + 部分退款。 */
  async settleWithDrafts(job: EngineJob, results: GeneratedImage[], stageText: string, allowedStatuses: string[] = ["queued", "submitted", "running"]) {
    const accepted = results.slice(0, job.count);
    const expected = resolveGeneratedImageSize(job.ratio, job.quality);
    const partial = calculatePartialRefund(job.costCredits, job.refundCredits, job.count, accepted.length);
    const walletAdjustment = await this.repriceWalletAfterPartialRefund(job, partial.refundCredits);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.engineJob.updateMany({
        where: { id: job.id, status: { in: allowedStatuses } },
        data: { status: "settling", stageText: "正在保存作品" }
      });
      if (!claimed.count) return tx.engineJob.findUniqueOrThrow({ where: { id: job.id } });
      await tx.engineAsset.deleteMany({ where: { jobId: job.id, workId: null } });
      const styleName = job.dryRun || !job.styleId
        ? ""
        : (await tx.style.findUnique({ where: { id: job.styleId }, select: { name: true } }))?.name ?? "";
      for (const [index, result] of accepted.entries()) {
        // 试运行任务只落库产物供后台检视，不建草稿作品、不计入用户作品数。
        const workId = job.dryRun ? null : (await tx.work.create({
          data: {
            userId: job.userId,
            title: this.draftTitle(job.prompt, accepted.length > 1 ? index + 1 : undefined),
            description: "",
            prompt: job.prompt,
            imageUrl: result.url ?? "",
            ratio: job.ratio,
            quality: job.quality,
            modelId: job.modelId,
            style: styleName,
            isPublic: false,
            status: "draft"
          }
        })).id;
        await tx.engineAsset.create({
          data: {
            jobId: job.id,
            index: index + 1,
            status: "stored",
            ...assetColumns(result, expected),
            workId
          }
        });
      }
      if (accepted.length && !job.dryRun) {
        await tx.user.update({ where: { id: job.userId }, data: { worksCount: { increment: accepted.length } } });
      }
      if (partial.refundCredits > 0) {
        const refId = `engine_partial_refund:${job.id}`;
        if (walletAdjustment) {
          await this.credits.syncExternalBalanceInTx(tx, job.userId, "refund", partial.refundCredits, walletAdjustment.balance, "AI生成部分失败返还", refId);
        } else {
          await this.credits.addTransactionInTx(tx, job.userId, "refund", partial.refundCredits, "AI生成部分失败返还", refId);
        }
      }
      // 调用方（创建任务响应等）可能直接消费本次返回体构建视图，
      // 必须带上 assets，否则同步结算的任务会以"终态+空结果"返回给前端。
      return tx.engineJob.update({
        where: { id: job.id },
        data: {
          status: partial.missingCount ? "partial_failed" : "succeeded",
          billingState: "settled",
          progress: 100,
          stageText: partial.missingCount ? "部分图片生成完成，缺少结果已返还积分" : stageText,
          failureMessage: partial.missingCount ? `有 ${partial.missingCount} 张图片未生成，已返还 ${partial.refundCredits} 积分` : "",
          refundCredits: job.refundCredits + partial.refundCredits,
          ...(walletAdjustment ? { walletBillNo: walletAdjustment.billNo, walletRefunded: walletAdjustment.refunded } : {}),
          startedAt: job.startedAt ?? new Date(),
          finishedAt: new Date()
        },
        include: { assets: true }
      });
    });
  }

  /** URL 转存路径的最终结算：全部资产到终态后按成功张数结算并建草稿作品。 */
  async settleTransferredJob(jobId: string, transferError = "") {
    const job = await this.prisma.engineJob.findUnique({ where: { id: jobId }, include: { assets: true } });
    if (!job || job.assets.some((asset) => asset.status === "transferring" || asset.status === "pending")) return null;
    if (["succeeded", "partial_failed", "failed"].includes(job.status)) return job;
    const successful = job.assets.filter((asset) => asset.status === "stored" && asset.url).slice(0, job.count);
    if (!successful.length) {
      await this.failJob(jobId, "parse", transferError || "图片永久保存失败", "download");
      return null;
    }
    const partial = calculatePartialRefund(job.costCredits, job.refundCredits, job.count, successful.length);
    const walletAdjustment = await this.repriceWalletAfterPartialRefund(job, partial.refundCredits);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.engineJob.updateMany({
        where: { id: jobId, status: "settling" },
        data: { stageText: "正在保存作品" }
      });
      if (!claimed.count) return tx.engineJob.findUniqueOrThrow({ where: { id: jobId } });
      if (!job.dryRun) {
        const styleName = job.styleId ? (await tx.style.findUnique({ where: { id: job.styleId }, select: { name: true } }))?.name ?? "" : "";
        for (const asset of successful) {
          const work = await tx.work.create({
            data: {
              userId: job.userId,
              title: this.draftTitle(job.prompt, successful.length > 1 ? asset.index : undefined),
              description: "",
              prompt: job.prompt,
              imageUrl: asset.url,
              ratio: job.ratio,
              quality: job.quality,
              modelId: job.modelId,
              style: styleName,
              isPublic: false,
              status: "draft"
            }
          });
          await tx.engineAsset.update({ where: { id: asset.id }, data: { workId: work.id } });
        }
        await tx.user.update({ where: { id: job.userId }, data: { worksCount: { increment: successful.length } } });
      }
      if (partial.refundCredits > 0) {
        const refId = `engine_partial_refund:${jobId}`;
        if (walletAdjustment) {
          await this.credits.syncExternalBalanceInTx(tx, job.userId, "refund", partial.refundCredits, walletAdjustment.balance, "AI生成部分失败返还", refId);
        } else {
          await this.credits.addTransactionInTx(tx, job.userId, "refund", partial.refundCredits, "AI生成部分失败返还", refId);
        }
      }
      return tx.engineJob.update({
        where: { id: jobId },
        data: {
          status: partial.missingCount ? "partial_failed" : "succeeded",
          billingState: "settled",
          progress: 100,
          stageText: partial.missingCount ? "部分图片生成完成，缺少结果已返还积分" : "生成完成",
          failureMessage: partial.missingCount ? `有 ${partial.missingCount} 张图片未保存，已返还 ${partial.refundCredits} 积分` : "",
          refundCredits: job.refundCredits + partial.refundCredits,
          ...(walletAdjustment ? { walletBillNo: walletAdjustment.billNo, walletRefunded: walletAdjustment.refunded } : {}),
          finishedAt: new Date()
        }
      });
    });
  }

  async failJob(jobId: string, kind: ProviderErrorKind, rawMessage: string, stage: FailureStage = "upstream") {
    const failure = this.failure(kind, stage);
    const current = await this.prisma.engineJob.findUnique({ where: { id: jobId } });
    if (!current || ["succeeded", "partial_failed", "failed", "cancelled"].includes(current.status)) return current;
    const refundedCredits = await this.refundJob(current, "AI生成任务失败返还", `engine_refund:${jobId}`);
    const message = refundedCredits > 0 ? `${failure.message}（已返还 ${refundedCredits} 积分）` : failure.message;
    this.logger.warn(`engine job failed job=${jobId} kind=${kind} raw=${rawMessage.slice(0, 200)}`);
    return this.prisma.engineJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        progress: 0,
        stageText: "生成失败",
        failureCode: failure.code,
        failureMessage: message,
        finishedAt: new Date()
      }
    });
  }

  /** 部分退款时微信钱包"先全退再补扣净额"；失败不阻塞任务推进，只留日志。 */
  private async repriceWalletAfterPartialRefund(job: EngineJob, refundCredits: number): Promise<WalletAdjustment> {
    if (!this.wallet.enabled || !job.walletBillNo || refundCredits <= 0) return null;
    const currentCharge = Math.max(0, job.costCredits - job.refundCredits);
    let refunded: Awaited<ReturnType<WechatWalletService["refund"]>> = null;
    try {
      refunded = await this.wallet.refund(job.userId, job.walletBillNo, currentCharge);
    } catch (error) {
      this.logger.error(`微信钱包部分退款失败 job=${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
    if (!refunded) return null;
    const netCost = Math.max(0, job.costCredits - job.refundCredits - refundCredits);
    if (netCost === 0) return { balance: refunded.balance, billNo: job.walletBillNo, refunded: true };
    const debit = await this.wallet.deduct(job.userId, netCost, `e_net_${job.id}`, "AI生成任务实际消耗");
    if (!debit) {
      this.logger.error(`微信钱包部分退款后补扣失败 job=${job.id}`);
      return { balance: refunded.balance, billNo: job.walletBillNo, refunded: true };
    }
    return { balance: debit.balance, billNo: debit.billNo, refunded: false };
  }
}

function assetColumns(result: GeneratedImage, expected: { width: number; height: number } | undefined) {
  return {
    providerUrl: result.url ?? "",
    sourceUrl: "",
    url: result.url ?? "",
    ossKey: result.ossKey,
    sizeBytes: result.sizeBytes,
    width: result.width ?? expected?.width,
    height: result.height ?? expected?.height,
    transferHost: result.transferHost ?? "",
    transferFallbackUsed: result.transferFallbackUsed === true,
    transferTtfbMs: finiteOrNull(result.transferTtfbMs),
    transferDownloadMs: finiteOrNull(result.transferDownloadMs),
    transferUploadMs: finiteOrNull(result.transferUploadMs)
  };
}

function finiteOrNull(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : null;
}
