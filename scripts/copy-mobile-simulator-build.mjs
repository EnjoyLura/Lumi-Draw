import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "apps", "mobile", "dist", "build", "mp-weixin");
const target = path.join(root, "apps", "mobile", "dist", "build", "mp-weixin-simulator");

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
