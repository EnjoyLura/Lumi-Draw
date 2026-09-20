import type { ProviderSizeConfig } from "../common/provider-size";
import type { ProviderResultUrlRewriteRule } from "../common/provider-result-url";

/** 协议适配器族。新平台一律用 async-http 的配置接入，只有新协议族才需要新适配器。 */
export type AdapterKind = "openai-images" | "gemini" | "async-http";

/** 引擎任务的内部状态机。 */
export const ENGINE_JOB_STATUSES = [
  "queued",
  "submitted",
  "running",
  "settling",
  "succeeded",
  "partial_failed",
  "failed",
  "cancelled"
] as const;
export type EngineJobStatus = (typeof ENGINE_JOB_STATUSES)[number];

export const ENGINE_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  "succeeded",
  "partial_failed",
  "failed",
  "cancelled"
]);
export const ENGINE_ACTIVE_STATUSES = ["queued", "submitted", "running", "settling"];

export type ProviderAuthMode = "bearer" | "raw" | "query" | "none";

/**
 * 供应商配置的单一来源（GenerationProvider.config JSON）。
 * 引擎与 admin 编辑器都只面向这个结构；旧平面列仅作为迁移前兼容读取。
 * 返回格式（url/base64）不在配置里：同步平台的响应由 FC 执行器按实际内容自动识别。
 */
export interface ProviderConfig {
  adapter: AdapterKind;
  requestMode: "sync" | "async";
  baseUrl: string;
  imageEndpoint: string;
  queryEndpoint: string;
  statusEnabled: boolean;
  responseMapping: Record<string, string>;
  resultUrlRewriteRules: ProviderResultUrlRewriteRule[];
  textToImageEnabled: boolean;
  imageToImageEnabled: boolean;
  authMode: ProviderAuthMode;
  authHeaderName: string;
  authQueryName: string;
  requestHeaders: Record<string, string>;
  queryHeaders: Record<string, string>;
  requestTemplate: Record<string, unknown>;
  imageRequestTemplate: Record<string, unknown>;
  injectModel: boolean;
  injectCount: boolean;
  requestParams: Record<string, string>;
  imageRequestParams: Record<string, string>;
  imageInputMode: "multipart" | "url" | "url-array";
  imageInputField: string;
  sizeMode: "pixels" | "ratio-resolution";
  pixelSizeField: string;
  ratioField: string;
  resolutionField: string;
}

/** 引擎传给适配器的规范化请求。 */
export interface NormalizedRequest {
  jobId: string;
  attemptId: string;
  operation: "text-to-image" | "image-to-image";
  providerModel: string;
  prompt: string;
  inputImageUrls: string[];
  ratio: string;
  quality: string;
  pixelSize: string;
  count: number;
  params: Record<string, string>;
}

/** 适配器产出：URL 走转存，buffer 内联上传 OSS。 */
export interface AdapterOutput {
  url?: string;
  buffer?: Buffer;
  contentType?: string;
}

/** 上游事件归一化形态：轮询与回调共用。 */
export interface ProviderEvent {
  state: "queued" | "running" | "succeeded" | "failed";
  imageUrls: string[];
  stageText: string;
  errorMessage: string;
  progress?: number;
}

/** 适配器提交结果：异步协议返回 taskId，同步协议直接返回 outputs。 */
export interface AdapterSubmitResult {
  taskId?: string;
  outputs?: AdapterOutput[];
}

/** 适配器运行上下文（凭证等敏感值只在内存传递，绝不入日志）。 */
export interface AdapterContext {
  config: ProviderConfig;
  apiKey: string;
  callbackUrl: string;
  /** 参考图允许下载的主机白名单（自有 OSS 桶 + CDN 域名）。 */
  allowedReferenceHosts: string[];
  signal?: AbortSignal;
}

export interface ProviderAdapter {
  readonly kind: AdapterKind;
  readonly requestMode: "sync" | "async";
  submit(ctx: AdapterContext, req: NormalizedRequest): Promise<AdapterSubmitResult>;
  poll?(ctx: AdapterContext, taskId: string): Promise<ProviderEvent>;
  /** 上游主动回调的事件解析；异步平台按自身 responseMapping 归一，不需要写代码。 */
  parseCallback?(payload: unknown, config: ProviderConfig): ProviderEvent;
}

/** 上游错误分类。引擎的整条重试/退款策略只认这个结构，不再解析错误文案。 */
export type ProviderErrorKind =
  | "auth"
  | "quota"
  | "policy"
  | "invalid_request"
  | "size"
  | "rate_limit"
  | "capacity"
  | "network"
  | "timeout"
  | "parse"
  | "ambiguous"
  | "unknown";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  /** 请求是否可能已被上游受理并计费（决定能否安全地原地重试）。 */
  readonly maybeBilled: boolean;

  constructor(kind: ProviderErrorKind, message: string, options?: { maybeBilled?: boolean }) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.maybeBilled = options?.maybeBilled ?? false;
  }
}

export function asProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new ProviderError("unknown", message);
}

/** 适配器工厂：注册表在 adapters/index.ts。 */
export type AdapterFactory = () => ProviderAdapter;

export const QUICK_FAILURE_WINDOW_MS = 15_000;
export const MAX_ATTEMPTS_PER_PROVIDER = 2;
export const SUBMIT_DEADLINE_MS = 2 * 60_000;
export const GENERATION_TOTAL_TIMEOUT_MS = 35 * 60_000;
export const RETRY_BACKOFF_MS = 800;
export const WATCHDOG_INTERVAL_MS = 20_000;
export const ASYNC_POLL_INTERVAL_MS = 20_000;
export const STARTUP_SUBMISSION_GRACE_MS = 2 * 60_000;
export const TRANSFER_RETRY_SCAN_INTERVAL_MS = 60_000;
export const TRANSFER_RETRY_BATCH_SIZE = 30;
export const TRANSFER_DISPATCH_LEASE_MS = 12 * 60_000;
