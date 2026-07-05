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
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

let refreshPromise: Promise<void> | null = null;
let unauthorizedHandler: (() => void) | null = null;

function getApiBase() {
  const envBase = import.meta.env.VITE_API_BASE;
  return (envBase || DEFAULT_API_BASE).replace(/\/+$/, "");
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
      throw new ApiError("Login expired", 40001, 401);
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
        const message = typeof body?.message === "string" ? body.message : "Request failed";

        if (statusCode >= 200 && statusCode < 300 && code === 0) {
          resolve(body?.data as T);
          return;
        }

        reject(new ApiError(message, code, statusCode));
      },
      fail(error) {
        reject(new ApiError(error.errMsg || "Network error", -1));
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
