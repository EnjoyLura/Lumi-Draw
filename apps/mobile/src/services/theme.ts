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
  let savedTheme: unknown;
  try {
    savedTheme = uni.getStorageSync(THEME_STORAGE_KEY);
  } catch {
    savedTheme = undefined;
  }
  applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light");
}

export function setTheme(mode: ThemeMode) {
  applyTheme(mode);
  try {
    uni.setStorageSync(THEME_STORAGE_KEY, mode);
  } catch {
    // Theme still applies for the current session when storage is unavailable.
  }
  applyNavigationBar();
  syncHiddenPageThemes(mode);
}

function syncHiddenPageThemes(mode: ThemeMode) {
  try {
    const pages = getCurrentPages() as Array<{
      setData?: (data: Record<string, unknown>) => void;
      $vm?: { $forceUpdate?: () => void };
    }>;
    pages.slice(0, -1).forEach((page) => {
      page.$vm?.$forceUpdate?.();
      page.setData?.({ __lumiThemeRevision: `${mode}-${Date.now()}` });
    });
    setTimeout(() => {
      pages.slice(0, -1).forEach((page) => page.$vm?.$forceUpdate?.());
    }, 16);
  } catch {
    // A single-page runtime has no hidden page stack to synchronize.
  }
}

export function useTheme() {
  return {
    theme,
    themeClass,
    setTheme
  };
}
