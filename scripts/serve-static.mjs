import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , rootArg, portArg] = process.argv;

if (!rootArg || !portArg) {
  console.error("Usage: node scripts/serve-static.mjs <root> <port>");
  process.exit(1);
}

const cwd = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(cwd, "..", rootArg);
const port = Number(portArg);

const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".eot", "application/vnd.ms-fontobject"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function resolveFile(url = "/") {
  const pathname = decodeURIComponent(url.split("?")[0] || "/");
  const requested = path.resolve(root, `.${pathname}`);
  const safePath = requested.startsWith(root) ? requested : root;
  if (existsSync(safePath) && statSync(safePath).isFile()) return safePath;
  if (existsSync(safePath) && statSync(safePath).isDirectory()) {
    const index = path.join(safePath, "index.html");
    if (existsSync(index)) return index;
  }
  return path.join(root, "index.html");
}

createServer((req, res) => {
  const file = resolveFile(req.url);
  const ext = path.extname(file);
  res.setHeader("Content-Type", types.get(ext) || "application/octet-stream");
  createReadStream(file)
    .on("error", () => {
      res.writeHead(404);
      res.end("Not found");
    })
    .pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});
