import { api } from "../../services/api";
import type { HomeWork } from "../home/homeData";
import { galleryUser, type GalleryGenTask, type GalleryUser } from "./galleryData";

interface BackendUser {
  id: number;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
  bio?: string | null;
  credits: number;
  memberPlan?: string | null;
  worksCount: number;
  followers: number;
}

interface BackendWork {
  id: number;
  imageUrl: string;
  title: string;
  prompt?: string;
  ratio: string;
  status: string;
  isPublic: boolean;
  likes: number;
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
  status: "queued" | "running" | "succeeded" | "partial_failed" | "failed" | "cancelled";
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
  return {
    id: user.id,
    name: user.nickname || galleryUser.name,
    avatar: user.avatarText || user.nickname?.slice(0, 1) || galleryUser.avatar,
    color: user.avatarColor || galleryUser.color,
    points: `${user.credits}`,
    userNo: `LUMI${String(user.id).padStart(4, "0")}`,
    bio: user.bio || galleryUser.bio,
    role: user.memberPlan || galleryUser.role,
    works: user.worksCount,
    followers: `${user.followers}`,
    likes: galleryUser.likes
  };
}

function toHomeWork(item: BackendWork): HomeWork {
  return {
    id: item.id,
    image: item.imageUrl,
    userId: 0,
    title: item.title,
    prompt: item.prompt || item.title,
    ratio: item.ratio || "1:1",
    likes: item.likes,
    published: item.status === "published" && item.isPublic,
    status: item.status
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
  return {
    id: job.id,
    prompt: job.prompt,
    model: job.modelId || job.providerModel || "AI",
    count: job.count,
    ratio: job.ratio,
    quality: job.quality,
    percent: Math.max(0, Math.min(job.progress || (job.status === "queued" ? 2 : 10), 99)),
    elapsed: elapsedSeconds(job.createdAt),
    stage: job.stageText || (job.status === "queued" ? "排队中..." : "AI绘制中...")
  };
}

async function fetchGenerateJobsByStatus(status: "queued" | "running") {
  const result = await api.get<PageResult<BackendGenerateJob>>(`/generate/jobs?status=${status}&page=1&pageSize=20`);
  return result.items;
}

export async function fetchGalleryGenerateTasks() {
  const [queued, running] = await Promise.all([fetchGenerateJobsByStatus("queued"), fetchGenerateJobsByStatus("running")]);
  return [...running, ...queued]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toGalleryGenTask);
}

async function fetchTerminalGenerateJobsByStatus(status: GalleryTerminalGenerateJob["status"]) {
  const result = await api.get<PageResult<GalleryTerminalGenerateJob>>(`/generate/jobs?status=${status}&page=1&pageSize=20`);
  return result.items;
}

export async function fetchGalleryTerminalGenerateJobs() {
  const [succeeded, partialFailed, failed, cancelled] = await Promise.all([
    fetchTerminalGenerateJobsByStatus("succeeded"),
    fetchTerminalGenerateJobsByStatus("partial_failed"),
    fetchTerminalGenerateJobsByStatus("failed"),
    fetchTerminalGenerateJobsByStatus("cancelled")
  ]);
  return [...succeeded, ...partialFailed, ...failed, ...cancelled];
}
