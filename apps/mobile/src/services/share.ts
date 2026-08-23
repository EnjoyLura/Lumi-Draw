const DEFAULT_SHARE_TITLE = "露米绘画AI｜发现灵感，轻松创作";
const DEFAULT_SHARE_PATH = "/pages/home/index";

interface SharePageInstance {
  route?: string;
  options?: Record<string, string>;
  $page?: { options?: Record<string, string> };
}

function currentShareTarget() {
  const pages = getCurrentPages() as SharePageInstance[];
  const current = pages[pages.length - 1];
  const route = current?.route?.replace(/^\/+/, "") || DEFAULT_SHARE_PATH.replace(/^\/+/, "");
  const options = { ...(current?.options || {}), ...(current?.$page?.options || {}) };
  const query = Object.entries(options)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return { route, query, path: `/${route}${query ? `?${query}` : ""}` };
}

export function showGlobalShareMenu() {
  uni.showShareMenu({
    menus: ["shareAppMessage", "shareTimeline"]
  });
}

export function defaultShareAppMessage() {
  return {
    title: DEFAULT_SHARE_TITLE,
    path: currentShareTarget().path
  };
}

export function defaultShareTimeline() {
  const target = currentShareTarget();
  return {
    title: DEFAULT_SHARE_TITLE,
    query: target.query
  };
}

export function defaultCopyUrl() {
  return { query: currentShareTarget().query };
}
