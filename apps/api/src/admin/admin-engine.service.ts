import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GenerationProvider } from "@prisma/client";
import { decryptProviderApiKey, encryptProviderApiKey, providerApiKeyHint } from "../common/provider-secret";
import { PrismaService } from "../prisma/prisma.service";
import { adapterMetadata } from "../engine/adapters";
import { readProviderConfig } from "../engine/provider-config";
import type { ProviderConfig } from "../engine/engine.types";

type AdapterMetaEntry = ReturnType<typeof adapterMetadata>[number];

/** 配置 JSON 是唯一权威；旧扁平列只作为过渡期镜像，由本服务同步维护。 */
const CONFIG_FIELDS = [
  "adapter", "requestMode", "textResultMode", "imageResultMode",
  "baseUrl", "imageEndpoint", "queryEndpoint", "statusEnabled",
  "responseMapping", "resultUrlRewriteRules",
  "textToImageEnabled", "imageToImageEnabled",
  "authMode", "authHeaderName", "authQueryName",
  "requestHeaders", "queryHeaders", "requestTemplate", "imageRequestTemplate",
  "injectModel", "injectCount", "requestParams", "imageRequestParams",
  "imageInputMode", "imageInputField",
  "sizeMode", "pixelSizeField", "ratioField", "resolutionField"
] as const;

const CONFIG_DEFAULTS: Record<string, unknown> = {
  requestMode: "async",
  textResultMode: "url",
  imageResultMode: "url",
  imageEndpoint: "",
  queryEndpoint: "",
  statusEnabled: false,
  responseMapping: {},
  resultUrlRewriteRules: [],
  textToImageEnabled: true,
  imageToImageEnabled: false,
  authMode: "bearer",
  authHeaderName: "Authorization",
  authQueryName: "api_key",
  requestHeaders: {},
  queryHeaders: {},
  requestTemplate: {},
  imageRequestTemplate: {},
  injectModel: true,
  injectCount: true,
  requestParams: {},
  imageRequestParams: {},
  imageInputMode: "multipart",
  imageInputField: "",
  sizeMode: "pixels",
  pixelSizeField: "size",
  ratioField: "size",
  resolutionField: "resolution"
};

function adapterDefaults(kind: string): Record<string, unknown> {
  const meta = adapterMetadata().find((item) => item.kind === kind) as AdapterMetaEntry | undefined;
  if (!meta) throw new BadRequestException(`未知适配器类型：${kind}`);
  return { ...meta.defaults };
}

@Injectable()
export class AdminEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  meta() {
    return {
      adapters: adapterMetadata(),
      resultModes: ["url", "base64", "auto"],
      requestModes: ["sync", "async"],
      authModes: ["bearer", "raw", "query", "none"],
      imageInputModes: ["multipart", "url", "url-array"]
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
    const data = this.toRowData(body, config, true);
    await this.prisma.generationProvider.create({ data: { id, name, ...data } as never });
    return this.detail(id);
  }

  async update(id: string, body: Record<string, unknown>) {
    const current = await this.findOrFail(id);
    const config = this.buildConfig(body, current);
    const data = this.toRowData(body, config, false);
    delete (data as Record<string, unknown>).id;
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
    const data: Record<string, unknown> = {
      name: newName,
      groupName: body.groupName === undefined ? source.groupName : String(body.groupName || ""),
      ...this.configRecord(source),
      apiKeyEnv: copyApiKey ? source.apiKeyEnv : "",
      apiKeyEncrypted: copyApiKey ? source.apiKeyEncrypted : "",
      enabled: Boolean(body.enabled),
      sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : source.sort + 1
    };
    await this.prisma.generationProvider.create({ data: { id: newId, ...data } as never });
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
          : config.adapter === "kie"
            ? "/api/v1/jobs/recordInfo"
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

  /** 近 7 天各平台尝试成功率（EngineAttempt 是唯一事实来源）。 */
  async health() {
    const healths = await this.providerHealth();
    const activeJobs = await this.prisma.engineJob.count({ where: { status: { in: ["queued", "submitted", "running", "settling"] } } });
    return { activeJobs, providers: [...healths.entries()].map(([providerId, health]) => ({ providerId, ...health })) };
  }

  private async providerHealth() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60_000);
    const attempts = await this.prisma.engineAttempt.groupBy({
      by: ["providerId", "state"],
      where: { startedAt: { gte: since } },
      _count: { _all: true }
    });
    const map = new Map<string, { total: number; succeeded: number; failed: number }>();
    for (const row of attempts) {
      const entry = map.get(row.providerId) ?? { total: 0, succeeded: 0, failed: 0 };
      entry.total += row._count._all;
      if (row.state === "succeeded") entry.succeeded += row._count._all;
      if (row.state === "failed") entry.failed += row._count._all;
      map.set(row.providerId, entry);
    }
    return map;
  }

  private async findOrFail(id: string) {
    const provider = await this.prisma.generationProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException("API 平台不存在");
    return provider;
  }

  private configRecord(provider: GenerationProvider): Record<string, unknown> {
    const config = readProviderConfig(provider);
    const record: Record<string, unknown> = {};
    for (const field of CONFIG_FIELDS) record[field] = (config as unknown as Record<string, unknown>)[field];
    return record;
  }

  private buildConfig(body: Record<string, unknown>, current?: GenerationProvider): ProviderConfig {
    const base: Record<string, unknown> = current
      ? this.configRecord(current)
      : { ...CONFIG_DEFAULTS };
    const kind = String(body.adapter ?? current?.adapter ?? base.adapter ?? "");
    Object.assign(base, adapterDefaults(kind));
    const incoming = (body.config && typeof body.config === "object" && !Array.isArray(body.config)
      ? body.config
      : {}) as Record<string, unknown>;
    for (const field of CONFIG_FIELDS) {
      if (field === "adapter") continue;
      if (incoming[field] !== undefined) base[field] = incoming[field];
    }
    base.adapter = kind;
    if (!base.baseUrl) throw new BadRequestException("请填写 Base URL");
    if (!["sync", "async"].includes(String(base.requestMode))) throw new BadRequestException("requestMode 无效");
    if (!["url", "base64", "auto"].includes(String(base.textResultMode))) throw new BadRequestException("textResultMode 无效");
    if (!["url", "base64", "auto"].includes(String(base.imageResultMode))) throw new BadRequestException("imageResultMode 无效");
    return base as unknown as ProviderConfig;
  }

  private toRowData(body: Record<string, unknown>, config: ProviderConfig, isCreate: boolean) {
    const data: Record<string, unknown> = {
      name: String(body.name || "").trim(),
      groupName: String(body.groupName ?? "").trim(),
      enabled: body.enabled === undefined ? true : Boolean(body.enabled),
      sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0
    };
    for (const field of CONFIG_FIELDS) {
      data[field] = (config as unknown as Record<string, unknown>)[field];
    }
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const apiKeyEnv = String(body.apiKeyEnv ?? "").trim();
    if (apiKey) {
      data.apiKeyEncrypted = encryptProviderApiKey(apiKey, this.config.getOrThrow<string>("app.generationProviderEncryptionKey"));
      data.apiKeyEnv = apiKeyEnv;
    } else if (body.apiKey === null || body.clearApiKey === true) {
      data.apiKeyEncrypted = "";
      data.apiKeyEnv = apiKeyEnv;
    } else if (isCreate) {
      if (!apiKeyEnv) throw new BadRequestException("请填写 API Key 或环境变量名");
      data.apiKeyEnv = apiKeyEnv;
    } else {
      if (apiKeyEnv) data.apiKeyEnv = apiKeyEnv;
    }
    data.config = config;
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
