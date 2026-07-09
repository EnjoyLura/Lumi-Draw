import { DEFAULT_USE_MOCK, MOCK_STORAGE_KEY } from "@lumi-draw/shared";
import { ref } from "vue";

const useMockData = ref(DEFAULT_USE_MOCK);
const mockDataEnabled = import.meta.env.VITE_ENABLE_MOCK_DATA === "true";

export function initDataMode() {
  if (!mockDataEnabled) {
    useMockData.value = false;
    return;
  }
  const stored = uni.getStorageSync(MOCK_STORAGE_KEY);
  if (stored === "0" || stored === "1") {
    useMockData.value = stored === "1";
  }
}

export function setUseMockData(value: boolean) {
  const next = mockDataEnabled ? value : false;
  useMockData.value = next;
  uni.setStorageSync(MOCK_STORAGE_KEY, next ? "1" : "0");
}

export function useDataMode() {
  return {
    useMockData,
    setUseMockData
  };
}
