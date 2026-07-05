import { defineConfig } from "vite";
import uniPlugin from "@dcloudio/vite-plugin-uni";

const uni = typeof uniPlugin === "function" ? uniPlugin : (uniPlugin as { default: typeof uniPlugin }).default;

export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      "/api": {
        target: process.env.LUMI_DEV_API_TARGET || "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
});
