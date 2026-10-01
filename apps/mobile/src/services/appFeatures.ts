import { ref } from "vue";
import { api } from "./api";

const CACHE_KEY = "lumi-app-features-v1";

/** 运营开关由服务端下发，读不到时沿用上一次已知状态，默认全部开放。 */
export const membershipEnabled = ref(true);

interface BackendFeatures {
  membershipEnabled?: boolean;
}

function applyFeatures(data: BackendFeatures | null | undefined) {
  if (typeof data?.membershipEnabled === "boolean") membershipEnabled.value = data.membershipEnabled;
}

export function initAppFeatures() {
  try {
    const cached = uni.getStorageSync(CACHE_KEY);
    if (cached) applyFeatures(JSON.parse(cached));
  } catch {
    uni.removeStorageSync(CACHE_KEY);
  }
  void refreshAppFeatures();
}

export async function refreshAppFeatures() {
  try {
    const data = await api.get<BackendFeatures>("/config/features", { skipAuth: true });
    applyFeatures(data);
    uni.setStorageSync(CACHE_KEY, JSON.stringify(data));
  } catch {
    // 网络失败时保持缓存状态，不让开关抖动影响页面。
  }
}
