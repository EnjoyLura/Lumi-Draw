import { DEFAULT_USE_MOCK, MOCK_STORAGE_KEY } from "@lumi-draw/shared";

export const MOCK_DATA_AVAILABLE = import.meta.env.VITE_ENABLE_MOCK_DATA === "true";

export function readUseMockData() {
  if (!MOCK_DATA_AVAILABLE) return false;
  const queryMode = new URLSearchParams(window.location.search).get("mock");
  if (queryMode === "1") {
    window.localStorage.setItem(MOCK_STORAGE_KEY, "1");
    return true;
  }
  if (queryMode === "0") {
    window.localStorage.setItem(MOCK_STORAGE_KEY, "0");
    return false;
  }
  const stored = window.localStorage.getItem(MOCK_STORAGE_KEY);
  if (stored === "0" || stored === "1") {
    return stored === "1";
  }
  return DEFAULT_USE_MOCK;
}

export function writeUseMockData(value: boolean) {
  const next = MOCK_DATA_AVAILABLE && value;
  window.localStorage.setItem(MOCK_STORAGE_KEY, next ? "1" : "0");
  return next;
}
