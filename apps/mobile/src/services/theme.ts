import { computed, ref } from "vue";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "lumi-theme";
const theme = ref<ThemeMode>("light");
const themeClass = computed(() => `theme-${theme.value}`);

function applyTheme(mode: ThemeMode) {
  // #ifdef H5
  document.documentElement.setAttribute("data-theme", mode);
  // #endif
}

function applyWindowBackground(mode: ThemeMode) {
  const backgroundColor = mode === "dark" ? "#141416" : "#ffffff";
  const uniWithBackground = uni as typeof uni & {
    setBackgroundColor?: (options: {
      backgroundColor: string;
      backgroundColorTop?: string;
      backgroundColorBottom?: string;
    }) => void;
  };

  uniWithBackground.setBackgroundColor?.({
    backgroundColor,
    backgroundColorTop: backgroundColor,
    backgroundColorBottom: backgroundColor
  });
}

export function applyNavigationBar() {
  const dark = theme.value === "dark";
  uni.setNavigationBarColor({
    frontColor: dark ? "#ffffff" : "#000000",
    backgroundColor: dark ? "#141416" : "#ffffff"
  });
  applyWindowBackground(theme.value);
}

export function initTheme() {
  const stored = uni.getStorageSync(THEME_STORAGE_KEY);
  theme.value = stored === "dark" ? "dark" : "light";
  applyTheme(theme.value);
  applyNavigationBar();
}

export function setTheme(mode: ThemeMode) {
  theme.value = mode;
  uni.setStorageSync(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
  applyNavigationBar();
}

export function useTheme() {
  return {
    theme,
    themeClass,
    setTheme,
    toggleTheme: () => setTheme(theme.value === "dark" ? "light" : "dark")
  };
}
