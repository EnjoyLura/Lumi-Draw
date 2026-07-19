import { api } from "../../services/api";
import {
  createModels as mockModels,
  createStyles as mockStyles,
  gameplayTemplates as mockGameplays,
  qualityOptions as mockQualities,
  ratioOptions as mockRatios,
  type CreateModel,
  type CreateStyle,
  type GameplayTemplate,
  type QualityOption,
  type RatioOption
} from "./createData";

interface BackendModel {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  badge?: string | null;
  costCredits: number;
}

interface BackendStyle {
  id: number;
  name: string;
  imageUrl?: string;
}

interface BackendQuality {
  id: number;
  label: string;
  pixel: string;
  multiplier: number;
}

interface BackendRatio {
  id: number;
  label: string;
}

interface BackendGameplay {
  id: number;
  name: string;
  uses: string | number;
  imageUrl?: string;
}

interface BackendBootstrap {
  models: BackendModel[];
  styles: BackendStyle[];
  qualities: BackendQuality[];
  ratios: BackendRatio[];
  gameplays: BackendGameplay[];
}

export interface CreateConfigView {
  models: CreateModel[];
  styles: CreateStyle[];
  qualities: QualityOption[];
  ratios: RatioOption[];
  gameplays: GameplayTemplate[];
}

export interface CreateDraftWorkPayload {
  title: string;
  description?: string;
  prompt: string;
  imageUrl: string;
  ratio: string;
  quality: string;
  modelId: string;
  style: string;
}

export interface CreatedDraftWork {
  id: number;
}

export interface BackendGenerateResult {
  id: string;
  status: "transferring" | "succeeded" | "failed";
  imageUrl?: string;
  cardUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  errorMessage?: string;
  workId?: number;
}

export interface BackendGenerateJob {
  id: string;
  mode: "text-to-image" | "image-to-image";
  modelId: string;
  providerModel?: string;
  prompt: string;
  inputImageUrl?: string;
  gameplayId?: number;
  style?: string;
  ratio: string;
  quality: string;
  count: number;
  status: "queued" | "running" | "finalizing" | "succeeded" | "partial_failed" | "failed" | "cancelled";
  progress: number;
  stageText: string;
  costCredits: number;
  refundCredits: number;
  errorMessage?: string;
  results: BackendGenerateResult[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenerateJobPayload {
  mode: "text-to-image" | "image-to-image";
  modelId: string;
  prompt: string;
  inputImageUrl?: string;
  gameplayId?: number;
  style?: string;
  ratio: string;
  quality: string;
  count: number;
}

const CREATE_CONFIG_TTL = 5 * 60_000;
let cachedCreateConfig: CreateConfigView | undefined;
let cachedCreateConfigAt = 0;
let pendingCreateConfig: Promise<CreateConfigView> | undefined;

export interface CreateGenerateJobResponse {
  jobId: string;
  status: BackendGenerateJob["status"];
  costCredits: number;
  creditsAfter?: number;
  job: BackendGenerateJob;
}

interface GenerateJobPage {
  items: BackendGenerateJob[];
}

export interface PublishGenerateResultPayload {
  title: string;
  description?: string;
  isPublic?: boolean;
}

export interface PublishGenerateResultResponse {
  workId: number;
  status: string;
  isPublic: boolean;
}

function fallbackByIndex<T>(items: T[], index: number) {
  return items[index % items.length];
}

function formatUses(value: string | number, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}w`;
  return `${value}`;
}

function parseRatio(label: string, fallback: RatioOption): RatioOption {
  const [width, height] = label.split(":").map(Number);
  if (!width || !height) return fallback;
  return { label, width, height };
}

export async function fetchCreateConfig(): Promise<CreateConfigView> {
  if (cachedCreateConfig && Date.now() - cachedCreateConfigAt < CREATE_CONFIG_TTL) return cachedCreateConfig;
  if (pendingCreateConfig) return pendingCreateConfig;

  pendingCreateConfig = api.get<BackendBootstrap>("/app/bootstrap", { skipAuth: true }).then((data) => ({
    models: data.models.map((item, index) => {
      const fallback = mockModels.find((model) => model.name === item.name) ?? fallbackByIndex(mockModels, index);
      return {
        id: item.id,
        name: item.name || fallback.name,
        description: item.description || fallback.description,
        tags: item.tags?.length ? item.tags : fallback.tags,
        cost: item.costCredits || fallback.cost,
        image: fallback.image,
        badge: item.badge || fallback.badge,
        badgeColor: fallback.badgeColor
      };
    }),
    styles: data.styles.map((item, index) => {
      const fallback = mockStyles.find((style) => style.name === item.name) ?? fallbackByIndex(mockStyles, index);
      return {
        name: item.name || fallback.name,
        image: item.imageUrl || fallback.image
      };
    }),
    qualities: data.qualities.map((item, index) => {
      const fallback = fallbackByIndex(mockQualities, index);
      return {
        label: item.label || fallback.label,
        description: item.pixel || fallback.description,
        icon: item.label.match(/\b(?:1K|2K|4K)\b/i)?.[0]?.toUpperCase() || fallback.icon,
        multiplier: Number(item.multiplier) || fallback.multiplier
      };
    }),
    ratios: data.ratios.map((item, index) => parseRatio(item.label, fallbackByIndex(mockRatios, index))),
    gameplays: data.gameplays.map((item, index) => {
      const fallback = mockGameplays.find((gameplay) => gameplay.name === item.name) ?? fallbackByIndex(mockGameplays, index);
      return {
        name: item.name || fallback.name,
        image: item.imageUrl || fallback.image,
        uses: formatUses(item.uses, fallback.uses)
      };
    })
  }));

  try {
    cachedCreateConfig = await pendingCreateConfig;
    cachedCreateConfigAt = Date.now();
    return cachedCreateConfig;
  } finally {
    pendingCreateConfig = undefined;
  }
}

export function createDraftWork(payload: CreateDraftWorkPayload) {
  return api.post<CreatedDraftWork>("/works", {
    ...payload,
    isPublic: false
  });
}

export function createGenerateJob(payload: CreateGenerateJobPayload) {
  return api.post<CreateGenerateJobResponse>("/generate/jobs", payload);
}

export function fetchGenerateJob(jobId: string) {
  return api.get<BackendGenerateJob>(`/generate/jobs/${jobId}`);
}

export async function fetchActiveGenerateJob() {
  const result = await api.get<GenerateJobPage>("/generate/jobs?status=queued,running,finalizing&page=1&pageSize=1");
  return result.items[0];
}

export function publishGenerateResult(resultId: string, payload: PublishGenerateResultPayload) {
  return api.post<PublishGenerateResultResponse>(`/generate/results/${resultId}/publish`, payload);
}
