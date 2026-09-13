import {
  cancelEngineJob,
  createEngineJob,
  engineJobToCompat,
  fetchEngineJob,
  fetchEngineJobs
} from "../../services/engine/engineApi";
import {
  getEngineCatalog,
  resolveCatalogQualityId,
  resolveCatalogRatioId
} from "../../services/engine/engineCatalog";

export type GenerateJobStatus = "queued" | "running" | "succeeded" | "partial_failed" | "failed" | "cancelled";
export type GenerateHistoryFilter = "all" | "running" | "succeeded" | "failed";

export interface GenerateHistoryResult {
  id: string;
  status: "succeeded" | "failed";
  imageUrl?: string;
  cardUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  errorMessage?: string;
  workId?: number;
}

export interface GenerateHistoryJob {
  id: string;
  mode: "text-to-image" | "image-to-image";
  modelId: string;
  providerModel?: string;
  prompt: string;
  ratio: string;
  quality: string;
  count: number;
  costCredits: number;
  refundCredits: number;
  status: GenerateJobStatus;
  progress: number;
  stageText?: string;
  errorMessage?: string;
  results: GenerateHistoryResult[];
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}

export interface RetryGenerateJobResult {
  jobId: string;
  status: GenerateJobStatus;
  costCredits: number;
  creditsAfter?: number;
  job: GenerateHistoryJob;
}

export type CancelGenerateJobResult = GenerateHistoryJob & {
  creditsAfter?: number;
};

interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

const FILTER_STATUS_MAP: Record<Exclude<GenerateHistoryFilter, "all">, string[]> = {
  running: ["queued", "submitted", "running"],
  succeeded: ["succeeded", "partial_failed"],
  failed: ["failed", "cancelled"]
};

function toHistoryJob(compat: ReturnType<typeof engineJobToCompat>): GenerateHistoryJob {
  return {
    id: compat.id,
    mode: compat.mode,
    modelId: compat.modelId,
    prompt: compat.prompt,
    ratio: compat.ratio,
    quality: compat.quality,
    count: compat.count,
    costCredits: compat.costCredits,
    refundCredits: compat.refundCredits,
    status: compat.status === "finalizing" ? "running" : compat.status,
    progress: compat.progress,
    stageText: compat.stageText,
    errorMessage: compat.errorMessage,
    results: compat.results.map((result) => ({
      id: result.id,
      status: result.status === "succeeded" ? "succeeded" : "failed",
      imageUrl: result.imageUrl,
      cardUrl: result.cardUrl,
      previewUrl: result.previewUrl,
      originalUrl: result.originalUrl,
      errorMessage: result.errorMessage,
      workId: result.workId
    })),
    createdAt: compat.createdAt,
    updatedAt: compat.updatedAt
  };
}

function sortByUpdatedAt(items: GenerateHistoryJob[]) {
  return [...items].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

async function fetchGenerateJobsByStatuses(statuses: string[], page: number, pageSize: number): Promise<PageResult<GenerateHistoryJob>> {
  const result = await fetchEngineJobs(statuses, page, pageSize);
  return {
    ...result,
    items: result.items.map((job) => toHistoryJob(engineJobToCompat(job)))
  };
}

export async function fetchGenerateHistoryJobs(filter: GenerateHistoryFilter, page = 1, pageSize = 20): Promise<PageResult<GenerateHistoryJob>> {
  if (filter === "all") {
    return fetchGenerateJobsByStatuses(["queued", "submitted", "running", "settling", "succeeded", "partial_failed", "failed", "cancelled"], page, pageSize);
  }

  const result = await fetchGenerateJobsByStatuses(FILTER_STATUS_MAP[filter], page, pageSize);
  return { ...result, items: sortByUpdatedAt(result.items) };
}

/** 重新生成 = 以旧任务参数创建新引擎任务（retryOfJobId 保留溯源链）。 */
export async function retryGenerateJob(jobId: string): Promise<RetryGenerateJobResult> {
  const [source, catalog] = await Promise.all([fetchEngineJob(jobId), getEngineCatalog()]);
  const qualityId = resolveCatalogQualityId(catalog, source.quality);
  const ratioId = resolveCatalogRatioId(catalog, source.ratio);
  if (!qualityId || !ratioId) {
    throw new Error("创作配置未同步，请稍后重试");
  }
  const created = await createEngineJob({
    operation: source.operation,
    modelId: source.modelId,
    prompt: source.prompt,
    qualityId,
    ratioId,
    styleId: source.styleId,
    gameplayId: source.gameplayId,
    count: source.count,
    inputImageUrls: source.inputImageUrls?.length ? source.inputImageUrls : undefined,
    retryOfJobId: source.id
  });
  const compat = engineJobToCompat(created.job);
  return {
    jobId: created.jobId,
    status: compat.status === "finalizing" ? "running" : compat.status,
    costCredits: created.job.costCredits,
    creditsAfter: created.creditsAfter,
    job: toHistoryJob(compat)
  };
}

export async function cancelGenerateJob(jobId: string): Promise<CancelGenerateJobResult> {
  const cancelled = await cancelEngineJob(jobId);
  return {
    ...toHistoryJob(engineJobToCompat(cancelled)),
    creditsAfter: cancelled.creditsAfter
  };
}
