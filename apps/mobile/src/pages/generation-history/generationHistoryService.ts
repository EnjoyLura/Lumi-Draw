import { api } from "../../services/api";

export type GenerateJobStatus = "queued" | "running" | "succeeded" | "partial_failed" | "failed" | "cancelled";
export type GenerateHistoryFilter = "all" | "running" | "succeeded" | "failed";

export interface GenerateHistoryResult {
  id: string;
  status: "succeeded" | "failed";
  imageUrl?: string;
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

const FILTER_STATUS_MAP: Record<Exclude<GenerateHistoryFilter, "all">, GenerateJobStatus[]> = {
  running: ["running", "queued"],
  succeeded: ["succeeded", "partial_failed"],
  failed: ["failed", "cancelled"]
};

function sortByUpdatedAt(items: GenerateHistoryJob[]) {
  return [...items].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

async function fetchGenerateJobsByStatuses(statuses: GenerateJobStatus[], page: number, pageSize: number) {
  const statusQuery = encodeURIComponent(statuses.join(","));
  return api.get<PageResult<GenerateHistoryJob>>(`/generate/jobs?status=${statusQuery}&page=${page}&pageSize=${pageSize}`);
}

export async function fetchGenerateHistoryJobs(filter: GenerateHistoryFilter, page = 1, pageSize = 20) {
  if (filter === "all") {
    return api.get<PageResult<GenerateHistoryJob>>(`/generate/jobs?page=${page}&pageSize=${pageSize}`);
  }

  const result = await fetchGenerateJobsByStatuses(FILTER_STATUS_MAP[filter], page, pageSize);
  return { ...result, items: sortByUpdatedAt(result.items) };
}

export function retryGenerateJob(jobId: string) {
  return api.post<RetryGenerateJobResult>(`/generate/jobs/${jobId}/retry`);
}

export function cancelGenerateJob(jobId: string) {
  return api.post<CancelGenerateJobResult>(`/generate/jobs/${jobId}/cancel`);
}
