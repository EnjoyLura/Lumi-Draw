import { api } from "../../services/api";
import type { HomeUser, HomeWork } from "../home/homeData";

interface BackendHotSearch {
  id: number;
  keyword: string;
}

interface BackendAuthor {
  id: number;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
}

interface BackendWork {
  id: number;
  imageUrl: string;
  title: string;
  prompt: string;
  ratio: string;
  likes: number;
  liked?: boolean;
  favorited?: boolean;
  author: BackendAuthor;
}

interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface SearchResultPage {
  works: HomeWork[];
  users: HomeUser[];
  page: number;
  hasMore: boolean;
}

function toUser(author: BackendAuthor): HomeUser {
  const fallbackName = author.id ? `用户${author.id}` : "未知用户";
  return {
    id: author.id,
    name: author.nickname || fallbackName,
    avatar: author.avatarText || author.nickname?.slice(0, 1) || "U",
    color: author.avatarColor || "var(--accent)"
  };
}

function toWork(item: BackendWork): HomeWork {
  return {
    id: item.id,
    image: item.imageUrl,
    userId: item.author.id,
    title: item.title,
    prompt: item.prompt,
    ratio: item.ratio || "1:1",
    likes: item.likes,
    published: true,
    liked: item.liked,
    favorited: item.favorited
  };
}

function uniqueUsers(users: HomeUser[]) {
  const map = new Map<number, HomeUser>();
  users.forEach((user) => map.set(user.id, user));
  return Array.from(map.values());
}

export async function fetchHotSearches() {
  const rows = await api.get<BackendHotSearch[]>("/config/hot-searches", { skipAuth: true });
  return rows.map((item) => item.keyword).filter(Boolean);
}

export async function searchWorks(keyword: string, page: number, pageSize: number, options?: { skipAuth?: boolean; scope?: "gallery" | "mine" }): Promise<SearchResultPage> {
  const query = [
    `keyword=${encodeURIComponent(keyword)}`,
    `page=${page}`,
    `pageSize=${pageSize}`,
    options?.scope ? `scope=${options.scope}` : ""
  ].filter(Boolean).join("&");
  const result = await api.get<PageResult<BackendWork>>(`/works/search?${query}`, options);
  const users = result.items.map((item) => toUser(item.author));
  return {
    works: result.items.map(toWork),
    users: uniqueUsers(users),
    page: result.page,
    hasMore: result.hasMore
  };
}
