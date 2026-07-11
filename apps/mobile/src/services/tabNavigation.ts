import { openEmbeddedSecondaryPage, setEmbeddedPrimaryTab } from "./primaryShell";

const TAB_ROUTES = new Set([
  "/pages/home/index",
  "/pages/plaza/index",
  "/pages/gallery/index",
  "/pages/mine/index"
]);

let navigating = false;

function normalizeRoute(route: string) {
  if (!route) return "";
  return route.startsWith("/") ? route : `/${route}`;
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

export function goRootTab(url: string) {
  const target = normalizeRoute(url.split("?")[0]);
  if (!TAB_ROUTES.has(target)) return;
  const current = currentRoute();
  if (current === "/pages/home/index") {
    if (target === "/pages/home/index") {
      setEmbeddedPrimaryTab("home");
      return;
    }
    if (target === "/pages/plaza/index") {
      setEmbeddedPrimaryTab("plaza");
      return;
    }
    if (target === "/pages/gallery/index") {
      setEmbeddedPrimaryTab("gallery");
      return;
    }
    if (target === "/pages/mine/index") {
      setEmbeddedPrimaryTab("mine");
      return;
    }
  }
  if (current === target || navigating) return;

  navigating = true;
  uni.switchTab({
    url,
    complete() {
      setTimeout(() => {
        navigating = false;
      }, 240);
    }
  });
}
export function openSecondaryPage(url: string) {
  const target = normalizeRoute(url.split("?")[0]);
  if (currentRoute() !== "/pages/home/index") return false;

  if (target === "/pages/recharge/index") {
    openEmbeddedSecondaryPage("recharge");
    return true;
  }
  if (target === "/pages/checkin/index") {
    openEmbeddedSecondaryPage("checkin");
    return true;
  }
  return false;
}
