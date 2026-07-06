import { createSSRApp } from "vue";
import App from "./App.vue";
import { syncCurrentPageNavigationTitle } from "./services/navigationTitle";
import { applyNavigationBar } from "./services/theme";

export function createApp() {
  const app = createSSRApp(App);
  app.mixin({
    onShow() {
      applyNavigationBar();
      syncCurrentPageNavigationTitle();
    }
  });
  return {
    app
  };
}
