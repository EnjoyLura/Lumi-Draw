import type { Prisma } from "@prisma/client";
import { normalizeProviderResultUrlRewriteRules } from "../common/provider-result-url";
import { normalizeProviderJsonObject, normalizeProviderParams } from "./provider-runtime";
import { ADAPTER_KINDS, findAdapterMetadata } from "./adapters/adapter-metadata";
import type {
  AdapterKind,
  ProviderConfig,
  ProviderErrorKind
} from "./engine.types";

/**
 * v3.1 单轨：GenerationProvider.config JSON 是协议配置的唯一权威。
 * 读取 = config JSON 与「全局默认值 + 适配器默认值」合并归一，不再存在平面列回退。
 */

function pickString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickMapping(value: unknown, fallback: Record<string, string> = {}): Record<string, string> {
  const normalized = normalizeProviderParams(value);
  return Object.keys(normalized).length ? normalized : fallback;
}

function pickTemplate(value: unknown): Record<string, unknown> {
  return normalizeProviderJsonObject(value);
}

/** 全局默认值（协议无关）；适配器默认值在其上覆盖。 */
const BASE_DEFAULTS = {
  requestMode: "async",
  imageEndpoint: "",
  queryEndpoint: "",
  statusEnabled: false,
  textToImageEnabled: true,
  imageToImageEnabled: false,
  authMode: "bearer",
  authHeaderName: "Authorization",
  authQueryName: "api_key",
  imageInputMode: "multipart",
  imageInputField: "",
  sizeMode: "pixels",
  pixelSizeField: "size",
  ratioField: "size",
  resolutionField: "resolution",
  injectModel: true,
  injectCount: true
} as const;

/** 指定协议族的完整默认配置（全局默认 + 适配器默认）。admin 新建平台与读取合并共用。 */
export function providerConfigDefaults(kind: AdapterKind): ProviderConfig {
  const meta = findAdapterMetadata(kind);
  return {
    adapter: kind,
    baseUrl: "",
    responseMapping: {},
    resultUrlRewriteRules: [],
    requestHeaders: {},
    queryHeaders: {},
    requestTemplate: {},
    imageRequestTemplate: {},
    requestParams: {},
    imageRequestParams: {},
    ...BASE_DEFAULTS,
    ...(meta?.defaults ?? {})
  } as ProviderConfig;
}

export function isAdapterKind(value: unknown): value is AdapterKind {
  return typeof value === "string" && (ADAPTER_KINDS as string[]).includes(value);
}

/** 从 config JSON 读取并归一化供应商配置；非法 adapter 收敛为 async-http。 */
export function readProviderConfig(row: { config: Prisma.JsonValue }): ProviderConfig {
  const raw = row.config;
  const value: Record<string, unknown> = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const adapter: AdapterKind = isAdapterKind(value.adapter) ? value.adapter : "async-http";
  const defaults = providerConfigDefaults(adapter);
  return {
    adapter,
    requestMode: value.requestMode === "sync" ? "sync" : "async",
    baseUrl: pickString(value.baseUrl, ""),
    imageEndpoint: pickString(value.imageEndpoint, defaults.imageEndpoint),
    queryEndpoint: pickString(value.queryEndpoint, defaults.queryEndpoint),
    statusEnabled: pickBool(value.statusEnabled, defaults.statusEnabled),
    responseMapping: pickMapping(value.responseMapping),
    resultUrlRewriteRules: normalizeProviderResultUrlRewriteRules(
      value.resultUrlRewriteRules ?? []
    ),
    textToImageEnabled: pickBool(value.textToImageEnabled, defaults.textToImageEnabled),
    imageToImageEnabled: pickBool(value.imageToImageEnabled, defaults.imageToImageEnabled),
    authMode: (["bearer", "raw", "query", "none"].includes(pickString(value.authMode, defaults.authMode))
      ? pickString(value.authMode, defaults.authMode)
      : "bearer") as ProviderConfig["authMode"],
    authHeaderName: pickString(value.authHeaderName, defaults.authHeaderName || "Authorization"),
    authQueryName: pickString(value.authQueryName, defaults.authQueryName || "api_key"),
    requestHeaders: pickMapping(value.requestHeaders),
    queryHeaders: pickMapping(value.queryHeaders),
    requestTemplate: pickTemplate(value.requestTemplate),
    imageRequestTemplate: pickTemplate(value.imageRequestTemplate),
    injectModel: pickBool(value.injectModel, defaults.injectModel),
    injectCount: pickBool(value.injectCount, defaults.injectCount),
    requestParams: pickMapping(value.requestParams),
    imageRequestParams: pickMapping(value.imageRequestParams),
    imageInputMode: (["multipart", "url", "url-array"].includes(pickString(value.imageInputMode, defaults.imageInputMode))
      ? pickString(value.imageInputMode, defaults.imageInputMode)
      : "multipart") as ProviderConfig["imageInputMode"],
    imageInputField: pickString(value.imageInputField, defaults.imageInputField),
    sizeMode: pickString(value.sizeMode, defaults.sizeMode) === "ratio-resolution" ? "ratio-resolution" : "pixels",
    pixelSizeField: pickString(value.pixelSizeField, defaults.pixelSizeField || "size"),
    ratioField: pickString(value.ratioField, defaults.ratioField || "size"),
    resolutionField: pickString(value.resolutionField, defaults.resolutionField || "resolution")
  };
}

const GEMINI_ENDPOINT_PATTERN = /(?:\/v1beta\/models\/|:generateContent(?:\?|$))/i;

/**
 * 解析实际协议：Gemini 系模型常挂在 OpenAI 兼容聚合平台上，
 * 以端点/模型名为准做协议嗅探（与 FC 执行器的分支规则一致）。
 */
export function resolveAdapterKind(config: ProviderConfig, endpoint: string, providerModel: string): AdapterKind {
  if (config.adapter === "openai-images" && (GEMINI_ENDPOINT_PATTERN.test(endpoint) || /^gemini/i.test(providerModel))) {
    return "gemini";
  }
  return config.adapter;
}

/** OpenAI Images 系图生图端点推导：/v1/images/generations → /v1/images/edits。 */
export function editEndpointFromGenerations(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/generations")) return `${trimmed.slice(0, -"/generations".length)}/edits`;
  return `${trimmed}/edits`;
}

/**
 * 平台是否承接某个操作。图生图允许只填文生图地址：单端点协议（Gemini）共用地址，
 * OpenAI 兼容协议按 /generations → /edits 推导，因此不必强制填写图生图端点。
 */
export function providerSupportsOperation(config: ProviderConfig, operation: "text-to-image" | "image-to-image"): boolean {
  if (!config.baseUrl) return false;
  return operation === "image-to-image" ? Boolean(config.imageToImageEnabled) : Boolean(config.textToImageEnabled);
}

/** 按操作解析生成端点：图生图优先 imageEndpoint，Gemini 单端点内替换 {model}。 */
export function resolveGenerationEndpoint(
  config: ProviderConfig,
  protocol: "openai-images" | "gemini",
  operation: "text-to-image" | "image-to-image",
  providerModel: string
): string {
  if (protocol === "gemini") {
    if (!config.baseUrl) return "";
    const base = config.baseUrl.replace(/\/$/, "");
    return base.includes("{model}")
      ? base.replace("{model}", encodeURIComponent(providerModel))
      : `${base}/models/${encodeURIComponent(providerModel)}:generateContent`;
  }
  if (operation === "image-to-image") {
    return config.imageEndpoint || (config.baseUrl ? editEndpointFromGenerations(config.baseUrl) : "");
  }
  return config.baseUrl;
}

/**
 * FC 生成执行器可承接的同步协议（执行器只实现了 OpenAI Images 与 Gemini 两族）。
 * 返回 null 表示该平台不能走 FC 生成，需要进程内适配器提交。
 */
export function resolveFcGeneration(
  config: ProviderConfig,
  operation: "text-to-image" | "image-to-image",
  providerModel: string
): { protocol: "openai-images" | "gemini"; endpoint: string } | null {
  const kind = resolveAdapterKind(config, config.baseUrl, providerModel);
  if (kind !== "openai-images" && kind !== "gemini") return null;
  const endpoint = resolveGenerationEndpoint(config, kind, operation, providerModel);
  if (!endpoint) return null;
  return { protocol: kind, endpoint };
}

/** 结构化错误 → 任务失败原因码（三端同源的错误码见 packages/shared）。 */
export const FAILURE_CODES: Record<string, number> = {
  policy: 41005,
  quota: 42003,
  capacity: 42001,
  rate_limit: 42001,
  auth: 42001,
  timeout: 42004,
  ambiguous: 42004,
  unknown: 42004,
  invalid_request: 42004,
  size: 42004,
  network: 42001,
  parse: 42004
};

export const FAILURE_USER_MESSAGES: Record<ProviderErrorKind, string> = {
  auth: "生成平台鉴权失败，请联系管理员",
  quota: "生成平台余额不足，请联系管理员",
  policy: "内容可能不安全，请修改提示词重试",
  invalid_request: "生成请求参数不受支持，请调整后重试",
  size: "当前模型不支持所选图片尺寸，请调整比例或清晰度后重试",
  rate_limit: "当前生成任务较多，请稍后重试",
  capacity: "当前生成通道繁忙，请稍后重试或切换其他模型",
  network: "生成平台连接异常，请稍后重试",
  timeout: "生成等待超时，请稍后重试",
  parse: "未获取到生成图片，请稍后重试",
  ambiguous: "生成结果未确认，积分已退还，请稍后重试",
  unknown: "生成失败，请稍后重试"
};
