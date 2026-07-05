import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

function pick(body: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

const ANNOUNCE_FIELDS = ["title", "summary", "action", "popup", "rangeText", "enabled"];
const PUSH_FIELDS = ["title", "content", "target", "status"];

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  // ---------- 内容审核（待审核作品）----------
  async reviews(status: string | undefined, page: number, pageSize: number) {
    const where: Prisma.WorkWhereInput = { status: status ?? "pending" };
    const [rows, total] = await Promise.all([
      this.prisma.work.findMany({ where, orderBy: { createdAt: "desc" }, include: { user: true }, ...skipTake(page, pageSize) }),
      this.prisma.work.count({ where })
    ]);
    const items = rows.map((w) => ({
      id: w.id,
      title: w.title,
      imageUrl: w.imageUrl,
      prompt: w.prompt,
      style: w.style,
      status: w.status,
      authorName: w.user?.nickname ?? `用户${w.userId}`,
      createdAt: w.createdAt.toISOString()
    }));
    return buildPage(items, total, page, pageSize);
  }

  async approveReview(id: number) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("作品不存在");
    await this.prisma.work.update({ where: { id }, data: { status: "published", isPublic: true } });
    return { ok: true, id, status: "published" };
  }

  async rejectReview(id: number, reason: unknown) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("作品不存在");
    await this.prisma.work.update({ where: { id }, data: { status: "rejected", isPublic: false } });
    return { ok: true, id, status: "rejected", reason: typeof reason === "string" ? reason : "" };
  }

  // ---------- 举报 ----------
  async reports(status: string | undefined, page: number, pageSize: number) {
    const where: Prisma.ReportWhereInput = {};
    if (status) where.status = status;
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.report.count({ where })
    ]);
    const workIds = [...new Set(rows.map((r) => r.workId))];
    const reporterIds = [...new Set(rows.map((r) => r.reporterId))];
    const [works, users] = await Promise.all([
      this.prisma.work.findMany({ where: { id: { in: workIds } }, select: { id: true, title: true } }),
      this.prisma.user.findMany({ where: { id: { in: reporterIds } }, select: { id: true, nickname: true } })
    ]);
    const workMap = new Map(works.map((w) => [w.id, w.title]));
    const userMap = new Map(users.map((u) => [u.id, u.nickname]));
    const items = rows.map((r) => ({
      id: r.id,
      workId: r.workId,
      workTitle: workMap.get(r.workId) ?? `作品${r.workId}`,
      reporterId: r.reporterId,
      reporterName: userMap.get(r.reporterId) ?? `用户${r.reporterId}`,
      reason: r.reason,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt.toISOString()
    }));
    return buildPage(items, total, page, pageSize);
  }

  async resolveReport(id: number, body: Record<string, unknown>) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("举报不存在");
    const status = body.action === "ignore" ? "ignored" : "resolved";
    await this.prisma.report.update({ where: { id }, data: { status, handledAt: new Date() } });
    if (body.offline === true) {
      await this.prisma.work.update({ where: { id: report.workId }, data: { status: "offline", isPublic: false } }).catch(() => undefined);
    }
    return { ok: true, id, status };
  }

  // ---------- 反馈 ----------
  async feedbackList(status: string | undefined, page: number, pageSize: number) {
    const where: Prisma.FeedbackWhereInput = {};
    if (status) where.status = status;
    const [rows, total] = await Promise.all([
      this.prisma.feedback.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.feedback.count({ where })
    ]);
    return buildPage(
      rows.map((f) => ({ ...f, imageUrls: f.imageUrls ? f.imageUrls.split(",").filter(Boolean) : [], createdAt: f.createdAt.toISOString() })),
      total,
      page,
      pageSize
    );
  }

  async feedbackDetail(id: number) {
    const f = await this.prisma.feedback.findUnique({ where: { id } });
    if (!f) throw new NotFoundException("反馈不存在");
    return { ...f, imageUrls: f.imageUrls ? f.imageUrls.split(",").filter(Boolean) : [], createdAt: f.createdAt.toISOString() };
  }

  async updateFeedback(id: number, body: Record<string, unknown>) {
    await this.feedbackDetail(id);
    const data: Prisma.FeedbackUpdateInput = {};
    if (["pending", "processing", "resolved", "ignored"].includes(String(body.status))) data.status = String(body.status);
    await this.prisma.feedback.update({ where: { id }, data });
    return this.feedbackDetail(id);
  }

  async replyFeedback(id: number, reply: unknown) {
    if (typeof reply !== "string" || !reply.trim()) throw new BadRequestException("回复内容不能为空");
    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException("反馈不存在");
    const content = reply.trim();
    await this.prisma.feedback.update({ where: { id }, data: { reply: content, status: "resolved" } });
    await this.notifications.createServiceNotification(feedback.userId, content);
    return this.feedbackDetail(id);
  }

  // ---------- 公告 ----------
  announcements() {
    return this.prisma.announcement.findMany({ orderBy: { id: "desc" } });
  }
  createAnnouncement(b: Record<string, unknown>) {
    if (!b.title) throw new BadRequestException("缺少字段: title");
    return this.prisma.announcement.create({ data: pick(b, ANNOUNCE_FIELDS) as never });
  }
  updateAnnouncement(id: number, b: Record<string, unknown>) {
    return this.prisma.announcement.update({ where: { id }, data: pick(b, ANNOUNCE_FIELDS) });
  }
  deleteAnnouncement(id: number) {
    return this.prisma.announcement.delete({ where: { id } });
  }

  // ---------- 推送 ----------
  pushes() {
    return this.prisma.push.findMany({ orderBy: { id: "desc" } });
  }
  createPush(b: Record<string, unknown>) {
    if (!b.title || !b.content) throw new BadRequestException("缺少字段: title/content");
    return this.prisma.push.create({ data: pick(b, PUSH_FIELDS) as never });
  }
  updatePush(id: number, b: Record<string, unknown>) {
    return this.prisma.push.update({ where: { id }, data: pick(b, PUSH_FIELDS) });
  }
  async sendPush(id: number) {
    const p = await this.prisma.push.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("推送不存在");
    if (p.status === "sent") return p;

    const userIds = await this.resolvePushUserIds(p.target);
    const sent = await this.prisma.push.update({ where: { id }, data: { status: "sent", sentAt: new Date() } });
    await this.notifications.createSystemNotifications(userIds, sent.title, sent.content);
    return { ...sent, deliveredCount: userIds.length };
  }
  async revokePush(id: number) {
    const p = await this.prisma.push.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("推送不存在");
    return this.prisma.push.update({ where: { id }, data: { status: "revoked" } });
  }

  // ---------- 敏感词 ----------
  sensitiveWords() {
    return this.prisma.sensitiveWord.findMany({ orderBy: { id: "asc" } });
  }
  async addSensitiveWords(body: Record<string, unknown>) {
    const raw = typeof body.word === "string" ? [body.word] : Array.isArray(body.words) ? body.words : typeof body.words === "string" ? String(body.words).split(/[,，]/) : [];
    const words = raw.map((w) => String(w).trim()).filter(Boolean);
    if (!words.length) throw new BadRequestException("缺少敏感词");
    for (const word of words) {
      await this.prisma.sensitiveWord.upsert({ where: { word }, update: {}, create: { word } });
    }
    return this.sensitiveWords();
  }
  deleteSensitiveWord(id: number) {
    return this.prisma.sensitiveWord.delete({ where: { id } });
  }

  // ---------- 交易记录 ----------
  async transactions(type: string | undefined, userId: number | undefined, page: number, pageSize: number) {
    const where: Prisma.CreditTransactionWhereInput = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;
    const [rows, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.creditTransaction.count({ where })
    ]);
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true } });
    const userMap = new Map(users.map((u) => [u.id, u.nickname]));
    const items = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: userMap.get(r.userId) ?? `用户${r.userId}`,
      type: r.type,
      amount: r.amount,
      balanceAfter: r.balanceAfter,
      reason: r.reason,
      createdAt: r.createdAt.toISOString()
    }));
    return buildPage(items, total, page, pageSize);
  }

  // ---------- 财务/积分配置（AppSetting JSON）----------
  private async getJsonConfig(key: string, fallback: unknown) {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!row) return fallback;
    try {
      return JSON.parse(row.value);
    } catch {
      return fallback;
    }
  }
  private async putJsonConfig(key: string, value: unknown) {
    const v = JSON.stringify(value ?? {});
    await this.prisma.appSetting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
    return value;
  }

  getCheckinConfig() {
    return this.getJsonConfig("checkinConfig", { base: 10, tiers: [10, 10, 15, 15, 20, 20, 50] });
  }
  putCheckinConfig(body: Record<string, unknown>) {
    return this.putJsonConfig("checkinConfig", body);
  }
  getInviteConfig() {
    return this.getJsonConfig("inviteConfig", { inviterReward: 50, inviteeReward: 30 });
  }
  putInviteConfig(body: Record<string, unknown>) {
    return this.putJsonConfig("inviteConfig", body);
  }
  getCreditsConfig() {
    return this.getJsonConfig("creditsConfig", { registerGift: 1280, publishReward: 50 });
  }
  putCreditsConfig(body: Record<string, unknown>) {
    return this.putJsonConfig("creditsConfig", body);
  }

  private async resolvePushUserIds(target: string) {
    const ids = target
      .split(/[,，\s]+/)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value > 0);
    if (ids.length) {
      const users = await this.prisma.user.findMany({ where: { id: { in: ids }, status: "normal" }, select: { id: true } });
      return users.map((user) => user.id);
    }

    const users = await this.prisma.user.findMany({ where: { status: "normal" }, select: { id: true } });
    return users.map((user) => user.id);
  }
}
