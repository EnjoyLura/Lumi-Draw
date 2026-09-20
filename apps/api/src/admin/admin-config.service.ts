import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { normalizeProviderRouting } from "../common/provider-routing";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";

type UploadedImage = { buffer: Buffer; originalname: string; mimetype: string; size: number };

const bySort = { orderBy: [{ sort: "asc" as const }, { id: "asc" as const }] };

function pick(body: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

function requireFields(body: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      throw new BadRequestException(`缺少字段: ${k}`);
    }
  }
}

// 各配置实体的可写字段白名单（防止未知字段进 Prisma）
const FIELDS = {
  banner: ["title", "description", "imageUrl", "action", "sort", "enabled"],
  gameplay: ["name", "description", "prompt", "uses", "hot", "imageUrl", "enabled", "sort"],
  style: ["name", "prompt", "uses", "imageUrl", "enabled", "sort"],
  category: ["name", "count", "sort", "enabled"],
  hotSearch: ["keyword", "hot", "top", "enabled", "sort"],
  modelConfig: ["id", "provider", "providerRouting", "providerModel", "providerModelImage", "name", "description", "tags", "costCredits", "badge", "supportsTextToImage", "supportsImageToImage", "enabled", "sort"],
  qualityConfig: ["label", "pixel", "multiplier", "enabled", "sort"],
  ratioConfig: ["label", "description", "enabled", "sort"],
  rechargeTier: ["price", "credits", "bonus", "enabled", "sort"],
  memberPlan: ["name", "price", "rights", "giftCredits", "checkinBonus", "milestoneBonus", "publishBonus", "enabled", "sort"],
  appVersion: ["version", "releasedAt", "items", "sort"]
};

@Injectable()
export class AdminConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly config: ConfigService
  ) {}

  // ---------- 读 ----------
  async banners() {
    const rows = await this.prisma.banner.findMany(bySort);
    return rows.map((row) => ({
      ...row,
      imageUrl: this.uploads.readUrl(row.imageUrl, "public"),
      thumbnailUrl: this.uploads.readAdminThumbnailImageUrl(row.imageUrl, "public")
    }));
  }

  uploadBannerImage(file?: UploadedImage) {
    if (!file) throw new BadRequestException("请选择走马灯图片");
    return this.uploads.uploadBuffer("banner", file.originalname, file.mimetype, file.buffer);
  }

  uploadConfigImage(scene: string, file?: UploadedImage) {
    if (scene !== "gameplay" && scene !== "style") throw new BadRequestException("不支持的配置图片类型");
    if (!file) throw new BadRequestException("请选择封面图片");
    return this.uploads.uploadBuffer(scene, file.originalname, file.mimetype, file.buffer);
  }

  async gameplays() {
    const rows = await this.prisma.gameplay.findMany(bySort);
    return rows.map((row) => ({
      ...row,
      imageUrl: this.uploads.readUrl(row.imageUrl, "public"),
      thumbnailUrl: this.uploads.readAdminThumbnailImageUrl(row.imageUrl, "public")
    }));
  }
  async styles() {
    const rows = await this.prisma.style.findMany(bySort);
    return rows.map((row) => ({
      ...row,
      imageUrl: this.uploads.readUrl(row.imageUrl, "public"),
      thumbnailUrl: this.uploads.readAdminThumbnailImageUrl(row.imageUrl, "public")
    }));
  }
  categories() {
    return this.prisma.category.findMany(bySort);
  }
  hotSearches() {
    return this.prisma.hotSearch.findMany(bySort);
  }
  models() {
    return this.prisma.modelConfig.findMany(bySort);
  }
  qualities() {
    return this.prisma.qualityConfig.findMany(bySort);
  }
  ratios() {
    return this.prisma.ratioConfig.findMany(bySort);
  }
  rechargeTiers() {
    return this.prisma.rechargeTier.findMany(bySort);
  }
  memberPlans() {
    return this.prisma.memberPlan.findMany(bySort);
  }
  versions() {
    return this.prisma.appVersion.findMany({ orderBy: [{ sort: "asc" }, { id: "desc" }] });
  }
  agreements() {
    return this.prisma.agreement.findMany({ orderBy: { type: "asc" } });
  }

  async settings() {
    const rows = await this.prisma.appSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async reviewSettings() {
    const rows = await this.prisma.appSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const bool = (k: string, def: boolean) => (map.has(k) ? map.get(k) === "true" : def);
    return {
      wxTextSecCheckEnabled: bool("wxTextSecCheckEnabled", true),
      wxImageSecCheckEnabled: bool("wxImageSecCheckEnabled", true),
      manualReviewEnabled: bool("manualReviewEnabled", true),
      autoPublishAfterPass: bool("autoPublishAfterPass", false)
    };
  }

  // ---------- 通用整型主键 CRUD ----------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createNumeric(model: any, key: keyof typeof FIELDS, body: Record<string, unknown>, required: string[]) {
    requireFields(body, required);
    return model.create({ data: pick(body, FIELDS[key]) });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateNumeric(model: any, key: keyof typeof FIELDS, id: number, body: Record<string, unknown>) {
    return model.update({ where: { id }, data: pick(body, FIELDS[key]) });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private removeNumeric(model: any, id: number) {
    return model.delete({ where: { id } });
  }

  // banners
  createBanner(b: Record<string, unknown>) { return this.createNumeric(this.prisma.banner, "banner", b, ["title", "description"]); }
  updateBanner(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.banner, "banner", id, b); }
  deleteBanner(id: number) { return this.removeNumeric(this.prisma.banner, id); }
  // gameplays
  createGameplay(b: Record<string, unknown>) { return this.createNumeric(this.prisma.gameplay, "gameplay", b, ["name", "description", "prompt"]); }
  updateGameplay(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.gameplay, "gameplay", id, b); }
  deleteGameplay(id: number) { return this.removeNumeric(this.prisma.gameplay, id); }
  // styles
  createStyle(b: Record<string, unknown>) { return this.createNumeric(this.prisma.style, "style", b, ["name", "prompt"]); }
  updateStyle(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.style, "style", id, b); }
  deleteStyle(id: number) { return this.removeNumeric(this.prisma.style, id); }
  // categories
  createCategory(b: Record<string, unknown>) { return this.createNumeric(this.prisma.category, "category", b, ["name"]); }
  updateCategory(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.category, "category", id, b); }
  deleteCategory(id: number) { return this.removeNumeric(this.prisma.category, id); }
  // hot searches
  createHotSearch(b: Record<string, unknown>) { return this.createNumeric(this.prisma.hotSearch, "hotSearch", b, ["keyword"]); }
  updateHotSearch(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.hotSearch, "hotSearch", id, b); }
  deleteHotSearch(id: number) { return this.removeNumeric(this.prisma.hotSearch, id); }
  // qualities
  createQuality(b: Record<string, unknown>) { return this.createNumeric(this.prisma.qualityConfig, "qualityConfig", b, ["label", "pixel"]); }
  updateQuality(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.qualityConfig, "qualityConfig", id, b); }
  deleteQuality(id: number) { return this.removeNumeric(this.prisma.qualityConfig, id); }
  // ratios
  createRatio(b: Record<string, unknown>) { return this.createNumeric(this.prisma.ratioConfig, "ratioConfig", b, ["label", "description"]); }
  updateRatio(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.ratioConfig, "ratioConfig", id, b); }
  deleteRatio(id: number) { return this.removeNumeric(this.prisma.ratioConfig, id); }
  // recharge tiers
  createRecharge(b: Record<string, unknown>) { return this.createNumeric(this.prisma.rechargeTier, "rechargeTier", b, ["price", "credits"]); }
  updateRecharge(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.rechargeTier, "rechargeTier", id, b); }
  deleteRecharge(id: number) { return this.removeNumeric(this.prisma.rechargeTier, id); }
  // member plans
  createMemberPlan(b: Record<string, unknown>) { return this.createNumeric(this.prisma.memberPlan, "memberPlan", b, ["name", "price", "rights"]); }
  updateMemberPlan(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.memberPlan, "memberPlan", id, b); }
  deleteMemberPlan(id: number) { return this.removeNumeric(this.prisma.memberPlan, id); }
  // versions
  createVersion(b: Record<string, unknown>) { return this.createNumeric(this.prisma.appVersion, "appVersion", b, ["version", "releasedAt", "items"]); }
  updateVersion(id: number, b: Record<string, unknown>) { return this.updateNumeric(this.prisma.appVersion, "appVersion", id, b); }
  deleteVersion(id: number) { return this.removeNumeric(this.prisma.appVersion, id); }

  // ---------- 模型（字符串主键，需前端给 id）----------
  async createModel(b: Record<string, unknown>) {
    requireFields(b, ["id", "providerModel", "name", "description"]);
    const data = pick(b, FIELDS.modelConfig);
    data.providerRouting = normalizeProviderRouting(data.providerRouting);
    await this.assertModelProviderRouting(String(data.id), String(data.provider ?? ""), data.providerRouting, Boolean(data.enabled ?? true));
    return this.prisma.modelConfig.create({ data: data as never });
  }
  async updateModel(id: string, b: Record<string, unknown>) {
    const current = await this.prisma.modelConfig.findUnique({ where: { id } });
    if (!current) throw new BadRequestException("创作模型不存在");
    const data = pick(b, FIELDS.modelConfig);
    delete data.id;
    if (data.providerRouting !== undefined) data.providerRouting = normalizeProviderRouting(data.providerRouting);
    await this.assertModelProviderRouting(
      id,
      String(data.provider ?? current.provider),
      data.providerRouting ?? current.providerRouting,
      Boolean(data.enabled ?? current.enabled)
    );
    return this.prisma.modelConfig.update({ where: { id }, data });
  }
  deleteModel(id: string) {
    return this.prisma.modelConfig.delete({ where: { id } });
  }

  private async assertModelProviderRouting(_modelId: string, defaultProvider: string, routingValue: unknown, modelEnabled: boolean) {
    const routing = normalizeProviderRouting(routingValue);
    const providerIds = [...new Set([defaultProvider, ...Object.values(routing).flat()])].filter(Boolean);
    const providers = await this.prisma.generationProvider.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, enabled: true }
    });
    if (providers.length !== providerIds.length) throw new BadRequestException("分辨率路由包含不存在的 API 平台");
    if (modelEnabled && !providers.some((provider) => provider.enabled)) {
      throw new BadRequestException("已上线模型至少需要一个已启用的 API 平台");
    }
  }

  // ---------- 协议 / 键值设置 ----------
  upsertAgreement(type: string, b: Record<string, unknown>) {
    requireFields(b, ["title", "content"]);
    const data = { title: String(b.title), content: String(b.content) };
    return this.prisma.agreement.upsert({ where: { type }, update: data, create: { type, ...data } });
  }

  async putSettings(body: Record<string, unknown>) {
    const normalized = { ...body };
    if (body.reviewMode === "auto" || body.reviewMode === "manual") {
      normalized.manualReviewEnabled = body.reviewMode === "manual";
      normalized.autoPublishAfterPass = body.reviewMode === "auto";
    } else if (typeof body.manualReviewEnabled === "boolean") {
      normalized.reviewMode = body.manualReviewEnabled ? "manual" : "auto";
      normalized.autoPublishAfterPass = !body.manualReviewEnabled;
    }
    const entries = Object.entries(normalized);
    for (const [key, value] of entries) {
      const v = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      await this.prisma.appSetting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
    }
    return this.settings();
  }

  async putReviewSettings(body: Record<string, unknown>) {
    const keys = ["wxTextSecCheckEnabled", "wxImageSecCheckEnabled", "manualReviewEnabled", "autoPublishAfterPass"];
    const normalized = { ...body };
    if (body.manualReviewEnabled === false) normalized.autoPublishAfterPass = true;
    if (body.manualReviewEnabled === true) normalized.autoPublishAfterPass = false;
    for (const key of keys) {
      if (normalized[key] === undefined) continue;
      const v = normalized[key] ? "true" : "false";
      await this.prisma.appSetting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
    }
    if (typeof body.manualReviewEnabled === "boolean") {
      const value = body.manualReviewEnabled ? "manual" : "auto";
      await this.prisma.appSetting.upsert({ where: { key: "reviewMode" }, update: { value }, create: { key: "reviewMode", value } });
    }
    return this.reviewSettings();
  }
}
