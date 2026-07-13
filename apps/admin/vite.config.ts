import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.LUMI_ADMIN_BASE || "/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174,
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
