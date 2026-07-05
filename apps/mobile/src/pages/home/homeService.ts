import { api } from "../../services/api";
import {
  gameplays as mockGameplays,
  homeBanners as mockBanners,
  homeUsers as mockUsers,
  type Gameplay,
  type HomeBanner,
  type HomeUser,
  type HomeWork
} from "./homeData";

type FeedTab = "recommend" | "latest";

interface BackendBanner {
  id: number;
  title: string;
  description: string;
  action: string;
}

interface BackendGameplay {
  id: number;
  name: string;
  description: string;
  uses: string | number;
  hot: boolean;
}

interface BackendBootstrap {
  banners: BackendBanner[];
  gameplays: BackendGameplay[];
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

export interface HomeBootstrapView {
  banners: HomeBanner[];
  gameplays: Gameplay[];
}

export interface HomeFeedView {
  works: HomeWork[];
  users: HomeUser[];
  page: number;
  hasMore: boolean;
}

function fallbackByIndex<T>(items: T[], index: number) {
  return items[index % items.length];
}

function formatUses(value: string | number, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}w`;
  return `${value}`;
}

function uniqueUsers(users: HomeUser[]) {
  const map = new Map<number, HomeUser>();
  users.forEach((user) => map.set(user.id, user));
  return Array.from(map.values());
}

function toHomeUser(author: BackendAuthor, index: number): HomeUser {
  const fallback = fallbackByIndex(mockUsers, index);
  return {
    id: author.id,
    name: author.nickname || fallback.name,
    avatar: author.avatarText || author.nickname?.slice(0, 1) || fallback.avatar,
    color: author.avatarColor || fallback.color
  };
}

function toHomeWork(item: BackendWork): HomeWork {
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

export async function fetchHomeBootstrap(): Promise<HomeBootstrapView> {
  const data = await api.get<BackendBootstrap>("/app/bootstrap", { skipAuth: true });
  return {
    banners: data.banners.map((item, index) => {
      const fallback = mockBanners.find((banner) => banner.action === item.action) ?? fallbackByIndex(mockBanners, index);
      return {
        image: fallback.image,
        title: item.title || fallback.title,
        description: item.description || fallback.description,
        action: item.action || fallback.action
      };
    }),
    gameplays: data.gameplays.map((item, index) => {
      const fallback = mockGameplays.find((gameplay) => gameplay.name === item.name) ?? fallbackByIndex(mockGameplays, index);
      return {
        name: item.name || fallback.name,
        image: fallback.image,
        uses: formatUses(item.uses, fallback.uses),
        hot: item.hot
      };
    })
  };
}

export async function fetchHomeFeed(tab: FeedTab, page: number, pageSize: number): Promise<HomeFeedView> {
  const result = await api.get<PageResult<BackendWork>>(`/works/feed?tab=${tab}&page=${page}&pageSize=${pageSize}`, { skipAuth: true });
  const users = result.items.map((item, index) => toHomeUser(item.author, index));
  return {
    works: result.items.map(toHomeWork),
    users: uniqueUsers(users),
    page: result.page,
    hasMore: result.hasMore
  };
}
