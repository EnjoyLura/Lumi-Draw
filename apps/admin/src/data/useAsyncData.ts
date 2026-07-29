import { useQuery } from "@tanstack/react-query";
import { getAdminToken } from "./http";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return String(hash);
}

function sessionKey() {
  const token = getAdminToken();
  return token ? simpleHash(token) : "guest";
}

/**
 * 旧页面兼容适配器。
 * 新页面直接使用 useQuery；尚未迁移的页面通过本适配器共享同一套缓存、
 * 请求去重、错误处理和静默刷新能力。
 */
export function useAsyncData<T>(
  loader: (() => Promise<T>) | null,
  deps: unknown[]
): AsyncState<T> & { reload: () => void } {
  const loaderKey = loader ? simpleHash(loader.toString()) : "disabled";
  const query = useQuery<T>({
    queryKey: ["admin", "legacy", sessionKey(), loaderKey, ...deps],
    queryFn: loader || (() => Promise.reject(new Error("数据请求未启用"))),
    enabled: Boolean(loader),
    staleTime: 60_000
  });

  return {
    data: query.data ?? null,
    loading: Boolean(loader) && query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? "加载失败" : null,
    reload: () => {
      void query.refetch();
    }
  };
}
