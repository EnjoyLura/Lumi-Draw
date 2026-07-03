import { DEFAULT_USE_MOCK, MOCK_STORAGE_KEY } from "@lumi-draw/shared";
import { ref } from "vue";

const useMockData = ref(DEFAULT_USE_MOCK);

export function initDataMode() {
  const stored = uni.getStorageSync(MOCK_STORAGE_KEY);
  if (stored === "0" || stored === "1") {
    useMockData.value = stored === "1";
  }
}

export function setUseMockData(value: boolean) {
  useMockData.value = value;
  uni.setStorageSync(MOCK_STORAGE_KEY, value ? "1" : "0");
}

export function useDataMode() {
  return {
    useMockData,
    setUseMockData
  };
}
