import { ref } from "vue";

const STORAGE_KEY = "lumi-logged-in";

const isLoggedIn = ref(true);
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
}

function persistLoginState(value: boolean) {
  isLoggedIn.value = value;
  try {
    uni.setStorageSync(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Storage can be unavailable in some preview environments.
  }
}

export function useAuth() {
  initAuth();

  function login() {
    persistLoginState(true);
  }

  function logout() {
    persistLoginState(false);
  }

  function requireLogin(openLoginSheet?: () => void) {
    if (isLoggedIn.value) return true;
    openLoginSheet?.();
    return false;
  }

  return {
    isLoggedIn,
    login,
    logout,
    requireLogin
  };
}
