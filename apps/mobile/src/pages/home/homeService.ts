import { api } from "../../services/api";
import { normalizeAspectRatio } from "../../services/aspectRatio";
import { mockImage } from "../../services/mockImages";
import { inviteRewardsEnabled } from "../../services/featureFlags";
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
  worksCount?: number;
  likesCount?: number;
  followers?: number;
}

interface BackendWork {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  prompt: string;
  ratio: string;
  likes: number;
  favorites: number;
  remakes: number;
  description?: string | null;
  quality?: string | null;
  modelId?: string | null;
  modelName?: string | null;
  style?: string | null;
  tags?: string[];
  status?: string;
  isPublic?: boolean;
  createdAt: string;
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

type CachedHomeBootstrap = {
  version: 1;
  savedAt: number;
  data: HomeBootstrapView;
};

const HOME_BOOTSTRAP_CACHE_KEY = "lumi-home-bootstrap-v1";
const HOME_BOOTSTRAP_CACHE_TTL = 5 * 60_000;
const HOME_BOOTSTRAP_MAX_STALE = 24 * 60 * 60_000;
const warmedBootstrapImages = new Set<string>();
let memoryBootstrapCache: CachedHomeBootstrap | undefined;
let bootstrapRequest: Promise<HomeBootstrapView> | undefined;

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

function validBootstrap(value: unknown): value is HomeBootstrapView {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Partial<HomeBootstrapView>;
  return Array.isArray(data.banners)
    && data.banners.every((item) => Boolean(item) && typeof item === "object")
    && Array.isArray(data.gameplays)
    && data.gameplays.every((item) => Boolean(item) && typeof item === "object")
    && Array.isArray(data.announcements)
    && data.announcements.every((item) => Boolean(item) && typeof item === "object")
    && Number.isFinite(Number(data.publishReward));
}

function readStoredBootstrap() {
  if (memoryBootstrapCache) return memoryBootstrapCache;
  try {
    const raw = uni.getStorageSync(HOME_BOOTSTRAP_CACHE_KEY);
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || parsed.version !== 1 || !Number.isFinite(parsed.savedAt) || !validBootstrap(parsed.data)) return undefined;
    if (Date.now() - parsed.savedAt > HOME_BOOTSTRAP_MAX_STALE) {
      uni.removeStorageSync(HOME_BOOTSTRAP_CACHE_KEY);
      return undefined;
    }
    memoryBootstrapCache = parsed as CachedHomeBootstrap;
    return memoryBootstrapCache;
  } catch {
    return undefined;
  }
}

function storeBootstrap(data: HomeBootstrapView) {
  const entry: CachedHomeBootstrap = { version: 1, savedAt: Date.now(), data };
  memoryBootstrapCache = entry;
  try {
    uni.setStorageSync(HOME_BOOTSTRAP_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // The in-memory cache still serves the current session when storage is full or unavailable.
  }
}

export function getCachedHomeBootstrap() {
  return readStoredBootstrap()?.data;
}

export function prewarmHomeBootstrapImages(data: Pick<HomeBootstrapView, "banners" | "gameplays">) {
  const urls = [
    ...data.banners.slice(0, 2).map((item) => item.image),
    ...data.gameplays.slice(0, 4).map((item) => item.image)
  ].filter((url) => url && !warmedBootstrapImages.has(url));
  urls.forEach((url) => warmedBootstrapImages.add(url));

  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      const src = queue.shift();
      if (!src) return;
      await new Promise<void>((resolve) => {
        uni.getImageInfo({ src, success: () => resolve(), fail: () => resolve() });
      });
    }
  };
  void Promise.all([worker(), worker()]);
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
    color: author.avatarColor || "var(--accent)",
    worksCount: author.worksCount,
    likesCount: author.likesCount,
    followers: author.followers
  };
}

function toHomeWork(item: BackendWork): HomeWork {
  return {
    id: item.id,
    image: item.thumbnailUrl || item.imageUrl,
    userId: item.author.id,
    title: item.title,
    prompt: item.prompt,
    ratio: normalizeAspectRatio(item.ratio),
    likes: item.likes,
    published: item.status ? item.status === "published" && item.isPublic !== false : true,
    status: item.status,
    createdAt: item.createdAt,
    liked: item.liked,
    favorited: item.favorited,
    description: item.description || "",
    quality: item.quality || "",
    modelId: item.modelId || "",
    modelName: item.modelName || item.modelId || "AI 绘画",
    styleName: item.style || "默认",
    tags: item.tags || [],
    favorites: item.favorites,
    remakes: item.remakes,
    isDetailPreloaded: true
  };
}

function normalizeHomeBootstrap(data: BackendBootstrap): HomeBootstrapView {
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
    }).filter((item) => inviteRewardsEnabled || item.action !== "invite"),
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
    }).filter((item) => inviteRewardsEnabled || item.action !== "invite"),
    publishReward: Math.max(0, Number(data.creditsConfig?.publishReward ?? 2))
  };
}

export async function fetchHomeBootstrap(options?: { force?: boolean }): Promise<HomeBootstrapView> {
  const cached = readStoredBootstrap();
  if (!options?.force && cached && Date.now() - cached.savedAt < HOME_BOOTSTRAP_CACHE_TTL) return cached.data;
  if (bootstrapRequest) return bootstrapRequest;

  bootstrapRequest = api.get<BackendBootstrap>("/app/bootstrap", { skipAuth: true })
    .then(normalizeHomeBootstrap)
    .then((data) => {
      storeBootstrap(data);
      return data;
    })
    .finally(() => {
      bootstrapRequest = undefined;
    });
  return bootstrapRequest;
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
