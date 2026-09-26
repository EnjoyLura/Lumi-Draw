import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GenerationProvider } from "@prisma/client";
import { decryptProviderApiKey, encryptProviderApiKey, providerApiKeyHint } from "../common/provider-secret";
import { extractQualityTier, QUALITY_TIERS } from "../common/provider-routing";
import { isProviderDegraded } from "../engine/engine-failover";
import { PROVIDER_DEGRADE_FAILURE_THRESHOLD } from "../engine/engine.types";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import { adapterMetadata, findAdapterMetadata } from "../engine/adapters/adapter-metadata";
import { isAdapterKind, providerConfigDefaults, readProviderConfig } from "../engine/provider-config";
import { ENGINE_ACTIVE_STATUSES, type AdapterKind, type ProviderConfig } from "../engine/engine.types";
import { EngineService } from "../engine/engine.service";

/** config JSON 里允许由 admin 写入的键（与 ProviderConfig 一一对应，adapter 单独处理）。 */
const CONFIG_FIELDS = [
  "requestMode",
  "baseUrl", "imageEndpoint", "queryEndpoint", "statusEnabled",
  "responseMapping", "resultUrlRewriteRules",
  "textToImageEnabled", "imageToImageEnabled",
  "authMode", "authHeaderName", "authQueryName",
  "requestHeaders", "queryHeaders", "requestTemplate", "imageRequestTemplate",
  "injectModel", "injectCount", "requestParams", "imageRequestParams",
  "imageInputMode", "imageInputField",
  "sizeMode", "pixelSizeField", "ratioField", "resolutionField",
  "fetchRegion"
] as const;

/** 试运行任务挂在这个系统用户下，与真实用户数据完全隔离。 */
const DRY_RUN_USER_OPENID = "system:engine-dry-run";
const DRY_RUN_DEFAULT_PROMPT = "一只戴着宇航头盔的橘猫漂浮在星空里，电影质感，细节丰富";

@Injectable()
export class AdminEngineService {
  private readonly logger = new Logger(AdminEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly uploads: UploadsService,
    private readonly engine: EngineService
  ) {}

  async meta() {
    const qualities = await this.prisma.qualityConfig.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } });
    const tiers = QUALITY_TIERS.filter((tier) => qualities.some((quality) => extractQualityTier(quality.label) === tier));
    return {
      adapters: adapterMetadata(),
      requestModes: ["sync", "async"],
      authModes: ["bearer", "raw", "query", "none"],
      imageInputModes: ["multipart", "url", "url-array"],
      qualityTiers: tiers.length ? tiers : [...QUALITY_TIERS]
    };
  }

  async list() {
    const [providers, models, healths] = await Promise.all([
      this.prisma.generationProvider.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }] }),
      this.prisma.modelConfig.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }], select: { id: true, provider: true, providerRouting: true } }),
      this.providerHealth()
    ]);
    return providers.map((provider) => ({
      ...this.toView(provider),
      linkedModelIds: models
        .filter((model) => this.modelUsesProvider(model, provider.id))
        .map((model) => model.id),
      health: healths.get(provider.id)
    }));
  }

  async detail(id: string) {
    return this.toView(await this.findOrFail(id));
  }

  async create(body: Record<string, unknown>) {
    const id = String(body.id || "").trim();
    const name = String(body.name || "").trim();
    if (!/^[a-z0-9][a-z0-9-]{1,40}$/i.test(id)) throw new BadRequestException("平台标识只允许字母、数字和连字符，长度 2-41");
    if (!name) throw new BadRequestException("请填写平台名称");
    const existing = await this.prisma.generationProvider.findUnique({ where: { id }, select: { id: true } });
    if (existing) throw new ConflictException("平台标识已存在，请更换一个标识");
    const config = this.buildConfig(body);
    const data = this.toRowData(body, config);
    if (!data.apiKeyEnv && !data.apiKeyEncrypted && config.authMode !== "none") {
      throw new BadRequestException("请填写 API Key 或环境变量名");
    }
    await this.prisma.generationProvider.create({ data: { id, ...data } as never });
    return this.detail(id);
  }

  async update(id: string, body: Record<string, unknown>) {
    const current = await this.findOrFail(id);
    const config = this.buildConfig(body, current);
    const data: Record<string, unknown> = {
      // 局部更新：未携带的字段保持当前值。
      name: body.name === undefined ? current.name : String(body.name || "").trim() || current.name,
      groupName: body.groupName === undefined ? current.groupName : String(body.groupName || "").trim(),
      enabled: body.enabled === undefined ? current.enabled : Boolean(body.enabled),
      sort: body.sort === undefined || !Number.isFinite(Number(body.sort)) ? current.sort : Number(body.sort),
      config
    };
    const apiKey = body.apiKey === null || body.clearApiKey === true
      ? null
      : typeof body.apiKey === "string" && body.apiKey.trim()
        ? body.apiKey.trim()
        : undefined;
    if (apiKey === null) {
      data.apiKeyEncrypted = "";
      if (body.apiKeyEnv !== undefined) data.apiKeyEnv = String(body.apiKeyEnv || "").trim();
    } else if (apiKey) {
      data.apiKeyEncrypted = encryptProviderApiKey(apiKey, this.config.getOrThrow<string>("app.generationProviderEncryptionKey"));
      if (body.apiKeyEnv !== undefined) data.apiKeyEnv = String(body.apiKeyEnv || "").trim();
    } else if (body.apiKeyEnv !== undefined) {
      data.apiKeyEnv = String(body.apiKeyEnv || "").trim();
    }
    await this.prisma.generationProvider.update({ where: { id }, data: data as never });
    return this.detail(id);
  }

  async duplicate(id: string, body: Record<string, unknown>) {
    const source = await this.findOrFail(id);
    const newId = String(body.id || "").trim();
    const newName = String(body.name || "").trim();
    if (!newId || !newName) throw new BadRequestException("请填写新平台标识和名称");
    const existing = await this.prisma.generationProvider.findUnique({ where: { id: newId }, select: { id: true } });
    if (existing) throw new ConflictException("平台标识已存在，请更换一个标识");
    const copyApiKey = body.copyApiKey !== false;
    await this.prisma.generationProvider.create({
      data: {
        id: newId,
        name: newName,
        groupName: body.groupName === undefined ? source.groupName : String(body.groupName || ""),
        config: readProviderConfig(source) as unknown as object,
        apiKeyEnv: copyApiKey ? source.apiKeyEnv : "",
        apiKeyEncrypted: copyApiKey ? source.apiKeyEncrypted : "",
        enabled: Boolean(body.enabled),
        sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : source.sort + 1
      }
    });
    return this.detail(newId);
  }

  async move(id: string, direction: string) {
    if (direction !== "up" && direction !== "down") throw new BadRequestException("排序方向无效");
    const current = await this.findOrFail(id);
    const rows = await this.prisma.generationProvider.findMany({
      where: { groupName: current.groupName },
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    const index = rows.findIndex((provider) => provider.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) return this.detail(id);
    [rows[index], rows[targetIndex]] = [rows[targetIndex], rows[index]];
    await this.prisma.$transaction(rows.map((provider, order) => (
      this.prisma.generationProvider.update({ where: { id: provider.id }, data: { sort: (order + 1) * 10 } })
    )));
    return this.detail(id);
  }

  async remove(id: string) {
    await this.findOrFail(id);
    const models = await this.prisma.modelConfig.findMany({ select: { id: true, provider: true, providerRouting: true } });
    const linked = models.filter((model) => this.modelUsesProvider(model, id)).map((model) => model.id);
    if (linked.length) throw new BadRequestException(`请先把关联模型切换到其他 API 平台：${linked.join("、")}`);
    await this.prisma.generationProvider.delete({ where: { id } });
    return { ok: true };
  }

  /** 轻量连通性测试：不产生扣费请求，只验证网络可达与密钥有效。 */
  async test(id: string) {
    const provider = await this.findOrFail(id);
    const config = readProviderConfig(provider);
    const apiKey = this.resolveApiKey(provider);
    let probeUrl: URL;
    try {
      const base = new URL(config.baseUrl);
      const origin = base.origin;
      const path = config.adapter === "openai-images"
        ? "/models"
        : config.adapter === "gemini"
          ? "/v1beta/models"
          : base.pathname + base.search;
      probeUrl = new URL(path, origin);
    } catch {
      throw new BadRequestException("Base URL 无效");
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey && config.authMode === "bearer") headers.Authorization = `Bearer ${apiKey}`;
    else if (apiKey && config.authMode === "raw") headers[config.authHeaderName || "Authorization"] = apiKey;
    else if (apiKey && config.authMode === "query") probeUrl.searchParams.set(config.authQueryName || "api_key", apiKey);

    const startedAt = Date.now();
    let status = 0;
    let message = "";
    try {
      const response = await fetch(probeUrl, { headers, signal: AbortSignal.timeout(12_000) });
      status = response.status;
      if (status === 401 || status === 403) message = "网络可达，但密钥无效或无权限";
      else if (status === 404 || status === 405) message = "网络可达（探测路径未开放属于正常）";
      else if (status < 400) message = "连接正常";
      else message = `平台返回 HTTP ${status}`;
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      return { ok: false, reachable: false, status: 0, latencyMs: Date.now() - startedAt, message: `无法连接：${text}` };
    }
    return { ok: status < 400 || status === 404 || status === 405, reachable: true, status, latencyMs: Date.now() - startedAt, message };
  }

  // ---------------- 全链路试运行 ----------------

  /**
   * 用真实引擎链路（提交 → 上游 → FC 转存/直存 → OSS → CDN）验证平台配置。
   * 任务挂系统用户、0 积分、不建草稿作品、不计入健康度；复用引擎全部推进与失败分类。
   * 图生图模式自动取最近一次成功试运行产物作参考图（签名 URL，公开可达）。
   */
  async startDryRun(id: string, options?: { prompt?: string; mode?: "text-to-image" | "image-to-image" }) {
    const provider = await this.findOrFail(id);
    const config = readProviderConfig(provider);
    const mode: "text-to-image" | "image-to-image" = options?.mode === "image-to-image" ? "image-to-image" : "text-to-image";
    if (mode === "image-to-image") {
      if (!config.imageToImageEnabled) throw new BadRequestException("该平台未启用图生图，无法试运行");
      if (!config.imageEndpoint && !config.baseUrl) throw new BadRequestException("请先填写图生图接口 URL");
    } else if (!config.textToImageEnabled) {
      throw new BadRequestException("该平台未启用文生图，无法试运行");
    }
    if (!config.baseUrl) throw new BadRequestException("请先填写提交接口 URL");
    if (config.authMode !== "none" && !this.resolveApiKey(provider)) {
      throw new BadRequestException("请先配置 API Key 或环境变量密钥");
    }
    const active = await this.prisma.engineJob.findFirst({
      where: { dryRun: true, providerId: id, operation: mode, status: { in: [...ENGINE_ACTIVE_STATUSES] } },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });
    if (active) return { jobId: active.id, reused: true };

    const [userId, quality, ratio] = await Promise.all([
      this.ensureDryRunUser(),
      this.prisma.qualityConfig.findFirst({ where: { enabled: true }, orderBy: { sort: "asc" } }),
      this.prisma.ratioConfig.findFirst({ where: { enabled: true, label: "1:1" }, orderBy: { sort: "asc" } })
        .then((row) => row ?? this.prisma.ratioConfig.findFirst({ where: { enabled: true }, orderBy: { sort: "asc" } }))
    ]);
    if (!quality || !ratio) throw new BadRequestException("请先在「分辨率配置 / 尺寸比例」中配置至少一个可用档位");
    const referenceImageUrl = mode === "image-to-image" ? await this.dryRunReferenceImageUrl() : "";

    const job = await this.prisma.engineJob.create({
      data: {
        clientRequestId: `dry-run-${id}-${Date.now()}`,
        userId,
        operation: mode,
        modelId: "dry-run",
        modelRevision: BigInt(0),
        qualityId: quality.id,
        ratioId: ratio.id,
        ratio: ratio.label,
        quality: quality.label,
        prompt: options?.prompt?.trim() || DRY_RUN_DEFAULT_PROMPT,
        count: 1,
        inputImageUrls: referenceImageUrl ? [referenceImageUrl] : [],
        providerId: id,
        providerAttemptIndex: 0,
        providerCandidates: [id],
        providerSnapshot: {
          providerId: id,
          providerName: provider.name,
          adapterKind: config.adapter,
          requestMode: config.requestMode,
          providerModel: (mode === "image-to-image" ? config.imageRequestParams.model : config.requestParams.model) || "dry-run",
          config,
          apiKeyEncrypted: provider.apiKeyEncrypted,
          apiKeyEnv: provider.apiKeyEnv
        } as unknown as object,
        costCredits: 0,
        billingState: "settled",
        status: "queued",
        stageText: "试运行任务已创建",
        dryRun: true
      }
    });
    void this.engine.submitJob(job.id).catch((error) => {
      this.logger.error(`dry-run submit failed job=${job.id}: ${error instanceof Error ? error.message : String(error)}`);
    });
    return { jobId: job.id, reused: false };
  }

  /** 图生图试运行的参考图：最近一次成功试运行产物（私有 CDN 签名 URL）。 */
  private async dryRunReferenceImageUrl(): Promise<string> {
    const asset = await this.prisma.engineAsset.findFirst({
      where: { status: "stored", url: { not: "" }, job: { dryRun: true } },
      orderBy: { createdAt: "desc" },
      select: { url: true }
    });
    if (!asset?.url) throw new BadRequestException("暂无参考图：请先成功运行一次文生图试运行");
    return this.uploads.readUrl(asset.url, "private");
  }

  async dryRunStatus(jobId: string) {
    const job = await this.prisma.engineJob.findUnique({
      where: { id: jobId },
      include: { attempts: { orderBy: { index: "asc" } }, assets: { orderBy: { index: "asc" } } }
    });
    if (!job || !job.dryRun) throw new NotFoundException("试运行任务不存在");
    return {
      jobId: job.id,
      providerId: job.providerId,
      operation: job.operation,
      status: job.status,
      progress: job.progress,
      stageText: job.stageText,
      prompt: job.prompt,
      failure: job.failureCode ? { code: job.failureCode, message: job.failureMessage } : undefined,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      finishedAt: job.finishedAt?.toISOString(),
      attempts: job.attempts.map((attempt) => ({
        index: attempt.index,
        adapter: attempt.adapter,
        state: attempt.state,
        errorKind: attempt.errorKind || undefined,
        errorMessage: attempt.errorMessage || undefined,
        latencyMs: attempt.latencyMs ?? undefined,
        startedAt: attempt.startedAt.toISOString(),
        finishedAt: attempt.finishedAt?.toISOString()
      })),
      assets: job.assets.map((asset) => ({
        index: asset.index,
        status: asset.status,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        sizeBytes: asset.sizeBytes ?? undefined,
        transferHost: asset.transferHost || undefined,
        transferTtfbMs: asset.transferTtfbMs ?? undefined,
        transferDownloadMs: asset.transferDownloadMs ?? undefined,
        transferUploadMs: asset.transferUploadMs ?? undefined,
        errorMessage: asset.errorMessage || undefined,
        imageUrl: asset.status === "stored" && asset.url ? this.uploads.readUrl(asset.url, "private") : undefined,
        cardUrl: asset.status === "stored" && asset.url ? this.uploads.readResponsiveImageUrl(asset.url, "private") : undefined
      }))
    };
  }

  private async ensureDryRunUser(): Promise<number> {
    const existing = await this.prisma.user.findUnique({ where: { openId: DRY_RUN_USER_OPENID }, select: { id: true } });
    if (existing) return existing.id;
    try {
      const created = await this.prisma.user.create({
        data: { openId: DRY_RUN_USER_OPENID, nickname: "系统试运行", credits: 0, status: "normal" }
      });
      return created.id;
    } catch {
      const raced = await this.prisma.user.findUnique({ where: { openId: DRY_RUN_USER_OPENID }, select: { id: true } });
      if (!raced) throw new BadRequestException("试运行系统用户创建失败");
      return raced.id;
    }
  }

  /** 近 7 天各平台尝试成功率（EngineAttempt 是唯一事实来源；试运行不计入）。 */
  async health() {
    const healths = await this.providerHealth();
    const [activeJobs, imageTransfer] = await Promise.all([
      this.prisma.engineJob.count({ where: { status: { in: ["queued", "submitted", "running", "settling"] }, dryRun: false } }),
      Promise.resolve(this.config.get<{ functionUrl?: string; bearerToken?: string }>("app.imageTransfer"))
    ]);
    return {
      activeJobs,
      imageTransferConfigured: Boolean(imageTransfer?.functionUrl && imageTransfer?.bearerToken),
      callbackSecretConfigured: Boolean(this.config.get<string>("app.callbackSecret")),
      providers: [...healths.entries()].map(([providerId, health]) => ({ providerId, ...health }))
    };
  }

  private async providerHealth() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60_000);
    const attempts = await this.prisma.engineAttempt.groupBy({
      by: ["providerId", "state"],
      where: { startedAt: { gte: since }, job: { dryRun: false } },
      _count: { _all: true }
    });
    const map = new Map<string, { total: number; succeeded: number; failed: number; consecutiveFailures: number; degraded: boolean }>();
    for (const row of attempts) {
      const entry = map.get(row.providerId) ?? { total: 0, succeeded: 0, failed: 0, consecutiveFailures: 0, degraded: false };
      entry.total += row._count._all;
      if (row.state === "succeeded") entry.succeeded += row._count._all;
      if (row.state === "failed") entry.failed += row._count._all;
      map.set(row.providerId, entry);
    }
    // 与选路一致的自动降级判定，让后台能直接看到“这条线路现在不会被用”
    const now = new Date();
    for (const [providerId, entry] of map.entries()) {
      const recent = await this.prisma.engineAttempt.findMany({
        where: { providerId, state: { in: ["succeeded", "failed"] }, finishedAt: { not: null }, job: { dryRun: false } },
        orderBy: { finishedAt: "desc" },
        take: PROVIDER_DEGRADE_FAILURE_THRESHOLD,
        select: { state: true, finishedAt: true }
      });
      let streak = 0;
      while (streak < recent.length && recent[streak].state === "failed") streak += 1;
      entry.consecutiveFailures = streak;
      entry.degraded = isProviderDegraded(recent, now);
    }
    return map;
  }

  private async findOrFail(id: string) {
    const provider = await this.prisma.generationProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException("API 平台不存在");
    return provider;
  }

  private buildConfig(body: Record<string, unknown>, current?: GenerationProvider): ProviderConfig {
    const incoming = (body.config && typeof body.config === "object" && !Array.isArray(body.config)
      ? body.config
      : {}) as Record<string, unknown>;
    const currentConfig = current ? readProviderConfig(current) : undefined;
    const kindRaw = String(body.adapter ?? currentConfig?.adapter ?? "");
    if (body.adapter !== undefined && !isAdapterKind(kindRaw)) throw new BadRequestException(`未知适配器类型：${kindRaw}`);
    const kind: AdapterKind = isAdapterKind(kindRaw) ? kindRaw : "async-http";
    const meta = findAdapterMetadata(kind);
    if (!meta) throw new BadRequestException(`未知适配器类型：${kind}`);
    // 与旧行为一致：切换/保存协议时，协议默认值覆盖历史值，表单提交值最后覆盖。
    const base: Record<string, unknown> = { ...(currentConfig ?? providerConfigDefaults(kind)) as unknown as Record<string, unknown> };
    Object.assign(base, meta.defaults);
    for (const field of CONFIG_FIELDS) {
      if (incoming[field] !== undefined) base[field] = incoming[field];
    }
    base.adapter = kind;
    if (!base.baseUrl) throw new BadRequestException("请填写 Base URL");
    if (!["sync", "async"].includes(String(base.requestMode))) throw new BadRequestException("requestMode 无效");
    return readProviderConfig({ config: base as unknown as object });
  }

  /** 单轨写入：平面列已删除，只有身份、密钥与 config JSON 落库。 */
  private toRowData(body: Record<string, unknown>, config: ProviderConfig) {
    const data: Record<string, unknown> = {
      name: String(body.name || "").trim(),
      groupName: String(body.groupName ?? "").trim(),
      enabled: body.enabled === undefined ? true : Boolean(body.enabled),
      sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
      config: config as unknown as object,
      apiKeyEnv: String(body.apiKeyEnv ?? "").trim()
    };
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (apiKey) {
      data.apiKeyEncrypted = encryptProviderApiKey(apiKey, this.config.getOrThrow<string>("app.generationProviderEncryptionKey"));
    } else {
      data.apiKeyEncrypted = "";
    }
    return data;
  }

  private toView(provider: GenerationProvider) {
    const config = readProviderConfig(provider);
    return {
      id: provider.id,
      name: provider.name,
      groupName: provider.groupName,
      enabled: provider.enabled,
      sort: provider.sort,
      adapter: config.adapter,
      requestMode: config.requestMode,
      config,
      apiKeyHint: provider.apiKeyEncrypted ? providerApiKeyHint(decryptSafe(provider, this.config)) : "",
      apiKeyEnv: provider.apiKeyEnv,
      hasEncryptedKey: Boolean(provider.apiKeyEncrypted),
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString()
    };
  }

  private resolveApiKey(provider: GenerationProvider) {
    if (provider.apiKeyEncrypted) {
      return decryptProviderApiKey(provider.apiKeyEncrypted, this.config.getOrThrow<string>("app.generationProviderEncryptionKey"));
    }
    return process.env[provider.apiKeyEnv] || "";
  }

  private modelUsesProvider(model: { provider: string; providerRouting: unknown }, providerId: string) {
    const routing = model.providerRouting && typeof model.providerRouting === "object" ? model.providerRouting as Record<string, unknown> : {};
    return model.provider === providerId || Object.values(routing).flat().includes(providerId);
  }
}

function decryptSafe(provider: GenerationProvider, config: ConfigService) {
  try {
    return decryptProviderApiKey(provider.apiKeyEncrypted, config.getOrThrow<string>("app.generationProviderEncryptionKey"));
  } catch {
    return "";
  }
}
