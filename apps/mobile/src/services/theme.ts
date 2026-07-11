import { computed, ref } from "vue";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "lumi-theme";
const THEME_BACKGROUNDS: Record<ThemeMode, string> = {
  light: "#eef4fc",
  dark: "#141416"
};
const theme = ref<ThemeMode>("light");
const themeClass = computed(() => `theme-${theme.value}`);
let themeListenerInitialized = false;

type ThemeRuntime = UniApp.Uni & {
  onThemeChange?: (callback: (result: { theme: ThemeMode }) => void) => void;
};

function normalizeTheme(value: unknown): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

function readSystemTheme(): ThemeMode {
  // #ifdef H5
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  // #endif
  try {
    return normalizeTheme((uni.getSystemInfoSync() as UniApp.GetSystemInfoResult & { theme?: ThemeMode }).theme);
  } catch {
    return "light";
  }
}

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
  theme.value = mode;
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
  uni.removeStorageSync(THEME_STORAGE_KEY);
  applyTheme(readSystemTheme());
  if (themeListenerInitialized) return;
  themeListenerInitialized = true;

  // #ifdef H5
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    applyTheme(event.matches ? "dark" : "light");
    applyNavigationBar();
  });
  // #endif

  (uni as ThemeRuntime).onThemeChange?.((result) => {
    applyTheme(normalizeTheme(result.theme));
    applyNavigationBar();
  });
}

export function useTheme() {
  return {
    theme,
    themeClass
  };
}
