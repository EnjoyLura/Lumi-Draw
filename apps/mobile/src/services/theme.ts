import { computed, ref } from "vue";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "lumi-theme";
const THEME_BACKGROUNDS: Record<ThemeMode, string> = {
  light: "#eef4fc",
  dark: "#141416"
};
const theme = ref<ThemeMode>("light");
const themeClass = computed(() => `theme-${theme.value}`);

export function applyPageBackground(mode: ThemeMode = theme.value) {
  const backgroundColor = THEME_BACKGROUNDS[mode];
  // #ifdef H5
  document.documentElement.style.backgroundColor = backgroundColor;
  document.body.style.backgroundColor = backgroundColor;
  // #endif

  const setBackgroundColor = (uni as UniApp.Uni & {
    setBackgroundColor?: (options: { backgroundColor: string; backgroundColorTop?: string; backgroundColorBottom?: string }) => void;
  }).setBackgroundColor;
  setBackgroundColor?.({
    backgroundColor,
    backgroundColorTop: backgroundColor,
    backgroundColorBottom: backgroundColor
  });
}

function applyTheme(mode: ThemeMode) {
  // #ifdef H5
  document.documentElement.setAttribute("data-theme", mode);
  // #endif
  applyPageBackground(mode);
}

export function applyNavigationBar() {
  const dark = theme.value === "dark";
  applyPageBackground(theme.value);
  uni.setNavigationBarColor({
    frontColor: dark ? "#ffffff" : "#000000",
    backgroundColor: THEME_BACKGROUNDS[theme.value]
  });
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
