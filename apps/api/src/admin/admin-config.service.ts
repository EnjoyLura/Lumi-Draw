import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";

type UploadedImage = { buffer: Buffer; originalname: string; mimetype: string; size: number };

const bySort = { orderBy: [{ sort: "asc" as const }, { id: "asc" as const }] };
const GENERATION_PROVIDER_ADAPTERS = new Set(["ainb", "change2pro", "kie"]);
const GENERATION_PARAM_KEYS = new Set(["quality", "input_fidelity", "output_format", "response_format", "moderation", "output_compression"]);

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
  gameplay: ["name", "description", "uses", "hot", "imageUrl", "enabled", "sort"],
  style: ["name", "prompt", "uses", "imageUrl", "enabled", "sort"],
  category: ["name", "count", "sort", "enabled"],
  hotSearch: ["keyword", "hot", "top", "enabled", "sort"],
  modelConfig: ["id", "provider", "providerModel", "name", "description", "tags", "costCredits", "badge", "supportsTextToImage", "supportsImageToImage", "enabled", "sort"],
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
    private readonly uploads: UploadsService
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
  async generationProviders() {
    const [providers, models] = await Promise.all([
      this.prisma.generationProvider.findMany(bySort),
      this.prisma.modelConfig.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }], select: { id: true, name: true, provider: true } })
    ]);
    return providers.map((provider) => ({
      ...provider,
      modelIds: models.filter((model) => model.provider === provider.id).map((model) => model.id),
      apiKeyConfigured: Boolean(process.env[provider.apiKeyEnv])
    }));
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
  createGameplay(b: Record<string, unknown>) { return this.createNumeric(this.prisma.gameplay, "gameplay", b, ["name", "description"]); }
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
  createModel(b: Record<string, unknown>) {
    requireFields(b, ["id", "providerModel", "name", "description"]);
    return this.prisma.modelConfig.create({ data: pick(b, FIELDS.modelConfig) as never });
  }
  updateModel(id: string, b: Record<string, unknown>) {
    const data = pick(b, FIELDS.modelConfig);
    delete data.id;
    return this.prisma.modelConfig.update({ where: { id }, data });
  }
  deleteModel(id: string) {
    return this.prisma.modelConfig.delete({ where: { id } });
  }

  // ---------- 生图 API 平台 ----------
  async createGenerationProvider(body: Record<string, unknown>) {
    const data = this.normalizeGenerationProvider(body, true);
    this.assertEnabledProviderBindings(data.provider.enabled, data.modelIds);
    await this.assertProviderModels(data.provider.adapter, data.modelIds);
    await this.prisma.$transaction(async (tx) => {
      await tx.generationProvider.create({ data: data.provider as never });
      if (data.modelIds.length) {
        await tx.modelConfig.updateMany({ where: { id: { in: data.modelIds } }, data: { provider: data.provider.id } });
      }
    });
    return this.generationProvider(data.provider.id);
  }

  async updateGenerationProvider(id: string, body: Record<string, unknown>) {
    const current = await this.prisma.generationProvider.findUnique({ where: { id } });
    if (!current) throw new BadRequestException("API 平台不存在");
    const data = this.normalizeGenerationProvider({ ...current, ...body, id }, false);
    this.assertEnabledProviderBindings(data.provider.enabled, data.modelIds);
    await this.assertProviderModels(data.provider.adapter, data.modelIds);
    if (!data.provider.enabled) {
      const activeModels = await this.prisma.modelConfig.count({ where: { provider: id, enabled: true } });
      if (activeModels) throw new BadRequestException("请先把生效模型切换到其他 API 平台");
    }
    await this.prisma.$transaction(async (tx) => {
      const { id: _id, ...providerData } = data.provider;
      await tx.generationProvider.update({ where: { id }, data: providerData as never });
      if (data.modelIds.length) {
        await tx.modelConfig.updateMany({ where: { id: { in: data.modelIds } }, data: { provider: id } });
      }
      if (id !== "kie") {
        await tx.modelConfig.updateMany({ where: { provider: id, id: { notIn: data.modelIds } }, data: { provider: "kie" } });
      }
    });
    return this.generationProvider(id);
  }

  async deleteGenerationProvider(id: string) {
    const activeModels = await this.prisma.modelConfig.count({ where: { provider: id } });
    if (activeModels) throw new BadRequestException("请先把关联模型切换到其他 API 平台");
    return this.prisma.generationProvider.delete({ where: { id } });
  }

  private async generationProvider(id: string) {
    const provider = await this.prisma.generationProvider.findUniqueOrThrow({ where: { id } });
    const models = await this.prisma.modelConfig.findMany({ where: { provider: id }, orderBy: [{ sort: "asc" }, { id: "asc" }], select: { id: true } });
    return { ...provider, modelIds: models.map((model) => model.id), apiKeyConfigured: Boolean(process.env[provider.apiKeyEnv]) };
  }

  private normalizeGenerationProvider(body: Record<string, unknown>, creating: boolean) {
    requireFields(body, ["id", "name", "adapter", "baseUrl", "apiKeyEnv"]);
    const id = String(body.id).trim().toLowerCase();
    const adapter = String(body.adapter).trim();
    const baseUrl = String(body.baseUrl).trim().replace(/\/+$/, "");
    const apiKeyEnv = String(body.apiKeyEnv).trim();
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(id)) throw new BadRequestException("平台标识只能使用小写字母、数字和短横线");
    if (!GENERATION_PROVIDER_ADAPTERS.has(adapter)) throw new BadRequestException("不支持的接口类型");
    try {
      const url = new URL(baseUrl);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      throw new BadRequestException("Base URL 必须是有效的 HTTPS 地址");
    }
    if (!/^[A-Z][A-Z0-9_]{2,79}$/.test(apiKeyEnv)) throw new BadRequestException("密钥变量名格式不正确");
    const rawParams = body.requestParams && typeof body.requestParams === "object" && !Array.isArray(body.requestParams)
      ? body.requestParams as Record<string, unknown>
      : {};
    const requestParams = Object.fromEntries(
      Object.entries(rawParams)
        .filter(([key, value]) => GENERATION_PARAM_KEYS.has(key) && value !== undefined && value !== null && String(value).trim())
        .map(([key, value]) => [key, String(value).trim()])
    );
    const modelIds = Array.isArray(body.modelIds) ? [...new Set(body.modelIds.map(String).filter(Boolean))] : [];
    return {
      provider: {
        id,
        name: String(body.name).trim(),
        adapter,
        baseUrl,
        apiKeyEnv,
        requestParams,
        enabled: body.enabled === undefined ? creating : Boolean(body.enabled),
        sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0
      },
      modelIds
    };
  }

  private async assertProviderModels(adapter: string, modelIds: string[]) {
    if (!modelIds.length) return;
    const models = await this.prisma.modelConfig.findMany({ where: { id: { in: modelIds } }, select: { id: true } });
    if (models.length !== modelIds.length) throw new BadRequestException("包含不存在的创作模型");
    if (adapter === "ainb" && modelIds.some((id) => id !== "gpt-image-2")) {
      throw new BadRequestException("Ainb 异步接口当前只支持 GPT Image 2");
    }
    if (adapter === "change2pro" && modelIds.some((id) => !["gpt-image-2", "nano-banana-2", "nano-banana-pro"].includes(id))) {
      throw new BadRequestException("OpenAI Images 兼容接口暂不支持所选模型");
    }
  }

  private assertEnabledProviderBindings(enabled: boolean, modelIds: string[]) {
    if (!enabled && modelIds.length) {
      throw new BadRequestException("停用平台不能绑定创作模型");
    }
  }

  // ---------- 协议 / 键值设置 ----------
  upsertAgreement(type: string, b: Record<string, unknown>) {
    requireFields(b, ["title", "content"]);
    const data = { title: String(b.title), content: String(b.content) };
    return this.prisma.agreement.upsert({ where: { type }, update: data, create: { type, ...data } });
  }

  async putSettings(body: Record<string, unknown>) {
    const entries = Object.entries(body);
    for (const [key, value] of entries) {
      const v = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      await this.prisma.appSetting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
    }
    return this.settings();
  }

  async putReviewSettings(body: Record<string, unknown>) {
    const keys = ["wxTextSecCheckEnabled", "wxImageSecCheckEnabled", "manualReviewEnabled", "autoPublishAfterPass"];
    for (const key of keys) {
      if (body[key] === undefined) continue;
      const v = body[key] ? "true" : "false";
      await this.prisma.appSetting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
    }
    return this.reviewSettings();
  }
}
