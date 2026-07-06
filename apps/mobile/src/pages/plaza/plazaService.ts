import { api } from "../../services/api";
import type { HomeUser, HomeWork } from "../home/homeData";

export interface PlazaCategoryOption {
  id?: number;
  name: string;
}

export interface PlazaFilterOption {
  label: string;
  value: string;
}

export interface PlazaConfig {
  categories: PlazaCategoryOption[];
  models: PlazaFilterOption[];
  ratios: PlazaFilterOption[];
  qualities: PlazaFilterOption[];
}

interface BackendCategory {
  id: number;
  name: string;
}

interface BackendBootstrap {
  categories: BackendCategory[];
  models?: Array<{ id: string; name: string; enabled?: boolean }>;
  ratios?: Array<{ label: string; enabled?: boolean }>;
  qualities?: Array<{ label: string; enabled?: boolean }>;
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

export interface PlazaWorkPage {
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

export async function fetchPlazaCategories(): Promise<PlazaCategoryOption[]> {
  return (await fetchPlazaConfig()).categories;
}

function enabled<T extends { enabled?: boolean }>(items: T[] | undefined) {
  return (items ?? []).filter((item) => item.enabled !== false);
}

export async function fetchPlazaConfig(): Promise<PlazaConfig> {
  const data = await api.get<BackendBootstrap>("/app/bootstrap", { skipAuth: true });
  return {
    categories: [{ name: "全部" }, ...data.categories.map((category) => ({ id: category.id, name: category.name }))],
    models: enabled(data.models).map((model) => ({ label: model.name, value: model.id })),
    ratios: enabled(data.ratios).map((ratio) => ({ label: ratio.label, value: ratio.label })),
    qualities: enabled(data.qualities).map((quality) => ({ label: quality.label, value: quality.label }))
  };
}

export async function fetchPlazaWorks(params: {
  categoryId?: number;
  categoryIds?: number[];
  modelIds?: string[];
  ratios?: string[];
  qualities?: string[];
  sort: "hot" | "latest";
  page: number;
  pageSize: number;
  skipAuth?: boolean;
}): Promise<PlazaWorkPage> {
  const query = [
    `sort=${encodeURIComponent(params.sort)}`,
    `page=${params.page}`,
    `pageSize=${params.pageSize}`,
    params.categoryId ? `categoryId=${params.categoryId}` : "",
    params.categoryIds?.length ? `categoryIds=${encodeURIComponent(params.categoryIds.join(","))}` : "",
    params.modelIds?.length ? `modelIds=${encodeURIComponent(params.modelIds.join(","))}` : "",
    params.ratios?.length ? `ratios=${encodeURIComponent(params.ratios.join(","))}` : "",
    params.qualities?.length ? `qualities=${encodeURIComponent(params.qualities.join(","))}` : ""
  ]
    .filter(Boolean)
    .join("&");

  const result = await api.get<PageResult<BackendWork>>(`/works/plaza?${query}`, { skipAuth: params.skipAuth });
  const users = result.items.map((item) => toUser(item.author));
  return {
    works: result.items.map(toWork),
    users: uniqueUsers(users),
    page: result.page,
    hasMore: result.hasMore
  };
}
