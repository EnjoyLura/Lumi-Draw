/**
 * Feed SWR 种子缓存：进入页面先用上次的数据秒出首屏，后台刷新落地后再
 * diff 更新。缓存只是渲染种子，永远不作为操作依据；写满或损坏时静默降级。
 */
const VERSION = 1;
const MAX_ENTRIES = 8;
const MAX_STALE_MS = 24 * 60 * 60_000;
const KEY_PREFIX = "lumi-feed-v1-";

type CacheEntry<T> = { version: number; savedAt: number; data: T };

const memoryEntries = new Map<string, CacheEntry<unknown>>();

function storageKey(key: string) {
  return `${KEY_PREFIX}${key}`;
}

export function readFeedCache<T>(key: string): T | undefined {
  const cached = memoryEntries.get(key);
  if (cached) {
    return Date.now() - cached.savedAt <= MAX_STALE_MS ? (cached.data as T) : undefined;
  }
  try {
    const raw = uni.getStorageSync(storageKey(key));
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as CacheEntry<T>) : undefined;
    if (!parsed || parsed.version !== VERSION || !Number.isFinite(parsed.savedAt)) return undefined;
    memoryEntries.set(key, parsed as CacheEntry<unknown>);
    if (Date.now() - parsed.savedAt > MAX_STALE_MS) {
      uni.removeStorageSync(storageKey(key));
      memoryEntries.delete(key);
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

export function writeFeedCache<T>(key: string, data: T) {
  const entry: CacheEntry<T> = { version: VERSION, savedAt: Date.now(), data };
  memoryEntries.set(key, entry as CacheEntry<unknown>);
  try {
    uni.setStorageSync(storageKey(key), JSON.stringify(entry));
    evictOverflow();
  } catch {
    // 存储不可用或写满时保留本次会话的内存缓存即可。
  }
}

export function dropFeedCache(key: string) {
  memoryEntries.delete(key);
  try {
    uni.removeStorageSync(storageKey(key));
  } catch {
    // 忽略存储异常：内存已删除，下次读取最多多用一次旧数据。
  }
}

function evictOverflow() {
  const keys = [...memoryEntries.entries()]
    .filter(([, entry]) => entry.version === VERSION)
    .sort((a, b) => a[1].savedAt - b[1].savedAt);
  while (keys.length > MAX_ENTRIES) {
    const [oldest] = keys.shift()!;
    dropFeedCache(oldest);
  }
}

/** JSON 级浅比较：SWR 刷新结果与种子一致时跳过重渲染，避免瀑布流动画重放。 */
export function isSameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
