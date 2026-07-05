// 管理后台 API 客户端：统一 base、管理员 token、响应封装与 401 处理。
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "https://ejoyflie.cloud/api";
const TOKEN_KEY = "lumi-admin-token";

export function getAdminToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setAdminToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearAdminToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(res.status, `请求失败(${res.status})`);
  }
  if (json.code === 40001) {
    clearAdminToken();
    window.dispatchEvent(new Event("lumi-admin-unauthorized"));
    throw new ApiError(40001, json.message || "登录已失效");
  }
  if (json.code !== 0) {
    throw new ApiError(json.code, json.message || "请求出错");
  }
  return json.data;
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  del: <T>(path: string) => request<T>("DELETE", path)
};

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
