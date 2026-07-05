import { api } from "../../services/api";
import { homeUsers as mockUsers, type HomeUser, type HomeWork } from "../home/homeData";

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

function fallbackUser(index: number) {
  return mockUsers[index % mockUsers.length];
}

function toUser(author: BackendAuthor, index: number): HomeUser {
  const fallback = fallbackUser(index);
  return {
    id: author.id,
    name: author.nickname || fallback.name,
    avatar: author.avatarText || author.nickname?.slice(0, 1) || fallback.avatar,
    color: author.avatarColor || fallback.color
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
    published: true
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

export async function searchWorks(keyword: string, page: number, pageSize: number): Promise<SearchResultPage> {
  const query = [
    `keyword=${encodeURIComponent(keyword)}`,
    `page=${page}`,
    `pageSize=${pageSize}`
  ].join("&");
  const result = await api.get<PageResult<BackendWork>>(`/works/search?${query}`, { skipAuth: true });
  const users = result.items.map((item, index) => toUser(item.author, index));
  return {
    works: result.items.map(toWork),
    users: uniqueUsers(users),
    page: result.page,
    hasMore: result.hasMore
  };
}
