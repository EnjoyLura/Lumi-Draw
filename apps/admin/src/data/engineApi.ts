// 生图引擎 v3 管理端 API：/admin/engine/*（平台 CRUD / 元数据 / 连通性测试 / 健康统计）。
import { http } from "./http";

export type EngineAdapterKind = "openai-images" | "gemini" | "async-http";

export interface EngineAdapterMeta {
  kind: EngineAdapterKind;
  label: string;
  requestMode: "sync" | "async";
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  defaults: Record<string, unknown>;
}

export interface EngineProviderConfig {
  adapter: EngineAdapterKind;
  requestMode: "sync" | "async";
  baseUrl: string;
  imageEndpoint: string;
  queryEndpoint: string;
  statusEnabled: boolean;
  responseMapping: Record<string, string>;
  resultUrlRewriteRules: Array<{ sourceHost: string; targetHost: string }>;
  textToImageEnabled: boolean;
  imageToImageEnabled: boolean;
  authMode: "bearer" | "raw" | "query" | "none";
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

export interface EnginePlatform {
  id: string;
  name: string;
  groupName: string;
  enabled: boolean;
  sort: number;
  adapter: EngineAdapterKind;
  requestMode: "sync" | "async";
  config: EngineProviderConfig;
  apiKeyHint: string;
  apiKeyEnv: string;
  hasEncryptedKey: boolean;
  linkedModelIds?: string[];
  health?: { total: number; succeeded: number; failed: number };
  createdAt: string;
  updatedAt: string;
}

export interface EnginePlatformMeta {
  adapters: EngineAdapterMeta[];
  requestModes: string[];
  authModes: string[];
  imageInputModes: string[];
  /** 精度档（1K/2K/4K），由后端 quality_configs 派生，前后端同源。 */
  qualityTiers: string[];
}

export interface EngineTestResult {
  ok: boolean;
  reachable: boolean;
  status: number;
  latencyMs: number;
  message: string;
}

export interface EngineHealth {
  activeJobs: number;
  /** FC 转存/生成函数是否已配置；false 时生产环境图片会走 API 服务器带宽。 */
  imageTransferConfigured: boolean;
  callbackSecretConfigured: boolean;
  providers: Array<{ providerId: string; total: number; succeeded: number; failed: number }>;
}

export interface EnginePlatformSaveBody {
  name: string;
  groupName?: string;
  enabled?: boolean;
  sort?: number;
  adapter: EngineAdapterKind;
  apiKey?: string;
  apiKeyEnv?: string;
  clearApiKey?: boolean;
  config: Record<string, unknown>;
}

export function fetchEngineMeta() {
  return http.get<EnginePlatformMeta>("/admin/engine/meta");
}

export function fetchEnginePlatforms() {
  return http.get<EnginePlatform[]>("/admin/engine/platforms");
}

export function createEnginePlatform(body: { id: string } & EnginePlatformSaveBody) {
  return http.post<EnginePlatform>("/admin/engine/platforms", body);
}

export function updateEnginePlatform(id: string, body: EnginePlatformSaveBody) {
  return http.patch<EnginePlatform>(`/admin/engine/platforms/${encodeURIComponent(id)}`, body);
}

export function deleteEnginePlatform(id: string) {
  return http.del<{ ok: boolean }>(`/admin/engine/platforms/${encodeURIComponent(id)}`);
}

export function duplicateEnginePlatform(id: string, body: { id: string; name: string; groupName?: string; copyApiKey?: boolean; enabled?: boolean; sort?: number }) {
  return http.post<EnginePlatform>(`/admin/engine/platforms/${encodeURIComponent(id)}/duplicate`, body);
}

export function moveEnginePlatform(id: string, direction: "up" | "down") {
  return http.patch<EnginePlatform>(`/admin/engine/platforms/${encodeURIComponent(id)}/order`, { direction });
}

export function testEnginePlatform(id: string) {
  return http.post<EngineTestResult>(`/admin/engine/platforms/${encodeURIComponent(id)}/test`);
}

export function fetchEngineHealth() {
  return http.get<EngineHealth>("/admin/engine/health");
}

// ---------------- 全链路试运行 ----------------

export type EngineDryRunStatus =
  | "queued" | "submitted" | "running" | "settling"
  | "succeeded" | "partial_failed" | "failed" | "cancelled";

export interface EngineDryRunAttempt {
  index: number;
  adapter: string;
  state: string; // pending | submitted | succeeded | failed
  errorKind?: string;
  errorMessage?: string;
  latencyMs?: number;
  startedAt: string;
  finishedAt?: string;
}

export interface EngineDryRunAsset {
  index: number;
  status: "pending" | "transferring" | "stored" | "failed";
  width?: number;
  height?: number;
  sizeBytes?: number;
  transferHost?: string;
  transferTtfbMs?: number;
  transferDownloadMs?: number;
  transferUploadMs?: number;
  errorMessage?: string;
  imageUrl?: string;
  cardUrl?: string;
}

export interface EngineDryRunView {
  jobId: string;
  providerId: string;
  operation: "text-to-image" | "image-to-image";
  status: EngineDryRunStatus;
  progress: number;
  stageText: string;
  prompt: string;
  failure?: { code: number; message: string };
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  attempts: EngineDryRunAttempt[];
  assets: EngineDryRunAsset[];
}

/** 发起全链路试运行：真实调用上游并走完 FC 转存/直存 → OSS → CDN。 */
export function startEngineDryRun(id: string, options?: { prompt?: string; mode?: "text-to-image" | "image-to-image" }) {
  const body: Record<string, string> = {};
  if (options?.prompt?.trim()) body.prompt = options.prompt.trim();
  if (options?.mode === "image-to-image") body.mode = "image-to-image";
  return http.post<{ jobId: string; reused: boolean }>(
    `/admin/engine/platforms/${encodeURIComponent(id)}/dry-run`,
    body
  );
}

export function fetchEngineDryRun(jobId: string) {
  return http.get<EngineDryRunView>(`/admin/engine/dry-runs/${encodeURIComponent(jobId)}`);
}

export function isDryRunTerminal(status: EngineDryRunStatus) {
  return ["succeeded", "partial_failed", "failed", "cancelled"].includes(status);
}
