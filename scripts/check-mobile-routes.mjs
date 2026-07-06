import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MOBILE_SRC = path.join(ROOT, "apps", "mobile", "src");
const pagesJsonPath = path.join(MOBILE_SRC, "pages.json");
const pagesRoot = path.join(MOBILE_SRC, "pages");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function walk(dir, output = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, output);
    else if (/\.(vue|ts)$/.test(entry.name)) output.push(fullPath);
  }
  return output;
}

function normalizeRoute(route) {
  return route.split("?")[0].replace(/\/+$/, "");
}

const pageRoutes = readJson(pagesJsonPath).pages.map((page) => `/${page.path}`);
const registered = new Set(pageRoutes.map(normalizeRoute));
const errors = [];

for (const route of pageRoutes) {
  const file = path.join(MOBILE_SRC, `${route.slice(1)}.vue`);
  if (!existsSync(file)) errors.push(`Registered page is missing: ${route} -> ${path.relative(ROOT, file)}`);
}

const routeLiteralPattern = /(['"`])(\/pages\/[^'"`)\s]+)\1/g;
for (const file of walk(pagesRoot)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(routeLiteralPattern)) {
    const route = normalizeRoute(match[2]);
    if (!registered.has(route)) {
      errors.push(`Unknown mobile route in ${path.relative(ROOT, file)}: ${match[2]}`);
    }
  }
}

if (errors.length) {
  console.error(["Mobile route check failed:", ...errors.map((item) => `- ${item}`)].join("\n"));
  process.exit(1);
}

console.log(`Mobile route check passed (${registered.size} registered pages).`);
