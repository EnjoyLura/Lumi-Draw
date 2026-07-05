import { api } from "../../services/api";
import type { HomeUser } from "../home/homeData";
import type { DetailWork } from "./workDetailData";

interface BackendAuthor {
  id: number;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
}

interface BackendWorkDetail {
  id: number;
  imageUrl: string;
  title: string;
  description?: string | null;
  prompt: string;
  ratio: string;
  quality?: string | null;
  modelName?: string | null;
  style?: string | null;
  likes: number;
  favorites: number;
  remakes: number;
  isPublic: boolean;
  createdAt: string;
  author: BackendAuthor;
}

export interface BackendWorkDetailView {
  work: DetailWork;
  user: HomeUser;
}

function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  return `${Math.floor(diff / day)}天前`;
}

function toUser(author: BackendAuthor): HomeUser {
  return {
    id: author.id,
    name: author.nickname,
    avatar: author.avatarText || author.nickname.slice(0, 1) || "露",
    color: author.avatarColor || "var(--accent)"
  };
}

export async function fetchWorkDetail(id: number): Promise<BackendWorkDetailView> {
  const item = await api.get<BackendWorkDetail>(`/works/${id}`, { skipAuth: true });
  const styleName = item.style || "默认";
  const title = item.title || item.prompt.slice(0, 20);
  return {
    work: {
      id: item.id,
      image: item.imageUrl,
      userId: item.author.id,
      title,
      prompt: item.prompt,
      ratio: item.ratio || "1:1",
      likes: item.likes,
      published: item.isPublic,
      description: item.description || `${title}，由露米绘画AI生成。`,
      modelName: item.modelName || item.quality || "AI模型",
      styleName,
      tags: [styleName, item.ratio, item.isPublic ? "已发布" : "草稿"],
      favorites: item.favorites,
      remakes: item.remakes,
      time: formatRelativeTime(item.createdAt)
    },
    user: toUser(item.author)
  };
}
