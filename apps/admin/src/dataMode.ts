import { DEFAULT_USE_MOCK, MOCK_STORAGE_KEY } from "@lumi-draw/shared";

export function readUseMockData() {
  const stored = window.localStorage.getItem(MOCK_STORAGE_KEY);
  if (stored === "0" || stored === "1") {
    return stored === "1";
  }
  return DEFAULT_USE_MOCK;
}

export function writeUseMockData(value: boolean) {
  window.localStorage.setItem(MOCK_STORAGE_KEY, value ? "1" : "0");
}
