import { api } from "../../services/api";
import {
  createEngineJob,
  engineJobToCompat,
  fetchEngineJobs,
  fetchEngineJob,
  publishEngineAsset,
  type CompatGenerateJob,
  type EngineCreateJobResponse,
  type EngineJobView
} from "../../services/engine/engineApi";
import {
  catalogStyleNameById,
  getEngineCatalog,
  resolveCatalogQualityId,
  resolveCatalogRatioId,
  resolveCatalogStyleId
} from "../../services/engine/engineCatalog";
import { toPublicModelName } from "../../services/modelDisplay";
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

// 页面层继续消费 /generate/jobs 时代的 BackendGenerateJob 形态；
// 数据源已切换到 /engine/*，兼容映射统一在 services/engine 内完成。
export type BackendGenerateResult = CompatGenerateJob["results"][number];
export type BackendGenerateJob = CompatGenerateJob;

interface CatalogModel {
  id: string;
  name: string;
  description: string;
  badge?: string;
  tags?: string[];
  costCredits: number;
}

interface CatalogStyle {
  id: number;
  name: string;
  prompt: string;
  imageUrl: string;
  uses: number;
}

interface CatalogGameplay {
  id: number;
  name: string;
  description: string;
  uses: string;
  imageUrl: string;
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

export interface CreateGenerateJobPayload {
  mode: "text-to-image" | "image-to-image";
  modelId: string;
  prompt: string;
  inputImageUrl?: string;
  inputImageUrls?: string[];
  gameplayId?: number;
  style?: string;
  ratio: string;
  quality: string;
  count: number;
  retryOfJobId?: string;
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

export interface GenerateJobPage {
  items: BackendGenerateJob[];
}

export interface PublishGenerateResultPayload {
  title: string;
  description?: string;
  isPublic?: boolean;
  isAnonymous?: boolean;
}

export interface PublishGenerateResultResponse {
  workId: number;
  status: string;
  isPublic: boolean;
}

function fallbackByIndex<T>(items: T[], index: number) {
  return items[index % items.length];
}

function formatUses(value: string, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function parseRatio(label: string, fallback: RatioOption): RatioOption {
  const [width, height] = label.split(":").map(Number);
  if (!width || !height) return fallback;
  return { label, width, height };
}

function toCreateConfig(catalog: {
  models: CatalogModel[];
  styles: CatalogStyle[];
  qualities: Array<{ id: number; label: string; multiplier: number }>;
  ratios: Array<{ id: number; label: string; description: string }>;
  gameplays: CatalogGameplay[];
}): CreateConfigView {
  return {
    models: catalog.models.map((item, index) => {
      const fallback = mockModels.find((model) => model.name === item.name) ?? fallbackByIndex(mockModels, index);
      return {
        id: item.id,
        name: toPublicModelName(item.name || fallback.name),
        description: item.description || fallback.description,
        tags: item.tags?.length ? item.tags : fallback.tags,
        cost: item.costCredits || fallback.cost,
        image: fallback.image,
        badge: item.badge || fallback.badge,
        badgeColor: fallback.badgeColor
      };
    }),
    styles: catalog.styles.map((item, index) => {
      const fallback = mockStyles.find((style) => style.name === item.name) ?? fallbackByIndex(mockStyles, index);
      return {
        name: item.name || fallback.name,
        image: item.imageUrl || fallback.image,
        prompt: item.prompt || fallback.prompt
      };
    }),
    qualities: catalog.qualities.map((item, index) => {
      const fallback = fallbackByIndex(mockQualities, index);
      return {
        label: item.label || fallback.label,
        description: fallback.description,
        icon: item.label.match(/\b(?:1K|2K|4K)\b/i)?.[0]?.toUpperCase() || fallback.icon,
        multiplier: Number(item.multiplier) || fallback.multiplier
      };
    }),
    ratios: catalog.ratios.map((item, index) => parseRatio(item.label, fallbackByIndex(mockRatios, index))),
    gameplays: catalog.gameplays.map((item, index) => {
      const fallback = mockGameplays.find((gameplay) => gameplay.name === item.name) ?? fallbackByIndex(mockGameplays, index);
      return {
        id: item.id,
        name: item.name || fallback.name,
        image: item.imageUrl || fallback.image,
        uses: formatUses(item.uses, fallback.uses),
        prompt: fallback.prompt
      };
    })
  };
}

export async function fetchCreateConfig(options?: { force?: boolean }): Promise<CreateConfigView> {
  if (!options?.force && cachedCreateConfig && Date.now() - cachedCreateConfigAt < CREATE_CONFIG_TTL) return cachedCreateConfig;
  if (!options?.force && pendingCreateConfig) return pendingCreateConfig;

  pendingCreateConfig = getEngineCatalog(options).then((catalog) => toCreateConfig(catalog));

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

async function toCompatJob(job: EngineJobView): Promise<BackendGenerateJob> {
  const catalog = await getEngineCatalog().catch(() => undefined);
  return engineJobToCompat(job, catalogStyleNameById(catalog, job.styleId));
}

export async function createGenerateJob(payload: CreateGenerateJobPayload): Promise<CreateGenerateJobResponse> {
  const catalog = await getEngineCatalog();
  const qualityId = resolveCatalogQualityId(catalog, payload.quality);
  const ratioId = resolveCatalogRatioId(catalog, payload.ratio);
  if (!qualityId || !ratioId) {
    throw new Error("创作配置未同步，请下拉刷新后重试");
  }
  const styleId = resolveCatalogStyleId(catalog, payload.style || "");
  const created: EngineCreateJobResponse = await createEngineJob({
    operation: payload.mode,
    modelId: payload.modelId,
    prompt: payload.prompt,
    qualityId,
    ratioId,
    styleId,
    gameplayId: payload.gameplayId,
    count: payload.count,
    inputImageUrls: payload.inputImageUrls?.length ? payload.inputImageUrls : undefined,
    retryOfJobId: payload.retryOfJobId
  });
  return {
    jobId: created.jobId,
    status: created.status === "settling" ? "finalizing" : created.status === "submitted" ? "running" : created.status,
    costCredits: created.job.costCredits,
    creditsAfter: created.creditsAfter,
    job: await toCompatJob(created.job)
  };
}

export async function fetchGenerateJob(jobId: string): Promise<BackendGenerateJob> {
  return toCompatJob(await fetchEngineJob(jobId));
}

export async function fetchActiveGenerateJobs(): Promise<BackendGenerateJob[]> {
  const result = await fetchEngineJobs(["queued", "submitted", "running", "settling"], 1, 10);
  return Promise.all(result.items.map((job) => toCompatJob(job)));
}

export function publishGenerateResult(resultId: string, payload: PublishGenerateResultPayload) {
  return publishEngineAsset(resultId, payload);
}
