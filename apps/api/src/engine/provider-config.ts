import type { Prisma } from "@prisma/client";
import type { GenerationProvider } from "@prisma/client";
import { normalizeProviderResultUrlRewriteRules } from "../common/provider-result-url";
import { normalizeProviderJsonObject, normalizeProviderParams } from "../generate/provider-runtime";
import type {
  AdapterKind,
  ProviderConfig,
  ProviderErrorKind,
  ProviderResultMode
} from "./engine.types";

function pickString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickMapping(value: unknown): Record<string, string> {
  return normalizeProviderParams(value);
}

function pickParams(value: unknown): Record<string, string> {
  return normalizeProviderParams(value);
}

function pickTemplate(value: unknown): Record<string, unknown> {
  return normalizeProviderJsonObject(value);
}

/**
 * 从 config JSON 读取供应商配置；缺失时回落到旧平面列（迁移前兼容），
 * 这样引擎上线瞬间无需强依赖数据回填的完成度。
 */
export function readProviderConfig(row: GenerationProvider): ProviderConfig {
  const raw = (row.config ?? undefined) as Prisma.JsonValue | undefined;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const value = raw as Record<string, unknown>;
    const legacyAdapter = ["openai-images", "gemini", "kie", "async-http"].includes(String(value.adapter))
      ? (String(value.adapter) as AdapterKind)
      : legacyAdapterKind(row.adapter);
    return {
      adapter: legacyAdapter,
      requestMode: value.requestMode === "sync" ? "sync" : "async",
      textResultMode: pickResultMode(value.textResultMode),
      imageResultMode: pickResultMode(value.imageResultMode),
      baseUrl: pickString(value.baseUrl, row.baseUrl),
      imageEndpoint: pickString(value.imageEndpoint, row.imageEndpoint),
      queryEndpoint: pickString(value.queryEndpoint, row.queryEndpoint),
      statusEnabled: pickBool(value.statusEnabled, row.statusEnabled),
      responseMapping: Object.keys(pickMapping(value.responseMapping)).length
        ? pickMapping(value.responseMapping)
        : pickMapping(row.responseMapping),
      resultUrlRewriteRules: normalizeProviderResultUrlRewriteRules(
        value.resultUrlRewriteRules ?? row.resultUrlRewriteRules
      ),
      textToImageEnabled: pickBool(value.textToImageEnabled, row.textToImageEnabled),
      imageToImageEnabled: pickBool(value.imageToImageEnabled, row.imageToImageEnabled),
      authMode: (["bearer", "raw", "query", "none"].includes(pickString(value.authMode, row.authMode))
        ? pickString(value.authMode, row.authMode)
        : "bearer") as ProviderConfig["authMode"],
      authHeaderName: pickString(value.authHeaderName, row.authHeaderName || "Authorization"),
      authQueryName: pickString(value.authQueryName, row.authQueryName || "api_key"),
      requestHeaders: Object.keys(pickParams(value.requestHeaders)).length
        ? pickParams(value.requestHeaders)
        : pickParams(row.requestHeaders),
      queryHeaders: Object.keys(pickParams(value.queryHeaders)).length
        ? pickParams(value.queryHeaders)
        : pickParams(row.queryHeaders),
      requestTemplate: pickTemplate(value.requestTemplate ?? row.requestTemplate),
      imageRequestTemplate: pickTemplate(value.imageRequestTemplate ?? row.imageRequestTemplate),
      injectModel: pickBool(value.injectModel, row.injectModel),
      injectCount: pickBool(value.injectCount, row.injectCount),
      requestParams: Object.keys(pickParams(value.requestParams)).length
        ? pickParams(value.requestParams)
        : pickParams(row.requestParams),
      imageRequestParams: Object.keys(pickParams(value.imageRequestParams)).length
        ? pickParams(value.imageRequestParams)
        : pickParams(row.imageRequestParams),
      imageInputMode: (["multipart", "url", "url-array"].includes(pickString(value.imageInputMode, row.imageInputMode))
        ? pickString(value.imageInputMode, row.imageInputMode)
        : "multipart") as ProviderConfig["imageInputMode"],
      imageInputField: pickString(value.imageInputField, row.imageInputField),
      sizeMode: pickString(value.sizeMode, row.sizeMode) === "ratio-resolution" ? "ratio-resolution" : "pixels",
      pixelSizeField: pickString(value.pixelSizeField, row.pixelSizeField || "size"),
      ratioField: pickString(value.ratioField, row.ratioField || "size"),
      resolutionField: pickString(value.resolutionField, row.resolutionField || "resolution")
    };
  }
  return legacyProviderConfig(row);
}

function pickResultMode(value: unknown): ProviderResultMode {
  return value === "url" || value === "base64" ? value : "auto";
}

function legacyAdapterKind(adapter: string): AdapterKind {
  if (adapter === "kie") return "kie";
  if (adapter === "change2pro") return "openai-images";
  return "async-http";
}

/** 迁移前兼容：直接从旧平面列拼出配置。 */
export function legacyProviderConfig(row: GenerationProvider): ProviderConfig {
  return {
    adapter: legacyAdapterKind(row.adapter),
    requestMode: row.requestMode === "sync" ? "sync" : "async",
    textResultMode: pickResultMode(row.textResultMode),
    imageResultMode: pickResultMode(row.imageResultMode),
    baseUrl: row.baseUrl,
    imageEndpoint: row.imageEndpoint,
    queryEndpoint: row.queryEndpoint,
    statusEnabled: row.statusEnabled,
    responseMapping: pickMapping(row.responseMapping),
    resultUrlRewriteRules: normalizeProviderResultUrlRewriteRules(row.resultUrlRewriteRules),
    textToImageEnabled: row.textToImageEnabled,
    imageToImageEnabled: row.imageToImageEnabled,
    authMode: (["bearer", "raw", "query", "none"].includes(row.authMode) ? row.authMode : "bearer") as ProviderConfig["authMode"],
    authHeaderName: row.authHeaderName || "Authorization",
    authQueryName: row.authQueryName || "api_key",
    requestHeaders: pickParams(row.requestHeaders),
    queryHeaders: pickParams(row.queryHeaders),
    requestTemplate: pickTemplate(row.requestTemplate),
    imageRequestTemplate: pickTemplate(row.imageRequestTemplate),
    injectModel: row.injectModel,
    injectCount: row.injectCount,
    requestParams: pickParams(row.requestParams),
    imageRequestParams: pickParams(row.imageRequestParams),
    imageInputMode: (["multipart", "url", "url-array"].includes(row.imageInputMode)
      ? row.imageInputMode
      : "multipart") as ProviderConfig["imageInputMode"],
    imageInputField: row.imageInputField,
    sizeMode: row.sizeMode === "ratio-resolution" ? "ratio-resolution" : "pixels",
    pixelSizeField: row.pixelSizeField || "size",
    ratioField: row.ratioField || "size",
    resolutionField: row.resolutionField || "resolution"
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
