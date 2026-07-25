import { createHash } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma, Work } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";
import { assertNoSensitiveContent } from "../common/content-safety";
import { requiresManualReview } from "../common/review-policy";
import { PublishRewardsService } from "../credits/publish-rewards.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

type ModerationStatus = "unchecked" | "submitting" | "pending" | "pass" | "review" | "risky" | "failed" | "skipped";
type TextScene = 1 | 2 | 3 | 4;

type WechatResponse = {
  errcode?: number;
  errmsg?: string;
  trace_id?: string;
  result?: { suggest?: string; label?: number };
  detail?: WechatDetail[] | WechatDetail;
};

type WechatDetail = {
  suggest?: string;
  label?: number;
  errcode?: number;
  strategy?: string;
  [key: string]: unknown;
};

export type ContentReviewSettings = {
  textEnabled: boolean;
  imageEnabled: boolean;
  manualReviewEnabled: boolean;
  autoPublishAfterPass: boolean;
};

@Injectable()
export class WechatContentSafetyService {
  private readonly logger = new Logger(WechatContentSafetyService.name);
  private readonly xml = new XMLParser({ ignoreAttributes: false, trimValues: true });
  private accessToken = "";
  private accessTokenExpiresAt = 0;
  private accessTokenPromise?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly publishRewards: PublishRewardsService
  ) {}

  async settings(): Promise<ContentReviewSettings> {
    const rows = await this.prisma.appSetting.findMany({
      where: { key: { in: ["wxTextSecCheckEnabled", "wxImageSecCheckEnabled", "manualReviewEnabled", "autoPublishAfterPass"] } },
      select: { key: true, value: true }
    });
    const values = new Map(rows.map((row) => [row.key, row.value]));
    const bool = (key: string, fallback: boolean) => values.has(key) ? values.get(key) === "true" : fallback;
    return {
      textEnabled: bool("wxTextSecCheckEnabled", true),
      imageEnabled: bool("wxImageSecCheckEnabled", true),
      manualReviewEnabled: bool("manualReviewEnabled", true),
      autoPublishAfterPass: bool("autoPublishAfterPass", false)
    };
  }

  async checkText(userId: number, values: Array<string | null | undefined>, scene: TextScene = 3) {
    await assertNoSensitiveContent(this.prisma, values);
    const content = values.filter((value): value is string => Boolean(value?.trim())).join("\n").trim();
    if (!content) return "skipped" as const;
    if (!(await this.settings()).textEnabled) return "skipped" as const;

    const openid = await this.userOpenId(userId);
    const result = await this.callWechat("/wxa/msg_sec_check", {
      content,
      version: 2,
      scene,
      openid
    });
    const suggest = String(result.result?.suggest || "").toLowerCase();
    if (suggest === "pass") return "pass" as const;
    if (suggest === "review") throw new BadRequestException("内容需要进一步审核，请修改后重试");
    if (suggest === "risky") throw new BadRequestException("内容包含不适合发布的信息，请修改后重试");
    throw new ServiceUnavailableException("微信文本审核暂不可用，请稍后重试");
  }

  async beginWorkImageReview(userId: number, workId: number, sourceUrl: string, mediaUrl: string) {
    const settings = await this.settings();
    if (!settings.imageEnabled) {
      await this.prisma.work.update({ where: { id: workId }, data: { imageModerationStatus: "skipped", imageModerationTraceId: "" } });
      return "skipped" as const;
    }
    return this.submitMedia(userId, "work", String(workId), sourceUrl, mediaUrl, 3);
  }

  async beginAvatarReview(userId: number, sourceUrl: string, mediaUrl: string) {
    const settings = await this.settings();
    if (!settings.imageEnabled) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: sourceUrl, pendingAvatarUrl: null, avatarModerationStatus: "skipped" }
      });
      return "skipped" as const;
    }
    return this.submitMedia(userId, "avatar", String(userId), sourceUrl, mediaUrl, 1);
  }

  async prepareWorkForManualApproval(work: Work, mediaUrl: string) {
    let textStatus = work.textModerationStatus as ModerationStatus;
    if (!["pass", "skipped"].includes(textStatus)) {
      textStatus = await this.checkText(work.userId, [work.title, work.description, work.prompt], 3);
      await this.prisma.work.update({ where: { id: work.id }, data: { textModerationStatus: textStatus } });
    }

    const settings = await this.settings();
    if (!settings.imageEnabled) {
      if (work.imageModerationStatus !== "skipped") {
        await this.prisma.work.update({ where: { id: work.id }, data: { imageModerationStatus: "skipped" } });
      }
      return;
    }
    if (["pass", "review"].includes(work.imageModerationStatus)) return;
    if (["pending", "submitting"].includes(work.imageModerationStatus)) {
      throw new BadRequestException("微信图片审核尚未完成，请稍后再试");
    }
    if (work.imageModerationStatus === "risky") {
      throw new BadRequestException("微信图片审核未通过，不能发布");
    }
    await this.beginWorkImageReview(work.userId, work.id, work.imageUrl, mediaUrl);
    throw new BadRequestException("已重新提交微信图片审核，请等待审核结果");
  }

  verifyCallbackSignature(signature: string, timestamp: string, nonce: string) {
    const token = this.config.get<string>("app.wx.contentSecurityToken") || "";
    if (!token || !signature || !timestamp || !nonce) return false;
    const digest = createHash("sha1").update([token, timestamp, nonce].sort().join("")).digest("hex");
    return digest === signature;
  }

  async handleMediaCallback(rawBody: unknown) {
    const payload = this.parseCallback(rawBody);
    const traceId = String(payload.trace_id || "").trim();
    if (!traceId) {
      this.logger.warn("WeChat media callback did not include trace_id");
      return;
    }
    const task = await this.prisma.contentModerationTask.findUnique({ where: { traceId } });
    if (!task || ["pass", "review", "risky"].includes(task.status)) return;

    const status = this.callbackStatus(payload);
    const details = Array.isArray(payload.detail) ? payload.detail : payload.detail ? [payload.detail] : [];
    const label = Number(payload.result?.label ?? details.find((item) => typeof item.label === "number")?.label);
    const reason = status === "risky" ? "微信图片安全审核未通过" : status === "review" ? "微信建议进一步人工审核" : status === "failed" ? "微信图片审核回调异常" : "";
    await this.prisma.contentModerationTask.update({
      where: { id: task.id },
      data: {
        status,
        suggest: status,
        label: Number.isFinite(label) ? label : null,
        detail: payload as unknown as Prisma.InputJsonValue,
        errorMessage: status === "failed" ? String(payload.errmsg || "media check failed").slice(0, 500) : "",
        completedAt: new Date()
      }
    });

    if (task.targetType === "work") await this.applyWorkResult(Number(task.targetId), task.userId, traceId, status, reason);
    if (task.targetType === "avatar") await this.applyAvatarResult(task.userId, task.sourceUrl, status);
  }

  private async submitMedia(userId: number, targetType: "work" | "avatar", targetId: string, sourceUrl: string, mediaUrl: string, scene: TextScene) {
    const previous = await this.prisma.contentModerationTask.findFirst({
      where: { targetType, targetId, sourceUrl, status: { in: ["submitting", "pending", "pass", "review"] } },
      orderBy: { createdAt: "desc" }
    });
    if (previous) {
      if (targetType === "work") {
        await this.prisma.work.update({
          where: { id: Number(targetId) },
          data: {
            imageModerationStatus: previous.status,
            imageModerationTraceId: previous.traceId || ""
          }
        });
      } else {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            pendingAvatarUrl: sourceUrl,
            avatarModerationStatus: previous.status
          }
        });
      }
      return previous.status as ModerationStatus;
    }

    const task = await this.prisma.contentModerationTask.create({
      data: { userId, targetType, targetId, sourceUrl, mediaUrl, status: "submitting" }
    });
    if (targetType === "work") {
      await this.prisma.work.update({
        where: { id: Number(targetId) },
        data: { imageModerationStatus: "submitting", imageModerationTraceId: "", moderationReason: "" }
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { pendingAvatarUrl: sourceUrl, avatarModerationStatus: "submitting" }
      });
    }
    try {
      const openid = await this.userOpenId(userId);
      const response = await this.callWechat("/wxa/media_check_async", {
        media_url: mediaUrl,
        media_type: 2,
        version: 2,
        scene,
        openid
      });
      const traceId = String(response.trace_id || "").trim();
      if (!traceId) throw new Error("WeChat media check response missing trace_id");
      await this.prisma.contentModerationTask.update({ where: { id: task.id }, data: { traceId, status: "pending" } });
      if (targetType === "work") {
        await this.prisma.work.update({ where: { id: Number(targetId) }, data: { imageModerationStatus: "pending", imageModerationTraceId: traceId } });
      } else {
        await this.prisma.user.update({ where: { id: userId }, data: { avatarModerationStatus: "pending" } });
      }
      return "pending" as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : "WeChat image moderation failed";
      await this.prisma.contentModerationTask.update({ where: { id: task.id }, data: { status: "failed", errorMessage: message.slice(0, 500), completedAt: new Date() } });
      if (targetType === "work") {
        await this.prisma.work.update({ where: { id: Number(targetId) }, data: { imageModerationStatus: "failed", moderationReason: "微信图片审核服务暂不可用" } });
      } else {
        await this.prisma.user.update({ where: { id: userId }, data: { avatarModerationStatus: "failed" } });
      }
      this.logger.error(`WeChat image moderation dispatch failed for ${targetType}:${targetId}: ${message}`);
      return "failed" as const;
    }
  }

  private async applyWorkResult(workId: number, userId: number, traceId: string, status: ModerationStatus, reason: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.imageModerationTraceId !== traceId) return;
    if (status === "risky") {
      const rejected = await this.prisma.work.updateMany({
        where: { id: workId, status: "pending" },
        data: { imageModerationStatus: status, moderationReason: reason, status: "rejected", isPublic: false }
      });
      if (rejected.count) {
        await this.notifications.createSystemNotifications([userId], "作品审核未通过", `你的作品「${work.title}」未通过图片安全审核，请修改后重试。`);
      }
      return;
    }
    await this.prisma.work.update({ where: { id: workId }, data: { imageModerationStatus: status, moderationReason: reason } });
    if (status !== "pass") return;

    if (!(await this.canAutoPublish())) return;
    const published = await this.prisma.work.updateMany({
      where: {
        id: workId,
        status: "pending",
        isPublic: true,
        textModerationStatus: { in: ["pass", "skipped"] }
      },
      data: { status: "published", moderationReason: "" }
    });
    if (published.count) await this.publishRewards.awardPublishedWork(userId, workId);
  }

  private async applyAvatarResult(userId: number, sourceUrl: string, status: ModerationStatus) {
    if (status === "pass") {
      await this.prisma.user.updateMany({
        where: { id: userId, pendingAvatarUrl: sourceUrl },
        data: { avatarUrl: sourceUrl, pendingAvatarUrl: null, avatarModerationStatus: "pass" }
      });
      return;
    }
    if (["review", "risky"].includes(status)) {
      const rejected = await this.prisma.user.updateMany({
        where: { id: userId, pendingAvatarUrl: sourceUrl },
        data: { pendingAvatarUrl: null, avatarModerationStatus: status }
      });
      if (rejected.count) await this.notifications.createSystemNotifications([userId], "头像审核未通过", "你提交的头像未通过安全审核，请更换后重试。");
      return;
    }
    await this.prisma.user.updateMany({ where: { id: userId, pendingAvatarUrl: sourceUrl }, data: { avatarModerationStatus: "failed" } });
  }

  private callbackStatus(payload: WechatResponse): ModerationStatus {
    if (payload.errcode && payload.errcode !== 0) return "failed";
    const detail = Array.isArray(payload.detail) ? payload.detail : payload.detail ? [payload.detail] : [];
    const suggestions = [payload.result?.suggest, ...detail.map((item) => item.suggest)].map((value) => String(value || "").toLowerCase());
    if (suggestions.includes("risky")) return "risky";
    if (suggestions.includes("review")) return "review";
    if (suggestions.includes("pass")) return "pass";
    return "failed";
  }

  private async canAutoPublish() {
    if (process.env.NODE_ENV === "production" && process.env.FORCE_MANUAL_REVIEW !== "false") return false;
    return !(await requiresManualReview(this.prisma));
  }

  private parseCallback(body: unknown): WechatResponse {
    if (typeof body === "string") {
      const parsed = this.xml.parse(body) as Record<string, unknown>;
      return (parsed.xml ?? parsed) as WechatResponse;
    }
    if (body && typeof body === "object") return body as WechatResponse;
    return {};
  }

  private async userOpenId(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { openId: true } });
    if (!user?.openId) throw new ServiceUnavailableException("微信账号状态不可用于内容审核，请重新登录后重试");
    return user.openId;
  }

  private async callWechat(path: string, body: Record<string, unknown>, retry = true): Promise<WechatResponse> {
    const token = await this.getAccessToken();
    const apiBase = this.config.get<string>("app.wx.apiBase") || "https://api.weixin.qq.com";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const url = new URL(path, apiBase);
      url.searchParams.set("access_token", token);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const payload = await response.json() as WechatResponse;
      if (retry && [40001, 40014, 42001].includes(Number(payload.errcode))) {
        this.accessToken = "";
        this.accessTokenExpiresAt = 0;
        return this.callWechat(path, body, false);
      }
      if (!response.ok || (payload.errcode && payload.errcode !== 0)) {
        throw new Error(`WeChat content security failed (${payload.errcode ?? response.status}): ${payload.errmsg || response.statusText}`);
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getAccessToken() {
    if (this.accessToken && this.accessTokenExpiresAt > Date.now() + 60_000) return this.accessToken;
    if (this.accessTokenPromise) return this.accessTokenPromise;
    this.accessTokenPromise = this.fetchAccessToken().finally(() => {
      this.accessTokenPromise = undefined;
    });
    return this.accessTokenPromise;
  }

  private async fetchAccessToken() {
    const appId = this.config.get<string>("app.wx.appId") || "";
    const appSecret = this.config.get<string>("app.wx.appSecret") || "";
    if (!appId || !appSecret) throw new ServiceUnavailableException("微信内容审核服务尚未配置");
    const apiBase = this.config.get<string>("app.wx.apiBase") || "https://api.weixin.qq.com";
    const url = new URL("/cgi-bin/token", apiBase);
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);
    const response = await fetch(url);
    const payload = await response.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };
    if (!response.ok || !payload.access_token) {
      throw new ServiceUnavailableException(`微信内容审核鉴权失败：${payload.errmsg || response.statusText}`);
    }
    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt = Date.now() + Math.max(300, Number(payload.expires_in || 7200) - 120) * 1000;
    return this.accessToken;
  }
}
