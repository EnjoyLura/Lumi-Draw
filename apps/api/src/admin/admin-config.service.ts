import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, type GenerationProvider } from "@prisma/client";
import { decryptProviderApiKey, encryptProviderApiKey, providerApiKeyHint } from "../generate/provider-secret";
import { normalizeProviderRouting } from "../generate/provider-routing";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";

type UploadedImage = { buffer: Buffer; originalname: string; mimetype: string; size: number };

const bySort = { orderBy: [{ sort: "asc" as const }, { id: "asc" as const }] };
const GENERATION_PROVIDER_ADAPTERS = new Set(["ainb", "change2pro", "kie"]);

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
  modelConfig: ["id", "provider", "providerRouting", "providerModel", "name", "description", "tags", "costCredits", "badge", "supportsTextToImage", "supportsImageToImage", "enabled", "sort"],
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
  async generationProviders() {
    const [providers, models, metrics] = await Promise.all([
      this.prisma.generationProvider.findMany(bySort),
      this.prisma.modelConfig.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }], select: { id: true, name: true, provider: true, providerRouting: true } }),
      this.generationProviderMetrics()
    ]);
    return providers.map((provider) => this.generationProviderView(
      provider,
      models.filter((model) => this.modelUsesProvider(model, provider.id)).map((model) => model.id),
      metrics.get(provider.id)
    ));
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
  async createModel(b: Record<string, unknown>) {
    requireFields(b, ["id", "providerModel", "name", "description"]);
    const data = pick(b, FIELDS.modelConfig);
    data.providerRouting = normalizeProviderRouting(data.providerRouting);
    await this.assertModelProviderRouting(String(data.id), String(data.provider || "kie"), data.providerRouting, Boolean(data.enabled ?? true));
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
    const providerIds = [...new Set([defaultProvider, ...Object.values(routing).flat()])];
    const providers = await this.prisma.generationProvider.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, enabled: true }
    });
    if (providers.length !== providerIds.length) throw new BadRequestException("分辨率路由包含不存在的 API 平台");
    if (modelEnabled && !providers.some((provider) => provider.enabled)) {
      throw new BadRequestException("已上线模型至少需要一个已启用的 API 平台");
    }
  }

  // ---------- 生图 API 平台 ----------
  async createGenerationProvider(body: Record<string, unknown>) {
    const data = this.normalizeGenerationProvider(body, true);
    const existing = await this.prisma.generationProvider.findUnique({ where: { id: data.provider.id }, select: { id: true } });
    if (existing) throw new ConflictException("平台标识已存在，请更换一个标识");
    try {
      await this.prisma.generationProvider.create({ data: data.provider as never });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("平台标识已存在，请更换一个标识");
      }
      throw error;
    }
    return this.generationProvider(data.provider.id);
  }

  async duplicateGenerationProvider(id: string, body: Record<string, unknown>) {
    const source = await this.prisma.generationProvider.findUnique({ where: { id } });
    if (!source) throw new BadRequestException("API 平台不存在");
    const copyApiKey = body.copyApiKey !== false;
    return this.createGenerationProvider({
      ...source,
      id: body.id,
      name: body.name,
      groupName: body.groupName === undefined ? source.groupName : body.groupName,
      apiKeyEncrypted: copyApiKey ? source.apiKeyEncrypted : "",
      apiKeyEnv: copyApiKey ? source.apiKeyEnv : "",
      enabled: Boolean(body.enabled),
      sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : source.sort + 1,
      modelIds: []
    });
  }

  async moveGenerationProvider(id: string, direction: string) {
    if (direction !== "up" && direction !== "down") throw new BadRequestException("排序方向无效");
    const current = await this.prisma.generationProvider.findUnique({ where: { id } });
    if (!current) throw new BadRequestException("API 平台不存在");
    const rows = await this.prisma.generationProvider.findMany({
      where: { groupName: current.groupName },
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    const index = rows.findIndex((provider) => provider.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) return this.generationProvider(id);
    [rows[index], rows[targetIndex]] = [rows[targetIndex], rows[index]];
    await this.prisma.$transaction(rows.map((provider, order) => (
      this.prisma.generationProvider.update({ where: { id: provider.id }, data: { sort: (order + 1) * 10 } })
    )));
    return this.generationProvider(id);
  }

  async updateGenerationProvider(id: string, body: Record<string, unknown>) {
    const current = await this.prisma.generationProvider.findUnique({ where: { id } });
    if (!current) throw new BadRequestException("API 平台不存在");
    const data = this.normalizeGenerationProvider({ ...current, ...body, id }, false);
    const { id: _id, ...providerData } = data.provider;
    await this.prisma.generationProvider.update({ where: { id }, data: providerData as never });
    return this.generationProvider(id);
  }

  async deleteGenerationProvider(id: string) {
    const activeModels = await this.countModelsUsingProvider(id);
    if (activeModels) throw new BadRequestException("请先把关联模型切换到其他 API 平台");
    return this.prisma.generationProvider.delete({ where: { id } });
  }

  private async countModelsUsingProvider(providerId: string, enabled?: boolean) {
    const models = await this.prisma.modelConfig.findMany({
      where: enabled === undefined ? undefined : { enabled },
      select: { provider: true, providerRouting: true }
    });
    return models.filter((model) => this.modelUsesProvider(model, providerId)).length;
  }

  private async generationProvider(id: string) {
    const provider = await this.prisma.generationProvider.findUniqueOrThrow({ where: { id } });
    const [models, metrics] = await Promise.all([
      this.prisma.modelConfig.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }], select: { id: true, provider: true, providerRouting: true } }),
      this.generationProviderMetrics()
    ]);
    return this.generationProviderView(
      provider,
      models.filter((model) => this.modelUsesProvider(model, id)).map((model) => model.id),
      metrics.get(id)
    );
  }

  private modelUsesProvider(model: { provider: string; providerRouting: unknown }, providerId: string) {
    return model.provider === providerId
      || Object.values(normalizeProviderRouting(model.providerRouting)).flat().includes(providerId);
  }

  private async generationProviderMetrics() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const jobs = await this.prisma.generateJob.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        provider: true,
        providerAttempts: true,
        status: true,
        errorMessage: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true
      }
    });
    type Metric = {
      attempts: number;
      successes: number;
      failures: number;
      durationTotalMs: number;
      durationSamples: number;
      lastUsedAt: string;
      lastError: string;
    };
    const metrics = new Map<string, Metric>();
    const append = (providerId: string, status: string, durationMs: number, usedAt: Date, error = "") => {
      if (!providerId || !["succeeded", "failed"].includes(status)) return;
      const current = metrics.get(providerId) || {
        attempts: 0,
        successes: 0,
        failures: 0,
        durationTotalMs: 0,
        durationSamples: 0,
        lastUsedAt: "",
        lastError: ""
      };
      current.attempts += 1;
      if (status === "succeeded") {
        current.successes += 1;
        if (durationMs > 0) {
          current.durationTotalMs += durationMs;
          current.durationSamples += 1;
        }
      } else {
        current.failures += 1;
        if (!current.lastError && error) current.lastError = error.slice(0, 160);
      }
      if (!current.lastUsedAt || usedAt.toISOString() > current.lastUsedAt) current.lastUsedAt = usedAt.toISOString();
      metrics.set(providerId, current);
    };

    for (const job of jobs) {
      const attempts = Array.isArray(job.providerAttempts) ? job.providerAttempts : [];
      if (attempts.length) {
        for (const raw of attempts) {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
          const attempt = raw as Record<string, unknown>;
          const startedAt = new Date(String(attempt.startedAt || job.createdAt.toISOString()));
          append(
            String(attempt.providerId || ""),
            String(attempt.status || ""),
            Math.max(0, Number(attempt.durationMs) || 0),
            Number.isNaN(startedAt.getTime()) ? job.createdAt : startedAt,
            String(attempt.error || "")
          );
        }
        continue;
      }
      if (!["succeeded", "partial_failed", "failed"].includes(job.status)) continue;
      const startedAt = job.startedAt || job.createdAt;
      const durationMs = job.finishedAt ? Math.max(0, job.finishedAt.getTime() - startedAt.getTime()) : 0;
      append(job.provider, job.status === "failed" ? "failed" : "succeeded", durationMs, startedAt, job.errorMessage);
    }

    return new Map([...metrics.entries()].map(([providerId, metric]) => [providerId, {
      windowDays: 30,
      attempts: metric.attempts,
      successes: metric.successes,
      failures: metric.failures,
      successRate: metric.attempts ? Math.round((metric.successes / metric.attempts) * 1000) / 10 : null,
      avgDurationMs: metric.durationSamples ? Math.round(metric.durationTotalMs / metric.durationSamples) : null,
      lastUsedAt: metric.lastUsedAt || null,
      lastError: metric.lastError
    }]));
  }

  private normalizeGenerationProvider(body: Record<string, unknown>, creating: boolean) {
    requireFields(body, ["id", "name", "adapter"]);
    const id = String(body.id).trim().toLowerCase();
    const groupName = String(body.groupName || "").trim();
    const adapter = String(body.adapter).trim();
    const requestMode = String(body.requestMode || (adapter === "change2pro" ? "sync" : "async")).trim();
    const textResultMode = String(body.textResultMode || body.resultMode || "auto").trim();
    const imageResultMode = String(body.imageResultMode || body.resultMode || "auto").trim();
    const baseUrl = String(body.baseUrl || "").trim();
    const imageEndpoint = String(body.imageEndpoint || "").trim();
    const queryEndpoint = String(body.queryEndpoint || "").trim();
    const statusEnabled = requestMode === "async" && Boolean(body.statusEnabled);
    const textToImageEnabled = body.textToImageEnabled === undefined ? true : Boolean(body.textToImageEnabled);
    const imageToImageEnabled = body.imageToImageEnabled === undefined ? false : Boolean(body.imageToImageEnabled);
    const imageInputMode = body.imageInputMode === "url-array" ? "url-array" : "multipart";
    const imageInputField = this.normalizeProviderImageFieldName(
      body.imageInputField,
      imageInputMode === "url-array" ? "image_urls" : adapter === "ainb" ? "image[]" : "image"
    );
    const enabled = body.enabled === undefined ? creating : Boolean(body.enabled);
    const apiKeyEnv = String(body.apiKeyEnv || `GENERATION_PROVIDER_${id.replace(/-/g, "_").toUpperCase()}_API_KEY`).trim();
    const sizeMode = body.sizeMode === "ratio-resolution" ? "ratio-resolution" : "pixels";
    const pixelSizeField = this.normalizeProviderFieldName(body.pixelSizeField, "size", "像素尺寸");
    const ratioField = this.normalizeProviderFieldName(body.ratioField, "size", "图片比例");
    const resolutionField = this.normalizeProviderFieldName(body.resolutionField, "resolution", "图片精度");
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(id)) throw new BadRequestException("平台标识只能使用小写字母、数字和短横线");
    if (groupName.length > 30) throw new BadRequestException("分组名称不能超过 30 个字符");
    if (!GENERATION_PROVIDER_ADAPTERS.has(adapter)) throw new BadRequestException("不支持的接口类型");
    if (!new Set(["sync", "async"]).has(requestMode)) throw new BadRequestException("调用方式只能是普通或异步");
    if (![textResultMode, imageResultMode].every((value) => new Set(["auto", "url", "base64"]).has(value))) {
      throw new BadRequestException("结果类型只能是自动、URL 或 Base64");
    }
    if (adapter === "kie" && [textResultMode, imageResultMode].includes("base64")) {
      throw new BadRequestException("KIE 任务协议目前只支持 URL 结果");
    }
    if ((adapter === "change2pro") !== (requestMode === "sync")) {
      throw new BadRequestException("请求协议与接口类型不匹配");
    }
    if (sizeMode === "ratio-resolution" && ratioField === resolutionField) {
      throw new BadRequestException("图片比例和图片精度不能使用相同字段名");
    }
    if (!textToImageEnabled && !imageToImageEnabled) throw new BadRequestException("请至少启用文生图或图生图能力");
    this.assertGenerationEndpoint(baseUrl, "文生图", textToImageEnabled);
    this.assertGenerationEndpoint(imageEndpoint, "图生图", imageToImageEnabled);
    this.assertQueryEndpoint(queryEndpoint, requestMode === "async");
    if (!/^[A-Z][A-Z0-9_]{2,79}$/.test(apiKeyEnv)) throw new BadRequestException("密钥变量名格式不正确");
    const rawApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (rawApiKey.length > 512) throw new BadRequestException("API Key 长度不能超过 512 个字符");
    const apiKeyEncrypted = body.clearApiKey === true
      ? ""
      : rawApiKey
        ? encryptProviderApiKey(rawApiKey, this.providerEncryptionKey())
        : String(body.apiKeyEncrypted || "");
    if (enabled && !apiKeyEncrypted && !process.env[apiKeyEnv]) throw new BadRequestException("启用 API 平台前请填写 API Key");
    const requestParams = this.normalizeGenerationParams(body.requestParams);
    const imageRequestParams = this.normalizeGenerationParams(body.imageRequestParams);
    const responseMapping = this.normalizeResponseMapping(body.responseMapping, adapter, requestMode);
    const modelIds = Array.isArray(body.modelIds) ? [...new Set(body.modelIds.map(String).filter(Boolean))] : [];
    return {
      provider: {
        id,
        name: String(body.name).trim(),
        groupName,
        adapter,
        requestMode,
        textResultMode,
        imageResultMode,
        baseUrl,
        imageEndpoint,
        queryEndpoint,
        statusEnabled,
        responseMapping,
        textToImageEnabled,
        imageToImageEnabled,
        apiKeyEnv,
        apiKeyEncrypted,
        requestParams,
        imageRequestParams,
        imageInputMode,
        imageInputField,
        sizeMode,
        pixelSizeField,
        ratioField,
        resolutionField,
        enabled,
        sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0
      },
      modelIds
    };
  }

  private normalizeGenerationParams(value: unknown) {
    const params = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const entries = Object.entries(params)
      .filter(([, item]) => item !== undefined && item !== null && String(item).trim())
      .map(([key, item]) => [key.trim(), String(item).trim()] as const);
    if (entries.length > 30) throw new BadRequestException("单个接口最多配置 30 个请求参数");
    for (const [key, item] of entries) {
      if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(key)) throw new BadRequestException(`请求参数名格式不正确: ${key}`);
      if (item.length > 500) throw new BadRequestException(`请求参数值过长: ${key}`);
    }
    return Object.fromEntries(entries);
  }

  private normalizeProviderFieldName(value: unknown, fallback: string, label: string) {
    const field = String(value || fallback).trim();
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(field)) {
      throw new BadRequestException(`${label}字段名格式不正确`);
    }
    return field;
  }

  private normalizeProviderImageFieldName(value: unknown, fallback: string) {
    const field = String(value || fallback).trim();
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,61}(?:\[\])?$/.test(field)) {
      throw new BadRequestException("参考图字段名格式不正确");
    }
    return field;
  }

  private assertGenerationEndpoint(endpoint: string, label: string, enabled: boolean) {
    if (!enabled) return;
    if (!endpoint) throw new BadRequestException(`请填写${label}完整接口 URL`);
    try {
      const url = new URL(endpoint);
      if (url.protocol !== "https:" || !url.pathname || url.pathname === "/") throw new Error();
    } catch {
      throw new BadRequestException(`${label}接口必须是包含完整路径的 HTTPS URL`);
    }
  }

  private assertQueryEndpoint(endpoint: string, enabled: boolean) {
    if (!enabled) return;
    this.assertGenerationEndpoint(endpoint, "查询任务结果", true);
    if (!endpoint.includes("{task_id}") && !endpoint.includes("{taskId}")) {
      throw new BadRequestException("查询任务结果 URL 必须包含 {task_id} 占位符");
    }
  }

  private normalizeResponseMapping(value: unknown, adapter: string, requestMode: string) {
    const supplied = this.normalizeGenerationParams(value);
    if (requestMode !== "async") return supplied;
    const defaults: Record<string, string> = adapter === "ainb" ? {
      taskIdPath: "task_id",
      statusPath: "data.status",
      progressPath: "data.progress",
      resultUrlPath: "data.data.data[].url",
      errorPath: "data.fail_reason",
      successValue: "SUCCESS",
      failureValue: "FAILURE",
      pendingValue: "IN_PROGRESS"
    } : {};
    const mapping = { ...defaults, ...supplied };
    if (adapter === "ainb" && (!mapping.taskIdPath || !mapping.statusPath || (!mapping.resultUrlPath && !mapping.resultBase64Path))) {
      throw new BadRequestException("异步接口必须配置任务 ID、状态和结果图片的数据路径");
    }
    return mapping;
  }

  private generationProviderView(
    provider: GenerationProvider,
    modelIds: string[],
    metrics?: {
      windowDays: number;
      attempts: number;
      successes: number;
      failures: number;
      successRate: number | null;
      avgDurationMs: number | null;
      lastUsedAt: string | null;
      lastError: string;
    }
  ) {
    const { apiKeyEncrypted, apiKeyEnv, ...safeProvider } = provider;
    const storedKey = apiKeyEncrypted ? decryptProviderApiKey(apiKeyEncrypted, this.providerEncryptionKey()) : "";
    const apiKey = storedKey || process.env[apiKeyEnv] || "";
    return {
      ...safeProvider,
      modelIds,
      metrics: metrics || {
        windowDays: 30,
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: null,
        avgDurationMs: null,
        lastUsedAt: null,
        lastError: ""
      },
      apiKeyConfigured: Boolean(apiKey),
      apiKeyHint: providerApiKeyHint(apiKey),
      apiKeySource: storedKey ? "admin" : apiKey ? "environment" : "none"
    };
  }

  private providerEncryptionKey() {
    return this.config.get<string>("app.generationProviderEncryptionKey") || "";
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
