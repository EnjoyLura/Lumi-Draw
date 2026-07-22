import { parseQueryString } from "./routeQuery";

export function refreshNavigationTitle(title: string) {
  uni.setNavigationBarTitle({ title });

  if (typeof document === "undefined") return;
  document.title = title;
  setTimeout(() => {
    const titleElement = document.querySelector(".uni-page-head__title");
    if (titleElement && titleElement.textContent !== title) titleElement.textContent = title;
  }, 0);
}

const STATIC_PAGE_TITLES: Record<string, string> = {
  "pages/home/index": "露米绘画",
  "pages/create/index": "创作",
  "pages/plaza/index": "广场",
  "pages/gallery/index": "画廊",
  "pages/generation-history/index": "生成记录",
  "pages/mine/index": "我的",
  "pages/all-gameplays/index": "全部玩法",
  "pages/search/index": "搜索",
  "pages/reverse-prompt/index": "反推提示词",
  "pages/work-detail/index": "作品详情",
  "pages/report/index": "举报",
  "pages/user-profile/index": "用户主页",
  "pages/recharge/index": "积分充值",
  "pages/checkin/index": "每日签到",
  "pages/invite/index": "邀请好友",
  "pages/membership/index": "会员中心",
  "pages/messages/index": "消息",
  "pages/settings/index": "设置",
  "pages/edit-profile/index": "编辑资料",
  "pages/feedback/index": "意见反馈",
  "pages/changelog/index": "更新日志",
  "pages/publish/index": "发布作品",
  "pages/edit-work/index": "编辑作品",
  "pages/drafts/index": "画廊",
  "pages/history/index": "浏览记录"
};

const MESSAGE_TITLES: Record<string, string> = {
  like: "点赞",
  favorite: "收藏",
  remake: "同款",
  follow: "关注",
  system: "系统通知",
  service: "客服消息"
};

const AGREEMENT_TITLES: Record<string, string> = {
  user: "用户协议",
  privacy: "隐私政策",
  recharge: "充值协议",
  membership: "会员服务协议"
};

function readCurrentRoute() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        route?: string;
        options?: Record<string, string>;
        $page?: { options?: Record<string, string>; fullPath?: string };
      }
    | undefined;

  let route = current?.route || "";
  const options: Record<string, string> = { ...(current?.options || {}), ...(current?.$page?.options || {}) };

  if (typeof window !== "undefined") {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const [hashRoute, query = ""] = hash.split("?");
    route = hashRoute || route;
    Object.entries(parseQueryString(query)).forEach(([key, value]) => {
      options[key] = value;
    });
  }

  return { route: route.replace(/^\/+/, ""), options };
}

function titleForRoute(route: string, options: Record<string, string>) {
  if (route === "pages/message-detail/index") return MESSAGE_TITLES[options.type || ""] || "消息详情";
  if (route === "pages/follow-list/index") return options.type === "followers" ? "我的粉丝" : "我的关注";
  if (route === "pages/agreement/index") return AGREEMENT_TITLES[options.type || ""] || "协议详情";
  return STATIC_PAGE_TITLES[route] || "";
}

export function syncCurrentPageNavigationTitle() {
  const { route, options } = readCurrentRoute();
  const title = titleForRoute(route, options);
  if (title) refreshNavigationTitle(title);
}

export function getCurrentPageTitle() {
  const { route, options } = readCurrentRoute();
  return titleForRoute(route, options);
}

let titleSyncStarted = false;

export function initNavigationTitleSync() {
  if (titleSyncStarted) return;
  titleSyncStarted = true;

  const syncSoon = () => {
    setTimeout(syncCurrentPageNavigationTitle, 0);
    setTimeout(syncCurrentPageNavigationTitle, 80);
  };

  syncSoon();

  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", syncSoon);
  window.addEventListener("popstate", syncSoon);
}
