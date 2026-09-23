import { api } from "../../services/api";

/** /engine/catalog 服务端目录：客户端不再硬编码模型/分辨率/比例枚举。 */
export interface EngineCatalogQuality {
  id: number;
  label: string;
  multiplier: number;
}

export interface EngineCatalogRatio {
  id: number;
  label: string;
  description: string;
}

export interface EngineCatalog {
  schemaVersion: number;
  revision: string;
  models: Array<{
    id: string;
    name: string;
    description: string;
    badge: string;
    tags: string[];
    costCredits: number;
    supportsTextToImage: boolean;
    supportsImageToImage: boolean;
    maxOutputs: number;
    qualities: Array<EngineCatalogQuality & { costPerImage: number }>;
    ratios: EngineCatalogRatio[];
  }>;
  qualities: EngineCatalogQuality[];
  ratios: EngineCatalogRatio[];
  styles: Array<{ id: number; name: string; prompt: string; imageUrl: string; uses: number }>;
  gameplays: Array<{ id: number; name: string; description: string; uses: string; hot: boolean; imageUrl: string }>;
  limits: { maxOutputs: number; maxReferenceImages: number };
  reversePrompt: { enabled: boolean; costCredits: number };
}

export interface EngineAssetView {
  id: string;
  index: number;
  status: "pending" | "transferring" | "stored" | "failed";
  temporary: boolean;
  imageUrl?: string;
  cardUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  workId?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface EngineJobView {
  id: string;
  clientRequestId: string;
  operation: "text-to-image" | "image-to-image";
  modelId: string;
  prompt: string;
  inputImageUrls: string[];
  styleId?: number;
  gameplayId?: number;
  ratio: string;
  quality: string;
  count: number;
  status: "queued" | "submitted" | "running" | "settling" | "succeeded" | "partial_failed" | "failed" | "cancelled";
  progress: number;
  stage: string;
  costCredits: number;
  refundCredits: number;
  billing: string;
  failure?: { code: number; message: string };
  providerId: string;
  retryOfJobId?: string;
  assets: EngineAssetView[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface EngineCreateJobPayload {
  operation: "text-to-image" | "image-to-image";
  modelId: string;
  prompt: string;
  qualityId: number;
  ratioId: number;
  styleId?: number;
  gameplayId?: number;
  count: number;
  inputImageUrls?: string[];
  retryOfJobId?: string;
}

export interface EngineCreateJobResponse {
  jobId: string;
  clientRequestId: string;
  status: EngineJobView["status"];
  job: EngineJobView;
  creditsAfter?: number;
}

export function newClientRequestId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `eng-${Date.now().toString(36)}-${random}`;
}

export function fetchEngineCatalog(options?: { force?: boolean }) {
  return api.get<EngineCatalog>("/engine/catalog", { skipAuth: true, ...(options?.force ? {} : {}) });
}

export function createEngineJob(payload: EngineCreateJobPayload, clientRequestId = newClientRequestId()) {
  return api.post<EngineCreateJobResponse>("/engine/jobs", { ...payload, clientRequestId });
}

export function fetchEngineJob(jobId: string) {
  return api.get<EngineJobView>(`/engine/jobs/${encodeURIComponent(jobId)}`);
}

export function fetchEngineJobs(statuses: string[], page: number, pageSize: number) {
  const statusQuery = encodeURIComponent(statuses.join(","));
  return api.get<{ items: EngineJobView[]; page: number; pageSize: number; total: number; hasMore: boolean }>(`/engine/jobs?status=${statusQuery}&page=${page}&pageSize=${pageSize}`);
}

export function cancelEngineJob(jobId: string) {
  return api.post<EngineJobView & { creditsAfter?: number; refundCredits?: number }>(`/engine/jobs/${encodeURIComponent(jobId)}/cancel`, {});
}

export function retryEngineStorage(jobId: string) {
  return api.post<{ retried: number }>(`/engine/jobs/${encodeURIComponent(jobId)}/retry-storage`, {});
}

export function publishEngineAsset(assetId: string, payload: { title: string; description?: string; isPublic?: boolean; isAnonymous?: boolean }) {
  return api.post<{ workId: number; status: string; isPublic: boolean; isAnonymous: boolean }>(
    `/engine/assets/${encodeURIComponent(assetId)}/publish`,
    payload
  );
}

export function reversePromptEngine(payload: { imageUrl: string; hint?: string }) {
  return api.post<{ prompt: string; costCredits: number; creditsAfter: number; provider: string }>("/engine/reverse-prompt", payload);
}

// ---------------- 旧数据形态兼容映射 ----------------
// 页面层此前消费 /generate/jobs 的数据形态；engine 视图通过这里映射，
// 页面 UI 逻辑保持不变。settling→finalizing，submitted→running。

export type CompatJobStatus = "queued" | "running" | "finalizing" | "succeeded" | "partial_failed" | "failed" | "cancelled";

export interface CompatGenerateResult {
  id: string;
  status: "transferring" | "succeeded" | "failed";
  temporary?: boolean;
  imageUrl?: string;
  cardUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  errorMessage?: string;
  workId?: number;
  createdAt?: string;
}

export interface CompatGenerateJob {
  id: string;
  mode: "text-to-image" | "image-to-image";
  modelId: string;
  providerModel?: string;
  prompt: string;
  inputImageUrl?: string;
  inputImageUrls?: string[];
  gameplayId?: number;
  style?: string;
  ratio: string;
  quality: string;
  count: number;
  status: CompatJobStatus;
  progress: number;
  stageText: string;
  costCredits: number;
  refundCredits: number;
  errorMessage?: string;
  results: CompatGenerateResult[];
  createdAt: string;
  updatedAt: string;
}

export function mapEngineStatus(status: EngineJobView["status"]): CompatJobStatus {
  if (status === "settling") return "finalizing";
  if (status === "submitted") return "running";
  return status;
}

export function isEngineTerminalStatus(status: EngineJobView["status"]) {
  return ["succeeded", "partial_failed", "failed", "cancelled"].includes(status);
}

export function engineJobToCompat(job: EngineJobView, styleName = ""): CompatGenerateJob {
  return {
    id: job.id,
    mode: job.operation,
    modelId: job.modelId,
    prompt: job.prompt,
    inputImageUrls: job.inputImageUrls?.length ? job.inputImageUrls : undefined,
    gameplayId: job.gameplayId,
    style: styleName || undefined,
    ratio: job.ratio,
    quality: job.quality,
    count: job.count,
    status: mapEngineStatus(job.status),
    progress: job.progress,
    stageText: job.failure?.message ? `${job.stage}（${job.failure.message}）` : job.stage,
    costCredits: job.costCredits,
    refundCredits: job.refundCredits,
    errorMessage: job.failure?.message || (job.status === "failed" ? job.stage : undefined),
    results: job.assets.map((asset) => ({
      id: asset.id,
      status: asset.status === "transferring" ? "transferring" : asset.status === "stored" ? "succeeded" : "failed",
      temporary: asset.temporary || asset.status === "transferring",
      imageUrl: asset.imageUrl,
      cardUrl: asset.cardUrl,
      previewUrl: asset.previewUrl,
      originalUrl: asset.originalUrl,
      errorMessage: asset.errorMessage,
      workId: asset.workId,
      createdAt: asset.createdAt
    })),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}
