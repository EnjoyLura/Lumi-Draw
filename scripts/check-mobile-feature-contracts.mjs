import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MOBILE_SRC = path.join(ROOT, "apps", "mobile", "src");
const PAGES_JSON = path.join(MOBILE_SRC, "pages.json");

function readText(file) {
  return readFileSync(file, "utf8");
}

function collectSourceFiles(dir, result = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, result);
    } else if (/\.(ts|tsx|vue)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

function routeToFile(route) {
  return path.join(MOBILE_SRC, `${route}.vue`);
}

function assertIncludes(source, token, context, errors) {
  if (!source.includes(token)) errors.push(`${context} missing token: ${token}`);
}

function parsePages() {
  const json = JSON.parse(readText(PAGES_JSON));
  return json.pages.map((page) => page.path);
}

const pageContracts = [
  {
    route: "pages/home/index",
    tokens: ["useDataMode", "fetchHomeBootstrap", "fetchHomeFeed", "toggleWorkLike", "savePendingInviteCode", "fetchUnreadMessageCount"]
  },
  {
    route: "pages/create/index",
    tokens: [
      "useDataMode",
      "requireLogin",
      "fetchCreateConfig",
      "createGenerateJob",
      "fetchGenerateJob",
      "publishGenerateResult",
      "uploadChosenImage",
      "uploadRemoteImage",
      "resumeBackendJob",
      "jobId",
      "hasAutoSavedDrafts",
      "savedDraftCount",
      "生成作品已自动保存为草稿",
      "已存草稿",
      "goPublish"
    ]
  },
  {
    route: "pages/plaza/index",
    tokens: [
      "useDataMode",
      "fetchPlazaWorks",
      "fetchFavorites",
      "toggleWorkFavorite",
      "toggleWorkLike",
      "LumiSideDrawer",
      "fetchUnreadMessageCount"
    ]
  },
  {
    route: "pages/gallery/index",
    tokens: [
      "useDataMode",
      "fetchGalleryWorks",
      "fetchGalleryGenerateTasks",
      "fetchGalleryTerminalGenerateJobs",
      "deleteGalleryWorks",
      "moveGalleryWorksToDraft",
      "LumiSideDrawer",
      "生成完成",
      "生成的作品已自动保存到草稿箱",
      "去创作页",
      "goCreate"
    ]
  },
  {
    route: "pages/generation-history/index",
    tokens: ["useDataMode", "fetchGenerateHistoryJobs", "retryGenerateJob", "cancelGenerateJob", "addActiveGenerateJobId"]
  },
  {
    route: "pages/mine/index",
    tokens: ["useDataMode", "fetchMineProfile", "fetchUnreadMessageCount", "updateCurrentUser"]
  },
  {
    route: "pages/all-gameplays/index",
    tokens: ["useDataMode", "fetchHomeBootstrap", "applyGameplay"]
  },
  {
    route: "pages/search/index",
    tokens: ["useDataMode", "fetchHotSearches", "searchWorks", "SEARCH_HISTORY_KEY", "handleReachBottom"]
  },
  {
    route: "pages/reverse-prompt/index",
    tokens: ["useDataMode", "requireLogin", "uploadChosenImage", "reversePrompt", "lumiCreatePromptDraft"]
  },
  {
    route: "pages/work-detail/index",
    tokens: [
      "useDataMode",
      "fetchWorkDetail",
      "fetchWorkState",
      "recordWorkView",
      "toggleWorkLike",
      "toggleWorkFavorite",
      "followUser",
      "unfollowUser",
      "recordWorkRemake",
      "moveWorkToDraft",
      "deleteWork",
      "resolveRouteId"
    ]
  },
  {
    route: "pages/report/index",
    tokens: ["useDataMode", "requireLogin", "submitWorkReport", "resolveRouteWorkId"]
  },
  {
    route: "pages/user-profile/index",
    tokens: ["useDataMode", "fetchUserProfile", "fetchUserWorks", "followUser", "unfollowUser", "toggleWorkLike", "resolveRouteId"]
  },
  {
    route: "pages/recharge/index",
    tokens: ["useDataMode", "fetchCreditsBalance", "fetchCreditRecordPage", "fetchRechargeTiers", "createRechargeOrder", "requestOrderPayment"]
  },
  {
    route: "pages/checkin/index",
    tokens: ["useDataMode", "fetchCheckinStatus", "submitCheckin", "updateCurrentUser"]
  },
  {
    route: "pages/invite/index",
    tokens: ["useDataMode", "fetchInviteSummary", "copyInviteCode", "shareInvite"]
  },
  {
    route: "pages/membership/index",
    tokens: ["useDataMode", "fetchMemberPlans", "fetchMemberStatus", "createMembershipOrder", "requestOrderPayment"]
  },
  {
    route: "pages/messages/index",
    tokens: ["useDataMode", "fetchMessageSummary", "openCategory"]
  },
  {
    route: "pages/message-detail/index",
    tokens: ["useDataMode", "fetchMessageList", "markMessageCategoryRead", "resolveRouteType", "hashchange"]
  },
  {
    route: "pages/settings/index",
    tokens: ["useDataMode", "setUseMockData", "fetchSettingsProfile", "updateSettingsPhone", "fetchChangelog", "logout"]
  },
  {
    route: "pages/agreement/index",
    tokens: ["useDataMode", "fetchAgreement", "resolveRouteType", "hashchange"]
  },
  {
    route: "pages/edit-profile/index",
    tokens: ["useDataMode", "fetchMyProfile", "updateMyProfile", "uploadChosenImage"]
  },
  {
    route: "pages/feedback/index",
    tokens: ["useDataMode", "submitFeedback", "uploadChosenImage", "resolveRouteSource"]
  },
  {
    route: "pages/changelog/index",
    tokens: ["useDataMode", "fetchChangelog"]
  },
  {
    route: "pages/publish/index",
    tokens: ["useDataMode", "fetchPublishDrafts", "publishWork", "uploadChosenImage", "resolveRouteDraftId"]
  },
  {
    route: "pages/edit-work/index",
    tokens: ["useDataMode", "fetchEditableWork", "updateEditableWork", "resolveRouteId"]
  },
  {
    route: "pages/drafts/index",
    tokens: ["useDataMode", "fetchGalleryWorks", "fetchGalleryUser", "loginRequired", "生成完成的作品会自动保存为草稿", "goCreate"]
  },
  {
    route: "pages/history/index",
    tokens: ["useDataMode", "fetchHistory", "clearRemoteHistory", "loginRequired"]
  },
  {
    route: "pages/follow-list/index",
    tokens: ["useDataMode", "fetchFollowList", "followUser", "unfollowUser", "resolveRouteType", "loginRequired"]
  }
];

const apiPathContracts = [
  "/auth/wechat/login",
  "/auth/refresh",
  "/auth/logout",
  "/app/bootstrap",
  "/works/feed",
  "/works/plaza",
  "/works/search",
  "/works/me/gallery",
  "/works/me/drafts",
  "/works",
  "/generate/jobs",
  "/generate/reverse-prompt",
  "/generate/results/",
  "/social/works/",
  "/social/users/",
  "/social/follows",
  "/social/history",
  "/social/favorites",
  "/credits/balance",
  "/credits/records",
  "/checkin/status",
  "/checkin",
  "/invite/summary",
  "/invite/bind",
  "/membership/plans",
  "/membership/status",
  "/payments/recharge/orders",
  "/payments/membership/orders",
  "/notifications/summary",
  "/notifications/",
  "/feedback",
  "/uploads/policy",
  "/uploads/complete",
  "/config/hot-searches",
  "/config/changelog",
  "/config/agreements/"
];

function main() {
  const errors = [];
  const registeredRoutes = new Set(parsePages());
  const contractRoutes = new Set(pageContracts.map((item) => item.route));

  for (const route of registeredRoutes) {
    if (!contractRoutes.has(route)) errors.push(`registered page has no feature contract: ${route}`);
  }

  for (const contract of pageContracts) {
    if (!registeredRoutes.has(contract.route)) errors.push(`feature contract route is not registered: ${contract.route}`);

    const file = routeToFile(contract.route);
    if (!existsSync(file)) {
      errors.push(`feature contract page file is missing: ${contract.route}`);
      continue;
    }

    const source = readText(file);
    for (const token of contract.tokens) {
      assertIncludes(source, token, contract.route, errors);
    }

    assertIncludes(source, "useDataMode", contract.route, errors);
  }

  const allMobileSource = collectSourceFiles(MOBILE_SRC)
    .map((file) => readText(file))
    .join("\n");

  for (const apiPath of apiPathContracts) {
    assertIncludes(allMobileSource, apiPath, "mobile api contract", errors);
  }

  if (errors.length) {
    console.error(["Mobile feature contract check failed:", ...errors.map((item) => `- ${item}`)].join("\n"));
    process.exit(1);
  }

  console.log(`Mobile feature contract check passed (${pageContracts.length} pages, ${apiPathContracts.length} API paths).`);
}

main();
