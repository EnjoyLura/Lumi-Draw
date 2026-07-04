import { createSSRApp } from "vue";
import App from "./App.vue";
import { applyNavigationBar } from "./services/theme";

export function createApp() {
  const app = createSSRApp(App);
  app.mixin({
    onShow() {
      applyNavigationBar();
    }
  });
  return {
    app
  };
}
