import { openEmbeddedCreate, setEmbeddedPrimaryTab } from "./primaryShell";
import { parseQueryString } from "./routeQuery";

const TAB_ROUTES = new Set([
  "/pages/home/index",
  "/pages/create/index",
  "/pages/plaza/index",
  "/pages/gallery/index",
  "/pages/mine/index"
]);

let navigating = false;

function normalizeRoute(route: string) {
  if (!route) return "";
  return route.startsWith("/") ? route : `/${route}`;
}

function readQuery(url: string) {
  const queryString = url.split("?")[1] || "";
  return parseQueryString(queryString);
}

function currentRoute() {
  try {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    return normalizeRoute(current?.route ?? "");
  } catch {
    return "";
  }
}

function activatePrimaryTarget(target: string, url: string) {
  if (target === "/pages/home/index") setEmbeddedPrimaryTab("home");
  else if (target === "/pages/create/index") openEmbeddedCreate(readQuery(url));
  else if (target === "/pages/plaza/index") setEmbeddedPrimaryTab("plaza");
  else if (target === "/pages/gallery/index") setEmbeddedPrimaryTab("gallery");
  else if (target === "/pages/mine/index") setEmbeddedPrimaryTab("mine");
}

export function goRootTab(url: string) {
  const target = normalizeRoute(url.split("?")[0]);
  if (!TAB_ROUTES.has(target)) return;
  const current = currentRoute();
  if (current === "/pages/home/index") {
    activatePrimaryTarget(target, url);
    return;
  }
  if (current === target || navigating) return;

  activatePrimaryTarget(target, url);
  navigating = true;
  uni.reLaunch({
    url: "/pages/home/index",
    complete() {
      setTimeout(() => {
        navigating = false;
      }, 240);
    }
  });
}
