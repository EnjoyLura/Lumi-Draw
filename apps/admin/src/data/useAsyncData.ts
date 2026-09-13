import { useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const asyncDataCache = new Map<string, unknown>();

function simpleHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function getSessionCachePart() {
  if (typeof window === "undefined") return "";
  const token = window.localStorage.getItem("lumi-admin-token");
  return token ? simpleHash(token) : "guest";
}

function getCacheKey(loader: (() => Promise<unknown>) | null, deps: unknown[]) {
  if (!loader) return "";
  return JSON.stringify([getSessionCachePart(), loader.toString(), deps]);
}

// loader 为 null 时不加载（例如 mock 模式下用同步数据）
export function useAsyncData<T>(loader: (() => Promise<T>) | null, deps: unknown[]): AsyncState<T> & { reload: () => void } {
  const cacheKey = getCacheKey(loader, deps);
  const cachedData = cacheKey ? asyncDataCache.get(cacheKey) as T | undefined : undefined;
  const [state, setState] = useState<AsyncState<T>>({ data: cachedData ?? null, loading: !!loader && cachedData === undefined, error: null });
  const [tick, setTick] = useState(0);
  const silentReloadRef = useRef(false);

  useEffect(() => {
    if (!loader) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let alive = true;
    const silentReload = silentReloadRef.current;
    silentReloadRef.current = false;
    const cached = asyncDataCache.get(cacheKey) as T | undefined;
    setState((s) => ({
      data: s.data ?? cached ?? null,
      loading: !(silentReload && (s.data !== null || cached !== undefined)) && cached === undefined,
      error: null
    }));
    loader()
      .then((data) => {
        asyncDataCache.set(cacheKey, data);
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (alive) {
          const fallback = asyncDataCache.get(cacheKey) as T | undefined;
          setState((s) => ({
            data: s.data ?? fallback ?? null,
            loading: false,
            error: e instanceof Error ? e.message : "加载失败"
          }));
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return {
    ...state,
    reload: () => {
      silentReloadRef.current = true;
      setTick((t) => t + 1);
    }
  };
}
