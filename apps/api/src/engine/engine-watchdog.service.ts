import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { EngineJob } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { resolveAdapter } from "./adapters";
import { EngineBillingService } from "./engine-billing.service";
import { EngineService } from "./engine.service";
import { EngineStorageService } from "./engine-storage.service";
import { ImageTransferClient } from "./image-transfer.client";
import {
  ASYNC_POLL_INTERVAL_MS,
  ENGINE_ACTIVE_STATUSES,
  STARTUP_SUBMISSION_GRACE_MS,
  WATCHDOG_INTERVAL_MS,
  type AdapterKind
} from "./engine.types";

const POLL_ERROR_BACKOFF_MS = 30_000;
const SETTLING_STALE_MS = 10 * 60_000;
const DRY_RUN_RETENTION_MS = 3 * 24 * 60 * 60_000;

/**
 * 单一守护进程：提交补偿、轮询调度、超时清扫、转存重试、退款补偿、试运行清理。
 * 所有用户侧请求都不再触发轮询；崩溃恢复只依赖数据库状态。
 */
@Injectable()
export class EngineWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EngineWatchdogService.name);
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
    private readonly billing: EngineBillingService,
    private readonly storage: EngineStorageService,
    private readonly imageTransfer: ImageTransferClient
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "production" && !this.imageTransfer.isConfigured()) {
      this.logger.error(
        "IMAGE_TRANSFER_FUNCTION_URL/IMAGE_TRANSFER_BEARER_TOKEN 未配置：生成图片将由 API 服务器进程内转存，" +
        "图片字节会占用服务器带宽（生产环境严禁此状态，请立即配置 FC 转存函数）"
      );
    }
    // 延后首轮，避免与应用启动、迁移抢占资源。
    this.timer = setTimeout(() => {
      this.timer = setInterval(() => void this.tick(), WATCHDOG_INTERVAL_MS);
      this.timer.unref?.();
    }, 10_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.recoverOrphanedJobs();
      await this.sweepStuckSubmissions();
      await this.pollDueAttempts();
      await this.sweepTotalTimeouts();
      await this.settleStaleSettlingJobs();
      await this.storage.scanTransferRetries();
      await this.billing.reconcilePendingWalletRefunds();
      await this.cleanupDryRuns();
    } catch (error) {
      this.logger.error(`watchdog tick failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.ticking = false;
    }
  }

  /** 应用重启/请求中断导致 queued 但从未提交的任务（超过宽限期）重新提交。 */
  private async recoverOrphanedJobs() {
    const cutoff = new Date(Date.now() - STARTUP_SUBMISSION_GRACE_MS);
    const orphans = await this.prisma.engineJob.findMany({
      where: { status: "queued", startedAt: null, submitDeadlineAt: null, createdAt: { lt: cutoff } },
      select: { id: true },
      take: 5,
      orderBy: { createdAt: "asc" }
    });
    for (const job of orphans) {
      const claimed = await this.prisma.engineJob.updateMany({
        where: { id: job.id, status: "queued", startedAt: null, submitDeadlineAt: null },
        data: { stageText: "重新进入生成队列" }
      });
      if (!claimed.count) continue;
      this.logger.warn(`watchdog resubmitting orphaned job ${job.id}`);
      await this.engine.submitJob(job.id);
    }
  }

  /** 超过提交截止时间仍没有拿到上游 taskId 的任务，按超时进入 failover。 */
  private async sweepStuckSubmissions() {
    const now = new Date();
    const stuck = await this.prisma.engineJob.findMany({
      where: { status: { in: ["queued", "running"] }, submitDeadlineAt: { lt: now } },
      select: { id: true, providerId: true, submitDeadlineAt: true },
      take: 10,
      orderBy: { submitDeadlineAt: "asc" }
    });
    for (const job of stuck) {
      const claimed = await this.prisma.engineJob.updateMany({
        where: { id: job.id, status: { in: ["queued", "running"] }, submitDeadlineAt: job.submitDeadlineAt },
        data: { submitDeadlineAt: null }
      });
      if (!claimed.count) continue;
      this.logger.warn(`watchdog: job ${job.id} submit deadline exceeded`);
      await this.engine.handleProviderFailure(job.id, job.providerId, "任务提交超时", "timeout", true, 0);
    }
  }

  /** 轮询到期任务：单次查询立即返回，下一次到期由本调度器再次触发。 */
  private async pollDueAttempts() {
    const now = new Date();
    const attempts = await this.prisma.engineAttempt.findMany({
      where: { state: "submitted", nextPollAt: { lte: now } },
      include: { job: { select: { id: true, status: true, providerSnapshot: true } } },
      orderBy: { nextPollAt: "asc" },
      take: 20
    });
    for (const attempt of attempts) {
      const job = attempt.job;
      if (["succeeded", "partial_failed", "failed", "cancelled"].includes(job.status)) {
        await this.prisma.engineAttempt.update({
          where: { id: attempt.id },
          data: { state: "failed", errorMessage: "任务已关闭", finishedAt: new Date() }
        });
        continue;
      }
      let adapter;
      try {
        adapter = resolveAdapter((attempt.adapter || "async-http") as AdapterKind, "async");
      } catch {
        await this.prisma.engineAttempt.update({
          where: { id: attempt.id },
          data: { state: "failed", errorMessage: `unknown adapter ${attempt.adapter}`, finishedAt: new Date() }
        });
        continue;
      }
      if (!adapter.poll) continue;
      try {
        const snapshot = this.engine.readSnapshot(job as unknown as EngineJob);
        const ctx = this.engine.buildContext(snapshot, job.id);
        const event = await adapter.poll(ctx, attempt.upstreamTaskId);
        await this.prisma.engineAttempt.update({
          where: { id: attempt.id },
          data: { nextPollAt: new Date(Date.now() + ASYNC_POLL_INTERVAL_MS) }
        });
        await this.engine.applyProviderEvent(job.id, event);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`engine poll failed job=${job.id} attempt=${attempt.id}: ${message}`);
        await this.prisma.engineAttempt.update({
          where: { id: attempt.id },
          data: { nextPollAt: new Date(Date.now() + POLL_ERROR_BACKOFF_MS), errorMessage: message.slice(0, 500) }
        });
      }
    }
  }

  /** 总时长超时：无论上游状态如何，任务失败并退款（maybeBilled 风险由运营承担）。 */
  private async sweepTotalTimeouts() {
    const now = new Date();
    const expired = await this.prisma.engineJob.findMany({
      where: { status: { in: [...ENGINE_ACTIVE_STATUSES] }, totalTimeoutAt: { lt: now } },
      select: { id: true, totalTimeoutAt: true },
      take: 10,
      orderBy: { totalTimeoutAt: "asc" }
    });
    for (const job of expired) {
      const claimed = await this.prisma.engineJob.updateMany({
        where: { id: job.id, status: { in: [...ENGINE_ACTIVE_STATUSES] }, totalTimeoutAt: job.totalTimeoutAt },
        data: { totalTimeoutAt: null }
      });
      if (!claimed.count) continue;
      this.logger.warn(`watchdog: job ${job.id} total timeout`);
      await this.billing.failJob(job.id, "timeout", "任务生成时间过长，已自动取消并退回积分");
    }
  }

  /** settling 卡死（转存全部结束但结算中断）幂等重结算。 */
  private async settleStaleSettlingJobs() {
    const staleBefore = new Date(Date.now() - SETTLING_STALE_MS);
    const stale = await this.prisma.engineJob.findMany({
      where: { status: "settling", updatedAt: { lt: staleBefore } },
      select: { id: true },
      take: 10,
      orderBy: { updatedAt: "asc" }
    });
    for (const job of stale) {
      await this.billing.settleTransferredJob(job.id);
    }
  }

  /** 管理端试运行任务保留 3 天用于排查，之后连同 attempts/assets 级联清理。 */
  private async cleanupDryRuns() {
    const cutoff = new Date(Date.now() - DRY_RUN_RETENTION_MS);
    const removed = await this.prisma.engineJob.deleteMany({
      where: { dryRun: true, createdAt: { lt: cutoff }, status: { notIn: [...ENGINE_ACTIVE_STATUSES] } }
    });
    if (removed.count) this.logger.log(`cleaned up ${removed.count} expired dry-run jobs`);
  }
}
