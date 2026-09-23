import { defineConfig } from "vite";
import uniPlugin from "@dcloudio/vite-plugin-uni";

const uni = typeof uniPlugin === "function" ? uniPlugin : (uniPlugin as { default: typeof uniPlugin }).default;

export default defineConfig({
  plugins: [uni()],
  build: {
    minify: "terser",
    terserOptions: {
      compress: { drop_console: false },
      // 微信开发者工具的 es6→es5 转译会把块级 const 提升为函数级 var，
      // 与顶层 import 的压缩短名重名时会让调用读到 undefined，因此保留原始标识符。
      mangle: false
    }
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.LUMI_DEV_API_TARGET || "http://127.0.0.1:3000",
        changeOrigin: true,
        headers: {
          Origin: "https://ejoyflie.cloud"
        }
      }
    }
  }
});
