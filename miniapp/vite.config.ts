import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

function copyDirRecursive(src: string, dest: string) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(src)) {
    const s = join(src, file);
    const d = join(dest, file);
    if (statSync(s).isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

export default defineConfig({
  plugins: [
    uni(),
    {
      name: "copy-static",
      closeBundle() {
        copyDirRecursive("static", "dist/build/h5/static");
      },
    },
  ],
});
