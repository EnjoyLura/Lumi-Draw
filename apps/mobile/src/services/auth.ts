import { ref } from "vue";
import { api, clearAuthTokens, getRefreshToken, hasAccessToken, setAuthTokens, setUnauthorizedHandler } from "./api";
import { useDataMode } from "./dataMode";

const STORAGE_KEY = "lumi-logged-in";
const USER_STORAGE_KEY = "lumi-mobile-user";
const PENDING_INVITE_KEY = "lumi-pending-invite-code";

export interface MobileUser {
  id: number;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  gender?: string | null;
  phone?: string | null;
  credits: number;
  memberPlan?: string | null;
  status?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: MobileUser;
}

const isLoggedIn = ref(true);
const currentUser = ref<MobileUser | null>(null);
let initialized = false;

export function initAuth() {
  if (initialized) return;
  initialized = true;

  try {
    const saved = uni.getStorageSync(STORAGE_KEY);
    if (saved === "0" || saved === "1") {
      isLoggedIn.value = saved === "1";
    }
  } catch {
    isLoggedIn.value = true;
  }

  currentUser.value = readStoredUser();
  if (hasAccessToken()) {
    isLoggedIn.value = true;
  }
}

function persistLoginState(value: boolean) {
  isLoggedIn.value = value;
  try {
    uni.setStorageSync(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Storage can be unavailable in some preview environments.
  }
}

function readStoredUser() {
  try {
    const value = uni.getStorageSync(USER_STORAGE_KEY);
    if (!value || typeof value !== "string") return null;
    return JSON.parse(value) as MobileUser;
  } catch {
    return null;
  }
}

function persistUser(user: MobileUser | null) {
  currentUser.value = user;
  try {
    if (user) {
      uni.setStorageSync(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      uni.removeStorageSync(USER_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in some preview environments.
  }
}

function isMockMode() {
  return useDataMode().useMockData.value;
}

function getMockLoginCode() {
  return `mock-h5-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isWeixinMiniProgram() {
  try {
    const systemInfo = uni.getSystemInfoSync() as { uniPlatform?: string };
    return systemInfo.uniPlatform === "mp-weixin";
  } catch {
    return false;
  }
}

function getWechatLoginCode() {
  if (!isWeixinMiniProgram()) {
    return Promise.resolve(getMockLoginCode());
  }

  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: "weixin",
      success(result) {
        if (result.code) {
          resolve(result.code);
          return;
        }
        reject(new Error("wx.login did not return a code"));
      },
      fail(error) {
        reject(new Error(error.errMsg || "wx.login failed"));
      }
    });
  });
}

async function loginWithBackend() {
  const code = await getWechatLoginCode();
  const data = await api.post<LoginResponse>("/auth/wechat/login", { code }, { skipAuth: true });
  setAuthTokens(data);
  persistUser(data.user);
  persistLoginState(true);
  await bindPendingInvite();
}

async function logoutFromBackend() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;

  try {
    await api.post<null>("/auth/logout", { refreshToken });
  } catch {
    // Local logout should still complete when the server token is already invalid.
  }
}

function clearSession() {
  clearAuthTokens();
  persistUser(null);
  persistLoginState(false);
}

async function bindPendingInvite() {
  let inviteCode = "";
  try {
    const stored = uni.getStorageSync(PENDING_INVITE_KEY);
    inviteCode = typeof stored === "string" ? stored.trim() : "";
  } catch {
    inviteCode = "";
  }
  if (!inviteCode) return;

  try {
    await api.post<{ ok: boolean }>("/invite/bind", { code: inviteCode });
  } catch {
    // Invalid/self/repeated invite codes should not block login.
  } finally {
    try {
      uni.removeStorageSync(PENDING_INVITE_KEY);
    } catch {
      // Storage can be unavailable in some preview environments.
    }
  }
}

export function savePendingInviteCode(code: string) {
  const normalized = code.trim();
  if (!normalized) return;
  try {
    uni.setStorageSync(PENDING_INVITE_KEY, normalized);
  } catch {
    // Storage can be unavailable in some preview environments.
  }
}

setUnauthorizedHandler(() => {
  clearSession();
});

export function useAuth() {
  initAuth();

  async function login() {
    if (!isMockMode()) {
      await loginWithBackend();
      return;
    }
    persistLoginState(true);
  }

  async function logout() {
    if (!isMockMode()) {
      await logoutFromBackend();
    }
    clearSession();
  }

  function requireLogin(openLoginSheet?: () => void) {
    if (!isMockMode() && !hasAccessToken()) {
      isLoggedIn.value = false;
    }
    if (isLoggedIn.value) return true;
    openLoginSheet?.();
    return false;
  }

  return {
    isLoggedIn,
    currentUser,
    login,
    logout,
    requireLogin
  };
}
