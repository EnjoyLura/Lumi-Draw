import { api } from "./api";
import type { HomeUser, HomeWork } from "../pages/home/homeData";

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface BackendAuthor {
  id: number;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
  avatarUrl?: string | null;
}

export interface BackendUserProfile extends BackendAuthor {
  bio: string;
  gender: "male" | "female" | "unknown";
  worksCount: number;
  likesCount: number;
  followers: number;
  following: number;
  isFollowing: boolean;
}

export interface BackendWorkCard {
  id: number;
  imageUrl: string;
  title: string;
  prompt: string;
  ratio: string;
  likes: number;
  favorites: number;
  remakes: number;
  createdAt: string;
  viewedAt?: string;
  favoritedAt?: string;
  author: BackendAuthor;
}

export interface WorkState {
  liked: boolean;
  favorited: boolean;
  following: boolean;
}

export interface InteractionResult {
  liked?: boolean;
  favorited?: boolean;
  likes: number;
  favorites: number;
}

export interface FollowResult {
  following: boolean;
  followers: number;
}

export interface RemakeResult {
  remakes: number;
}

export function formatCompactNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}w`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

export function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diff = Math.max(0, Date.now() - time);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  return `${Math.floor(diff / day)}天前`;
}

export function toHomeUser(author: BackendAuthor): HomeUser {
  const fallbackName = author.id ? `用户${author.id}` : "未知用户";
  return {
    id: author.id,
    name: author.nickname || fallbackName,
    avatar: author.avatarText || author.nickname?.slice(0, 1) || "U",
    color: author.avatarColor || "var(--accent)"
  };
}

export function toHomeWork(item: BackendWorkCard): HomeWork {
  return {
    id: item.id,
    image: item.imageUrl,
    userId: item.author.id,
    title: item.title,
    prompt: item.prompt,
    ratio: item.ratio || "1:1",
    likes: item.likes,
    published: true
  };
}

export function fetchWorkState(id: number) {
  return api.get<WorkState>(`/social/works/${id}/state`);
}

export function recordWorkView(id: number) {
  return api.post<{ viewed: boolean }>(`/social/works/${id}/view`);
}

export function toggleWorkLike(id: number) {
  return api.post<InteractionResult>(`/social/works/${id}/like`);
}

export function toggleWorkFavorite(id: number) {
  return api.post<InteractionResult>(`/social/works/${id}/favorite`);
}

export function recordWorkRemake(id: number) {
  return api.post<RemakeResult>(`/social/works/${id}/remake`);
}

export function fetchUserProfile(id: number, options?: { skipAuth?: boolean }) {
  return api.get<BackendUserProfile>(`/social/users/${id}/profile`, options);
}

export function fetchUserWorks(id: number, page = 1, pageSize = 20, options?: { skipAuth?: boolean }) {
  return api.get<PageResult<BackendWorkCard>>(`/social/users/${id}/works?page=${page}&pageSize=${pageSize}`, options);
}

export function followUser(id: number) {
  return api.post<FollowResult>(`/social/users/${id}/follow`);
}

export function unfollowUser(id: number) {
  return api.delete<FollowResult>(`/social/users/${id}/follow`);
}

export function fetchFollowList(type: "following" | "followers", page = 1, pageSize = 50) {
  return api.get<PageResult<BackendUserProfile>>(`/social/follows?type=${type}&page=${page}&pageSize=${pageSize}`);
}

export function fetchHistory(page = 1, pageSize = 60) {
  return api.get<PageResult<BackendWorkCard>>(`/social/history?page=${page}&pageSize=${pageSize}`);
}

export function fetchFavorites(page = 1, pageSize = 60) {
  return api.get<PageResult<BackendWorkCard>>(`/social/favorites?page=${page}&pageSize=${pageSize}`);
}

export function clearHistory() {
  return api.delete<{ ok: boolean }>("/social/history");
}
