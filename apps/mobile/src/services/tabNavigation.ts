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
  if (currentRoute() === target || navigating) return;

  navigating = true;
  uni.redirectTo({
    url,
    complete() {
      setTimeout(() => {
        navigating = false;
      }, 240);
    }
  });
}
