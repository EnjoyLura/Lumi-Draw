import { DEFAULT_USE_MOCK, MOCK_STORAGE_KEY } from "@lumi-draw/shared";

const mockDataEnabled = import.meta.env.VITE_ENABLE_MOCK_DATA === "true";

export function readUseMockData() {
  if (!mockDataEnabled) return false;
  const stored = window.localStorage.getItem(MOCK_STORAGE_KEY);
  if (stored === "0" || stored === "1") {
    return stored === "1";
  }
  return DEFAULT_USE_MOCK;
}

export function writeUseMockData(value: boolean) {
  window.localStorage.setItem(MOCK_STORAGE_KEY, mockDataEnabled && value ? "1" : "0");
}
