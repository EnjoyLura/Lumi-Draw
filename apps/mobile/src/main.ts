import { createSSRApp } from "vue";
import App from "./App.vue";
import { syncCurrentPageNavigationTitle } from "./services/navigationTitle";
import { applyNavigationBar, applyPageBackground, initTheme } from "./services/theme";
import { warmupNextWebview } from "./services/webviewWarmup";

const TAB_PAGE_ROUTES = new Set(["pages/home/index", "pages/plaza/index", "pages/gallery/index", "pages/mine/index"]);

function isTabPage() {
  const current = getCurrentPages()[getCurrentPages().length - 1];
  return TAB_PAGE_ROUTES.has(current?.route ?? "");
}

export function createApp() {
  initTheme();
  const app = createSSRApp(App);
  app.mixin({
    onLoad() {
      applyPageBackground();
    },
    onReady() {
      warmupNextWebview();
    },
    onShow() {
      applyNavigationBar();
      syncCurrentPageNavigationTitle();
      // #ifdef MP-WEIXIN
      if (isTabPage()) uni.hideTabBar({ animation: false, fail: () => undefined });
      // #endif
    }
  });
  return {
    app
  };
}
