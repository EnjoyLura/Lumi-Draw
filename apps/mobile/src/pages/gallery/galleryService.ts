import { api } from "../../services/api";
import type { HomeWork } from "../home/homeData";
import type { GalleryGenTask, GalleryUser } from "./galleryData";

interface BackendUser {
  id: number;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
  bio?: string | null;
  credits: number;
  memberPlan?: string | null;
  creatorTitle?: string;
  publishedWorksCount?: number;
  gender?: string | null;
  worksCount: number;
  likesCount?: number;
  followers: number;
  following?: number;
}

interface BackendWork {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  prompt?: string;
  ratio: string;
  status: string;
  isPublic: boolean;
  likes: number;
  favorites: number;
  remakes: number;
  description?: string | null;
  quality?: string | null;
  modelId?: string;
  modelName?: string;
  style?: string | null;
  tags?: string[];
  createdAt?: string;
}

interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface BackendGenerateJob {
  id: string;
  prompt: string;
  modelId: string;
  providerModel?: string;
  count: number;
  ratio: string;
  quality: string;
  status: "queued" | "running" | "finalizing" | "succeeded" | "partial_failed" | "failed" | "cancelled";
  progress: number;
  stageText: string;
  createdAt: string;
}

export interface GalleryTerminalGenerateJob {
  id: string;
  status: "succeeded" | "partial_failed" | "failed" | "cancelled";
}

export interface GalleryWorkPage {
  works: HomeWork[];
  page: number;
  hasMore: boolean;
}

export function toGalleryUser(user: BackendUser): GalleryUser {
  const fallbackName = `用户${user.id}`;
  const name = user.nickname || fallbackName;
  return {
    id: user.id,
    name,
    avatar: user.avatarText || name.slice(0, 1) || "U",
    color: user.avatarColor || "var(--accent)",
    points: `${user.credits}`,
    userNo: `LUMI${String(user.id).padStart(4, "0")}`,
    bio: user.bio || "这个用户还没有填写简介",
    role: user.creatorTitle || "画布新星",
    memberPlan: user.memberPlan || "",
    works: user.worksCount,
    followers: `${user.followers}`,
    following: `${user.following ?? 0}`,
    likes: `${user.likesCount ?? 0}`,
    worksCount: user.worksCount,
    likesCount: user.likesCount ?? 0,
    followersCount: user.followers,
    gender: user.gender === "male" || user.gender === "female" ? user.gender : "unknown"
  };
}

function toHomeWork(item: BackendWork): HomeWork {
  return {
    id: item.id,
    image: item.thumbnailUrl || item.imageUrl,
    userId: 0,
    title: item.title,
    prompt: item.prompt || item.title,
    ratio: item.ratio || "1:1",
    likes: item.likes,
    published: item.status === "published" && item.isPublic,
    status: item.status,
    modelName: item.modelName || item.modelId,
    createdAt: item.createdAt,
    description: item.description || "",
    quality: item.quality || "",
    modelId: item.modelId || "",
    styleName: item.style || "默认",
    tags: item.tags || [],
    favorites: item.favorites,
    remakes: item.remakes,
    isDetailPreloaded: true
  };
}

export async function fetchGalleryUser() {
  const user = await api.get<BackendUser>("/users/me");
  return toGalleryUser(user);
}

export async function fetchGalleryWorks(params: {
  status?: "published" | "draft";
  page: number;
  pageSize: number;
}): Promise<GalleryWorkPage> {
  const query = [`page=${params.page}`, `pageSize=${params.pageSize}`, params.status ? `status=${params.status}` : ""]
    .filter(Boolean)
    .join("&");
  const result = await api.get<PageResult<BackendWork>>(`/works/me/gallery?${query}`);
  return {
    works: result.items.map(toHomeWork),
    page: result.page,
    hasMore: result.hasMore
  };
}

export async function deleteGalleryWorks(ids: number[]) {
  await Promise.all(ids.map((id) => api.delete<unknown>(`/works/${id}?action=delete`)));
}

export async function moveGalleryWorksToDraft(ids: number[]) {
  await Promise.all(ids.map((id) => api.delete<unknown>(`/works/${id}?action=draft`)));
}

function elapsedSeconds(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 1000));
}

function toGalleryGenTask(job: BackendGenerateJob): GalleryGenTask {
  const stage = job.stageText === "Generation is processing" ? "AI 正在生成中" : job.stageText;
  return {
    id: job.id,
    prompt: job.prompt,
    model: job.modelId || job.providerModel || "AI",
    count: job.count,
    ratio: job.ratio,
    quality: job.quality,
    percent: Math.max(0, Math.min(job.progress || (job.status === "queued" ? 2 : 10), 99)),
    elapsed: elapsedSeconds(job.createdAt),
    stage: stage || (job.status === "queued" ? "排队中..." : job.status === "finalizing" ? "正在保存作品..." : "AI绘制中...")
  };
}

async function fetchGenerateJobsByStatuses(statuses: BackendGenerateJob["status"][]) {
  const statusQuery = encodeURIComponent(statuses.join(","));
  const result = await api.get<PageResult<BackendGenerateJob>>(`/generate/jobs?status=${statusQuery}&page=1&pageSize=20`);
  return result.items;
}

export async function fetchGalleryGenerateTasks() {
  const items = await fetchGenerateJobsByStatuses(["running", "queued", "finalizing"]);
  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toGalleryGenTask);
}

export async function fetchGalleryGenerateTask(id: string) {
  const job = await api.get<BackendGenerateJob>(`/generate/jobs/${encodeURIComponent(id)}`);
  return ["running", "queued", "finalizing"].includes(job.status) ? toGalleryGenTask(job) : undefined;
}

async function fetchTerminalGenerateJobsByStatuses(statuses: GalleryTerminalGenerateJob["status"][]) {
  const statusQuery = encodeURIComponent(statuses.join(","));
  const result = await api.get<PageResult<GalleryTerminalGenerateJob>>(`/generate/jobs?status=${statusQuery}&page=1&pageSize=20`);
  return result.items;
}

export async function fetchGalleryTerminalGenerateJobs() {
  return fetchTerminalGenerateJobsByStatuses(["succeeded", "partial_failed", "failed", "cancelled"]);
}
