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

async function fetchGenerateJobsByStatus(status: GenerateJobStatus, page: number, pageSize: number) {
  return api.get<PageResult<GenerateHistoryJob>>(`/generate/jobs?status=${status}&page=${page}&pageSize=${pageSize}`);
}

export async function fetchGenerateHistoryJobs(filter: GenerateHistoryFilter, page = 1, pageSize = 20) {
  if (filter === "all") {
    return api.get<PageResult<GenerateHistoryJob>>(`/generate/jobs?page=${page}&pageSize=${pageSize}`);
  }

  const pages = await Promise.all(FILTER_STATUS_MAP[filter].map((status) => fetchGenerateJobsByStatus(status, page, pageSize)));
  const items = sortByUpdatedAt(pages.flatMap((item) => item.items));
  return {
    items,
    page,
    pageSize,
    total: pages.reduce((sum, item) => sum + item.total, 0),
    hasMore: pages.some((item) => item.hasMore)
  };
}

export function retryGenerateJob(jobId: string) {
  return api.post<{ jobId: string; job: GenerateHistoryJob }>(`/generate/jobs/${jobId}/retry`);
}
