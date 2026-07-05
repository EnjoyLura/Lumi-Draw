import { api } from "../../services/api";
import { formatRelativeTime, toHomeUser, type BackendAuthor } from "../../services/social";
import type { HomeUser } from "../home/homeData";
import type { DetailWork } from "./workDetailData";

interface BackendWorkDetail {
  id: number;
  imageUrl: string;
  title: string;
  description?: string | null;
  prompt: string;
  ratio: string;
  quality?: string | null;
  modelId?: string | null;
  modelName?: string | null;
  style?: string | null;
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
  user: HomeUser;
}

export async function fetchWorkDetail(id: number): Promise<BackendWorkDetailView> {
  const item = await api.get<BackendWorkDetail>(`/works/${id}`);
  const styleName = item.style || "默认";
  const title = item.title || item.prompt.slice(0, 20);
  const published = item.status === "published" && item.isPublic;

  return {
    work: {
      id: item.id,
      image: item.imageUrl,
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
      tags: [styleName, item.ratio || "1:1", published ? "已发布" : item.status === "pending" ? "审核中" : "草稿"],
      favorites: item.favorites,
      remakes: item.remakes,
      time: formatRelativeTime(item.createdAt)
    },
    user: toHomeUser(item.author)
  };
}

export function deleteWork(id: number) {
  return api.delete<{ ok: boolean; action: "delete" }>(`/works/${id}?action=delete`);
}

export function moveWorkToDraft(id: number) {
  return api.delete<{ ok: boolean; action: "draft" }>(`/works/${id}?action=draft`);
}
