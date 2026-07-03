import { defineConfig } from "vite";
import uniPlugin from "@dcloudio/vite-plugin-uni";

const uni = typeof uniPlugin === "function" ? uniPlugin : (uniPlugin as { default: typeof uniPlugin }).default;

export default defineConfig({
  plugins: [uni()]
});
