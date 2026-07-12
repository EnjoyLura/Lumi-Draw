import { createSSRApp } from "vue";
import App from "./App.vue";
import LumiDeferredPageContent from "./components/LumiDeferredPageContent.vue";
import LumiIcon from "./components/LumiIcon.vue";
import { syncCurrentPageNavigationTitle } from "./services/navigationTitle";
import { applyNavigationBar, applyPageBackground, initTheme } from "./services/theme";

export function createApp() {
  initTheme();
  const app = createSSRApp(App);
  app.component("LumiDeferredPageContent", LumiDeferredPageContent);
  app.component("LumiIcon", LumiIcon);
  app.mixin({
    onLoad() {
      applyPageBackground();
    },
    onShow() {
      applyNavigationBar();
      syncCurrentPageNavigationTitle();
    }
  });
  return {
    app
  };
}
