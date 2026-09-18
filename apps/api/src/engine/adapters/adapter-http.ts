import { ProviderError } from "../engine.types";

const NEVER_DELIVERED_PATTERN = /econnrefused|enotfound|eai_again|fetch failed/i;

export function classifyHttpStatus(status: number, message: string): ProviderError {
  const text = message.toLowerCase();
  if (status === 401 || status === 403) return new ProviderError("auth", message);
  if (status === 402 || /insufficient.*(balance|credit|fund)|余额不足|欠费/.test(text)) {
    return new ProviderError("quota", message);
  }
  if (status === 451 || /unsafe|safety|content.*(?:policy|filter)|不安全|违规|敏感/.test(text)) {
    return new ProviderError("policy", message);
  }
  if (/尺寸|size|pixel|最长边/.test(text)) return new ProviderError("size", message);
  if (status === 429 || /429|rate limit|too many requests|任务较多/.test(text)) {
    return new ProviderError("rate_limit", message);
  }
  if (/暂无可用产能|no available capacity|capacity unavailable|insufficient capacity/.test(text)) {
    return new ProviderError("capacity", message);
  }
  if (status === 408 || status === 504 || /timeout|超时/.test(text)) return new ProviderError("timeout", message);
  if (status === 400 || status === 404 || status === 413 || status === 422) {
    return new ProviderError("invalid_request", message);
  }
  return new ProviderError("unknown", message, { maybeBilled: status >= 500 });
}

function isNeverDelivered(error: unknown): boolean {
  return error instanceof Error && NEVER_DELIVERED_PATTERN.test(error.message);
}

/**
 * 上游错误文案归一化：
 * - 错误消息本身可能是序列化的 JSON 字符串（中转站套娃），解一层取 message/msg/error；
 * - 网关 502/504 常返回 HTML 错误页，转成人话；
 * - 统一截断，避免整页 HTML 进日志与 failureMessage。
 */
export function extractUpstreamErrorMessage(payload: Record<string, unknown> | null, status: number): string {
  const record = payload ?? {};
  const errorField = record.error;
  let message = "";
  if (typeof errorField === "string") message = errorField;
  else if (errorField && typeof errorField === "object") {
    const nested = errorField as Record<string, unknown>;
    message = String(nested.message ?? nested.msg ?? nested.error ?? "");
  }
  if (!message) message = String(record.message ?? record.msg ?? record.fail_reason ?? record.error ?? "");
  message = message.trim();
  if (message.startsWith("{") || message.startsWith("[")) {
    try {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      const inner = String(parsed?.message ?? parsed?.msg ?? parsed?.error ?? "").trim();
      if (inner) message = inner;
    } catch {
      // 非合法 JSON，保留原文。
    }
  }
  if (/^\s*<(!doctype|html)/i.test(message)) {
    return `上游网关返回了 HTML 错误页（HTTP ${status}）`;
  }
  if (!message) return `HTTP ${status}`;
  return message.slice(0, 300);
}

/**
 * 统一 JSON 请求层：所有适配器共用。
 * POST 提交的网络错误默认视为"可能已计费"，只有确定未送达（连接被拒/域名不存在）
 * 才标记为可安全重试。
 */
export async function requestJson(
  url: string,
  init: RequestInit,
  options: { billed?: boolean; timeoutMs?: number; label: string } = { label: "provider" }
): Promise<Record<string, unknown>> {
  const billed = options.billed ?? false;
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(options.timeoutMs ?? 60_000) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/timeout|aborted/i.test(message)) {
      throw new ProviderError("timeout", `${options.label}: ${message}`, { maybeBilled: billed });
    }
    throw new ProviderError("network", `${options.label}: ${message}`, { maybeBilled: billed && !isNeverDelivered(error) });
  }
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  if (text) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }
  if (!response.ok || !payload) {
    const message = payload
      ? extractUpstreamErrorMessage(payload, response.status)
      : /^\s*<(!doctype|html)/i.test(text)
        ? `上游网关返回了 HTML 错误页（HTTP ${response.status}）`
        : `HTTP ${response.status}${contentType ? ` ${contentType.split(";")[0]}` : ""}`;
    throw classifyHttpStatus(response.status, `${options.label}: ${message}`);
  }
  return payload;
}

const ALLOWED_REFERENCE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_REFERENCE_BYTES = 30 * 1024 * 1024;

/** 下载自有 OSS/CDN 上的参考图（multipart 模式需要二进制）。 */
export async function downloadReferenceImage(sourceUrl: string, allowedHosts: string[]) {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new ProviderError("invalid_request", "参考图地址无效");
  }
  if (url.protocol !== "https:" || !allowedHosts.map((host) => host.toLowerCase()).includes(url.hostname.toLowerCase())) {
    throw new ProviderError("invalid_request", "参考图地址无效");
  }
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  } catch (error) {
    throw new ProviderError("network", `参考图下载失败: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new ProviderError("invalid_request", `参考图下载失败（${response.status}）`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "";
  if (!ALLOWED_REFERENCE_TYPES.has(contentType)) {
    throw new ProviderError("invalid_request", "参考图格式仅支持 PNG、JPG 或 WEBP");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.byteLength > MAX_REFERENCE_BYTES) {
    throw new ProviderError("invalid_request", "参考图大小无效");
  }
  return { buffer, contentType };
}

export function extensionFor(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return "png";
}

export function authHeaders(
  apiKey: string,
  config: { authMode: string; authHeaderName: string; authQueryName: string; requestHeaders?: Record<string, string> },
  extraHeaders: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(config.requestHeaders ?? {}),
    ...extraHeaders
  };
  if (config.authMode === "bearer") headers[config.authHeaderName || "Authorization"] = `Bearer ${apiKey}`;
  else if (config.authMode === "raw") headers[config.authHeaderName || "Authorization"] = apiKey;
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      value.replace(/\{\{api_key\}\}/gi, apiKey)
    ])
  );
}

export function authenticatedUrl(url: string, apiKey: string, config: { authMode: string; authQueryName: string }): string {
  if (config.authMode !== "query") return url;
  const next = new URL(url);
  next.searchParams.set(config.authQueryName || "api_key", apiKey);
  return next.toString();
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

/** 渲染 {{token}} 模板；整串精确匹配时保留原始类型（数组/对象/数字）。 */
export function renderTemplate(input: unknown, tokens: Record<string, unknown>): unknown {
  if (typeof input === "string") {
    const exact = input.match(/^\{\{([a-z_]+)\}\}$/i)?.[1];
    if (exact && exact in tokens) return tokens[exact];
    return input.replace(/\{\{([a-z_]+)\}\}/gi, (_all, key: string) => {
      const value = tokens[key.toLowerCase()];
      return value === undefined || value === null ? "" : Array.isArray(value) ? JSON.stringify(value) : String(value);
    });
  }
  if (Array.isArray(input)) return input.map((item) => renderTemplate(item, tokens));
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, renderTemplate(value, tokens)])
    );
  }
  return input;
}

export function buildProviderSizeParams(
  ratio: string,
  quality: string,
  pixelSize: string,
  config: { sizeMode: string; pixelSizeField: string; ratioField: string; resolutionField: string }
): Record<string, string> {
  if (config.sizeMode === "ratio-resolution") {
    return {
      [config.ratioField]: ratio,
      [config.resolutionField]: quality.match(/\b(1K|2K|4K)\b/i)?.[1]?.toLowerCase() ?? "1k"
    };
  }
  return { [config.pixelSizeField]: pixelSize };
}

export function sizeParamKeys(config: { pixelSizeField: string; ratioField: string; resolutionField: string }): string[] {
  return [...new Set([config.pixelSizeField, config.ratioField, config.resolutionField])];
}
