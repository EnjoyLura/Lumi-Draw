import { api } from "../../services/api";
import { mockImage } from "../../services/mockImages";
import {
  gameplays as mockGameplays,
  homeAnnouncements as mockAnnouncements,
  homeBanners as mockBanners,
  type Gameplay,
  type HomeAnnouncement,
  type HomeBanner,
  type HomeUser,
  type HomeWork
} from "./homeData";

type FeedTab = "recommend" | "latest";

interface BackendBanner {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  action: string;
}

interface BackendGameplay {
  id: number;
  name: string;
  description: string;
  uses: string | number;
  hot: boolean;
  imageUrl?: string;
}

interface BackendBootstrap {
  banners: BackendBanner[];
  gameplays: BackendGameplay[];
  announcements?: BackendAnnouncement[];
  creditsConfig?: { publishReward?: number };
}

interface BackendAnnouncement {
  id: number;
  title: string;
  summary: string;
  action: string;
  rangeText: string;
  popup: boolean;
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
  thumbnailUrl?: string;
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

export interface HomeBootstrapView {
  banners: HomeBanner[];
  gameplays: Gameplay[];
  announcements: HomeAnnouncement[];
  publishReward: number;
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

function normalizeBannerAction(action: string, title = "") {
  const value = action.trim();
  if (["创作页", "create"].includes(value)) {
    if (/签到/.test(title)) return "checkin";
    if (/发布作品/.test(title)) return "publish";
    if (/gpt\s*image\s*2/i.test(title)) return "create-gpt-image-2";
  }
  const map: Record<string, string> = {
    "\u53d1\u5e03\u4f5c\u54c1\u9875": "publish",
    签到页: "checkin",
    创作页: "create",
    会员页: "membership",
    发布页: "publish",
    充值页: "recharge",
    邀请页: "invite",
    广场页: "plaza",
    画廊页: "gallery",
    我的页: "mine",
    消息页: "messages",
    全部玩法: "all-gameplays",
    反推提示词: "reverse-prompt",
    活动页: "create",
    无: "none"
  };
  return map[value] || value;
}

function toHomeUser(author: BackendAuthor): HomeUser {
  const fallbackName = author.id ? `用户${author.id}` : "未知用户";
  return {
    id: author.id,
    name: author.nickname || fallbackName,
    avatar: author.avatarText || author.nickname?.slice(0, 1) || "U",
    color: author.avatarColor || "var(--accent)"
  };
}

function toHomeWork(item: BackendWork): HomeWork {
  return {
    id: item.id,
    image: item.thumbnailUrl || item.imageUrl,
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

export async function fetchHomeBootstrap(): Promise<HomeBootstrapView> {
  const data = await api.get<BackendBootstrap>("/app/bootstrap", { skipAuth: true });
  return {
    banners: data.banners.map((item, index) => {
      const action = normalizeBannerAction(item.action || "", item.title || "");
      const fallback = mockBanners.find((banner) => banner.action === action) ?? fallbackByIndex(mockBanners, index);
      return {
        image: item.imageUrl || fallback.image,
        title: item.title || fallback.title,
        description: item.description || fallback.description,
        action: action || fallback.action
      };
    }),
    gameplays: data.gameplays.map((item, index) => {
      const fallback = mockGameplays.find((gameplay) => gameplay.name === item.name) ?? fallbackByIndex(mockGameplays, index);
      return {
        name: item.name || fallback.name,
        image: item.imageUrl || fallback.image,
        uses: formatUses(item.uses, fallback.uses),
        hot: item.hot
      };
    }),
    announcements: (data.announcements ?? []).map((item, index) => {
      const fallback = fallbackByIndex(mockAnnouncements, index);
      return {
        id: item.id,
        image: mockImage(`announce${item.id}`, 600, 280),
        title: item.title || fallback.title,
        summary: item.summary || fallback.summary,
        action: normalizeBannerAction(item.action || fallback.action, item.title || fallback.title),
        rangeText: item.rangeText || fallback.rangeText,
        popup: item.popup
      };
    }),
    publishReward: Math.max(0, Number(data.creditsConfig?.publishReward ?? 50))
  };
}

export async function fetchHomeFeed(tab: FeedTab, page: number, pageSize: number, options?: { skipAuth?: boolean }): Promise<HomeFeedView> {
  const result = await api.get<PageResult<BackendWork>>(`/works/feed?tab=${tab}&page=${page}&pageSize=${pageSize}`, options);
  const users = result.items.map((item) => toHomeUser(item.author));
  return {
    works: result.items.map(toHomeWork),
    users: uniqueUsers(users),
    page: result.page,
    hasMore: result.hasMore
  };
}
