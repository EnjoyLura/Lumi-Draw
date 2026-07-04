import { ref } from "vue";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "lumi-theme";
const theme = ref<ThemeMode>("light");

function applyTheme(mode: ThemeMode) {
  // #ifdef H5
  document.documentElement.setAttribute("data-theme", mode);
  // #endif
}

export function initTheme() {
  const stored = uni.getStorageSync(THEME_STORAGE_KEY);
  theme.value = stored === "dark" ? "dark" : "light";
  applyTheme(theme.value);
}

export function setTheme(mode: ThemeMode) {
  theme.value = mode;
  uni.setStorageSync(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
}

export function useTheme() {
  return {
    theme,
    setTheme,
    toggleTheme: () => setTheme(theme.value === "dark" ? "light" : "dark")
  };
}
