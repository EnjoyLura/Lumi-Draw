const DEFAULT_API_BASE = "https://ejoyflie.cloud/api";
const ACCESS_TOKEN_KEY = "lumi-mobile-access-token";
const REFRESH_TOKEN_KEY = "lumi-mobile-refresh-token";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

interface RequestOptions {
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class ApiError extends Error {
  readonly code: number;
  readonly statusCode?: number;

  constructor(message: string, code: number, statusCode?: number) {
    super(localizeApiErrorMessage(message, statusCode));
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function localizeApiErrorMessage(message: string, statusCode?: number): string {
  const normalized = message.trim();
  if (!normalized) return "操作失败，请稍后重试";

  const providerFailure = normalized.match(/^(?:ainb|change2pro)?\s*request failed:\s*(.+)$/i);
  if (providerFailure) {
    const detail = localizeApiErrorMessage(providerFailure[1], statusCode);
    return detail === "操作失败，请稍后重试" ? "图片生成服务请求失败，请稍后重试" : detail;
  }

  // Business errors written in Chinese are already suitable for direct display.
  if (/[\u3400-\u9fff]/u.test(normalized)) return normalized;

  const lower = normalized.toLowerCase();
  if (/cancel(?:led)?/.test(lower)) return "已取消操作";
  if (/generation task.*(already|in progress)|already.*in progress/.test(lower)) {
    return "当前已有任务正在生成，请等待完成后再试";
  }
  if (/already.*published|result.*published/.test(lower)) return "该生成结果已发布，请勿重复操作";
  if (/no available compatible accounts|model.*unavailable/.test(lower)) return "当前模型暂时不可用，请稍后重试";
  if (/content policy|safety|moderation/.test(lower)) return "内容可能不安全，请修改提示词后重试";
  if (/login expired|unauthori[sz]ed|token.*(expired|invalid)|invalid.*token/.test(lower) || statusCode === 401) {
    return "登录状态已过期，请重新登录";
  }
  if (/permission denied|forbidden|no permission/.test(lower) || statusCode === 403) return "暂无权限执行此操作";
  if (/timeout|timed out/.test(lower)) return "请求超时，请稍后重试";
  if (/network|fetch failed|request:fail|connection|socket|dns/.test(lower)) return "网络连接异常，请检查网络后重试";
  if (/chooseimage|no image selected/.test(lower)) return "未选择图片";
  if (/getimageinfo|image unavailable|image load failed/.test(lower)) return "图片读取失败，请重新选择";
  if (/compressimage/.test(lower)) return "图片压缩失败，请重新选择";
  if (/oss upload|upload failed|readfile|filesystemmanager/.test(lower)) return "图片上传失败，请稍后重试";
  if (/too many requests|rate limit/.test(lower) || statusCode === 429) return "操作过于频繁，请稍后再试";
  if (/not found/.test(lower) || statusCode === 404) return "请求的内容不存在或已被删除";
  if (/invalid|bad request|validation failed/.test(lower) || statusCode === 400) return "请求参数有误，请检查后重试";
  if (/service unavailable|bad gateway|gateway timeout|internal server error/.test(lower) || (statusCode !== undefined && statusCode >= 500)) {
    return "服务暂时不可用，请稍后重试";
  }

  return "操作失败，请稍后重试";
}

let refreshPromise: Promise<void> | null = null;
let unauthorizedHandler: (() => void) | null = null;

function getApiBase() {
  const envBase = import.meta.env.VITE_API_BASE;
  const fallback = import.meta.env.MODE === "development" ? "/api" : DEFAULT_API_BASE;
  return (envBase || fallback).replace(/\/+$/, "");
}

function joinUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalizedPath}`;
}

function getStorageString(key: string) {
  try {
    const value = uni.getStorageSync(key);
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

function setStorageString(key: string, value: string) {
  try {
    uni.setStorageSync(key, value);
  } catch {
    // Storage can be unavailable in some preview environments.
  }
}

function removeStorage(key: string) {
  try {
    uni.removeStorageSync(key);
  } catch {
    // Storage can be unavailable in some preview environments.
  }
}

export function getAccessToken() {
  return getStorageString(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return getStorageString(REFRESH_TOKEN_KEY);
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}

export function setAuthTokens(tokens: { accessToken: string; refreshToken: string }) {
  setStorageString(ACCESS_TOKEN_KEY, tokens.accessToken);
  setStorageString(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthTokens() {
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(REFRESH_TOKEN_KEY);
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function refreshAuthToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new ApiError("登录状态已过期，请重新登录", 40001, 401);
    }

    const data = await request<RefreshResponse>("POST", "/auth/refresh", { refreshToken }, { skipAuth: true, skipRefresh: true });
    setAuthTokens(data);
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function shouldRefresh(error: ApiError, options?: RequestOptions) {
  if (options?.skipRefresh) return false;
  if (!getRefreshToken()) return false;
  return error.code === 40001 || error.statusCode === 401;
}

export async function request<T>(method: HttpMethod, path: string, data?: unknown, options?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  const token = getAccessToken();
  if (token && !options?.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    return await rawRequest<T>(method, path, data, headers);
  } catch (error) {
    if (!(error instanceof ApiError) || !shouldRefresh(error, options)) {
      throw error;
    }

    try {
      await refreshAuthToken();
      return await request<T>(method, path, data, { ...options, skipRefresh: true });
    } catch (refreshError) {
      clearAuthTokens();
      unauthorizedHandler?.();
      throw refreshError;
    }
  }
}

function rawRequest<T>(method: HttpMethod, path: string, data: unknown, headers: Record<string, string>) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: joinUrl(path),
      method: method as UniApp.RequestOptions["method"],
      data: data as UniApp.RequestOptions["data"],
      header: headers,
      success(response) {
        const statusCode = response.statusCode;
        const body = response.data as Partial<ApiEnvelope<T>> | undefined;
        const code = typeof body?.code === "number" ? body.code : statusCode >= 200 && statusCode < 300 ? 0 : statusCode;
        const message = typeof body?.message === "string" ? body.message : "请求失败，请稍后重试";

        if (statusCode >= 200 && statusCode < 300 && code === 0) {
          resolve(body?.data as T);
          return;
        }

        reject(new ApiError(message, code, statusCode));
      },
      fail(error) {
        reject(new ApiError(error.errMsg || "网络连接异常，请检查网络后重试", -1));
      }
    });
  });
}

export const api = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(path: string, data?: unknown, options?: RequestOptions) {
    return request<T>("POST", path, data, options);
  },
  patch<T>(path: string, data?: unknown, options?: RequestOptions) {
    return request<T>("PATCH", path, data, options);
  },
  put<T>(path: string, data?: unknown, options?: RequestOptions) {
    return request<T>("PUT", path, data, options);
  },
  delete<T>(path: string, data?: unknown, options?: RequestOptions) {
    return request<T>("DELETE", path, data, options);
  }
};
