import { createSSRApp } from "vue";
import App from "./App.vue";
import { applyNavigationBar } from "./services/theme";
import { playPageEnter } from "./services/pageTransition";

export function createApp() {
  const app = createSSRApp(App);
  app.mixin({
    onShow() {
      applyNavigationBar();
      const route = (this as { $page?: { route?: string } }).$page?.route;
      if (route) {
        playPageEnter(route);
      }
    }
  });
  return {
    app
  };
}
