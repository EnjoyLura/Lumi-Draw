import { api } from "../../services/api";
import { formatCompactNumber, formatRelativeTime, toHomeUser, type BackendAuthor } from "../../services/social";
import type { HomeUser } from "../home/homeData";
import type { DetailWork } from "./workDetailData";

interface BackendWorkDetail {
  id: number;
  imageUrl: string;
  previewUrl?: string;
  fullscreenUrl?: string;
  title: string;
  description?: string | null;
  prompt: string;
  ratio: string;
  quality?: string | null;
  modelId?: string | null;
  modelName?: string | null;
  style?: string | null;
  tags?: string[];
  likes: number;
  favorites: number;
  remakes: number;
  status: string;
  isPublic: boolean;
  createdAt: string;
  author: BackendAuthor;
}

export interface BackendWorkDetailView {
  work: DetailWork;
  user: DetailAuthor;
}

export interface DetailAuthor extends HomeUser {
  worksText: string;
  likesText: string;
  followersText: string;
  followersCount: number;
}

function toDetailAuthor(author: BackendAuthor): DetailAuthor {
  return {
    ...toHomeUser(author),
    worksText: formatCompactNumber(author.worksCount ?? 0),
    likesText: formatCompactNumber(author.likesCount ?? 0),
    followersText: formatCompactNumber(author.followers ?? 0),
    followersCount: author.followers ?? 0
  };
}

export async function fetchWorkDetail(id: number): Promise<BackendWorkDetailView> {
  const item = await api.get<BackendWorkDetail>(`/works/${id}`);
  const styleName = item.style || "默认";
  const title = item.title || item.prompt.slice(0, 20);
  const published = item.status === "published" && item.isPublic;
  const editTags = item.tags?.length ? item.tags : [styleName].filter(Boolean);
  const displayTags = editTags.filter((tag) => tag !== styleName);

  return {
    work: {
      id: item.id,
      image: item.imageUrl,
      previewImage: item.previewUrl || item.imageUrl,
      fullscreenImage: item.fullscreenUrl || item.imageUrl,
      originalImage: item.imageUrl,
      userId: item.author.id,
      title,
      prompt: item.prompt,
      ratio: item.ratio || "1:1",
      likes: item.likes,
      published,
      status: item.status,
      description: item.description || `${title}，由露米绘画 AI 生成，适合继续同款创作。`,
      modelId: item.modelId || "",
      modelName: item.modelName || item.quality || "AI 模型",
      quality: item.quality || "",
      styleName,
      tags: displayTags,
      editTags,
      favorites: item.favorites,
      remakes: item.remakes,
      time: formatRelativeTime(item.createdAt)
    },
    user: toDetailAuthor(item.author)
  };
}

export function deleteWork(id: number) {
  return api.delete<{ ok: boolean; action: "delete" }>(`/works/${id}?action=delete`);
}

export function takeDownWork(id: number) {
  return api.delete<{ ok: boolean; action: "offline" }>(`/works/${id}?action=offline`);
}
