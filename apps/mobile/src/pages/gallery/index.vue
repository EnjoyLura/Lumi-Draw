<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import LumiSideDrawer from "../../components/LumiSideDrawer.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { useTheme } from "../../services/theme";
import { fetchFavorites, toHomeUser as toFavoriteUser, toHomeWork as toFavoriteWork } from "../../services/social";
import { goRootTab } from "../../services/tabNavigation";
import { activeEmbeddedPrimaryTab, openEmbeddedCreate } from "../../services/primaryShell";
import { reportPageNavigationPerformance } from "../../services/pagePerformance";
import { fetchUnreadMessageCount } from "../mine/mineService";
import {
  addNotifiedGenerateJobIds,
  readActiveGenerateJobIds,
  readNotifiedGenerateJobIds,
  removeActiveGenerateJobIds,
  syncActiveGenerateJobIds
} from "../../services/generateTaskState";
import { homeUsers, homeWorks, type HomeUser, type HomeWork } from "../home/homeData";
import { createModels } from "../create/createData";
import { fetchCreateConfig } from "../create/createService";
import { galleryGenTasks, galleryUser, galleryWorks, type GalleryGenTask, type GalleryTab, type GalleryUser } from "./galleryData";
import {
  deleteGalleryWorks,
  fetchGalleryGenerateTasks,
  fetchGalleryTerminalGenerateJobs,
  fetchGalleryUser,
  fetchGalleryWorks,
  moveGalleryWorksToDraft
} from "./galleryService";
import {
  getWaterfallAnimationClass,
  getWaterfallDirection,
  WATERFALL_ANIMATION_DURATION,
  WATERFALL_LOADING_FRAME_DELAY,
  WATERFALL_SWITCH_DELAY
} from "../../services/waterfallTransition";

const PAGE_SIZE = 10;
const props = withDefaults(defineProps<{ pageMode?: "gallery" | "mine" }>(), { pageMode: "gallery" });
const isMineMode = computed(() => props.pageMode === "mine");
const workspaceTabs = computed(() =>
  isMineMode.value
    ? ([{ key: "all", label: "全部" }, { key: "published", label: "已发布" }, { key: "favorite", label: "收藏" }] as const)
    : ([{ key: "draft", label: "草稿箱" }] as const)
);
const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();

const EMPTY_PROFILE: GalleryUser = {
  id: 0,
  name: "未同步资料",
  avatar: "U",
  color: "var(--accent)",
  points: "0",
  userNo: "-",
  bio: "资料加载完成后显示真实信息",
  role: "创作者",
  works: 0,
  followers: "0",
  following: "0",
  likes: "0",
  gender: "unknown"
};

type SideQuick = {
  icon: string;
  label: string;
  url: string;
  gradient: string;
};

type SideRow = {
  icon: string;
  label: string;
  url: string;
  color: string;
  badge?: string;
};

const statusBarHeight = ref(0);
const navInviteRight = ref(100);
try {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight ?? 0;
  const getMenuRect = (uni as UniApp.Uni & { getMenuButtonBoundingClientRect?: () => { left: number } }).getMenuButtonBoundingClientRect;
  const menuRect = getMenuRect?.();
  if (menuRect?.left && systemInfo.windowWidth) navInviteRight.value = systemInfo.windowWidth - menuRect.left + 8;
} catch {
  statusBarHeight.value = 0;
}

const activeTab = ref<GalleryTab>("all");
const renderedTab = ref<GalleryTab>("all");
const works = ref<HomeWork[]>(useMockData.value ? galleryWorks : []);
const profile = ref(useMockData.value ? galleryUser : EMPTY_PROFILE);
const genTasks = ref<GalleryGenTask[]>(useMockData.value ? galleryGenTasks : []);
const manageMode = ref(false);
const selectedIds = ref<Set<number>>(new Set());
const isLoading = ref(!useMockData.value && isLoggedIn.value);
const isPageRequesting = ref(false);
const isLoadingMore = ref(false);
const sideOpen = ref(false);
const showLoginSheet = ref(false);
const isInitialContentReady = ref(false);
const sideDrawerMounted = ref(false);
const loginSheetMounted = ref(false);
const filterOpen = ref(false);
const selectedModel = ref("all");
const selectedStatus = ref("all");
const sortDescending = ref(true);
const unreadMessageCount = ref(0);
const availableModels = ref<string[]>(useMockData.value ? createModels.map((model) => model.name) : []);
const workAuthors = ref<HomeUser[]>(useMockData.value ? homeUsers : []);
const visibleCount = ref(PAGE_SIZE);
const renderKey = ref(0);
const waterfallAnimationClass = ref("");
const { themeClass } = useTheme();
const pageState = reactive({ page: 1, hasMore: false });
const sideQuickActions: SideQuick[] = [
  { icon: "◇", label: "充值", url: "/pages/recharge/index", gradient: "linear-gradient(135deg,#a8d8f8,#b0e6d0)" },
  { icon: "◷", label: "签到", url: "/pages/checkin/index", gradient: "linear-gradient(135deg,#ffd4c8,#ffc8d6)" },
  { icon: "♕", label: "会员", url: "/pages/membership/index", gradient: "linear-gradient(135deg,#d4c8f0,#b8a8e0)" },
  { icon: "↗", label: "邀请", url: "/pages/invite/index", gradient: "linear-gradient(135deg,#a3e4cc,#8bd8b8)" }
];
const sideRows = ref<SideRow[]>([
  { icon: "✦", label: "发布作品", url: "/pages/publish/index", color: "var(--accent)" },
  { icon: "◎", label: "生成记录", url: "/pages/generation-history/index", color: "var(--lavender)" },
  { icon: "◷", label: "浏览记录", url: "/pages/history/index", color: "var(--mint)" },
  { icon: "✉", label: "消息中心", url: "/pages/messages/index", color: "var(--rose)", badge: "5" },
  { icon: "♥", label: "我的关注", url: "/pages/follow-list/index?type=following", color: "var(--peach)" },
  { icon: "☺", label: "我的粉丝", url: "/pages/follow-list/index?type=followers", color: "var(--lemon)" }
]);

let loadingTimer: ReturnType<typeof setTimeout> | undefined;
let loadMoreTimer: ReturnType<typeof setTimeout> | undefined;
let genTaskTimer: ReturnType<typeof setTimeout> | undefined;
let waterfallAnimationTimer: ReturnType<typeof setTimeout> | undefined;
let initialContentTimer: ReturnType<typeof setTimeout> | undefined;
let lastLoadKey = useMockData.value ? `${useMockData.value}-${isLoggedIn.value}` : "";
let lastLoadedAt = 0;
let activeGenerateTaskIds = readActiveGenerateJobIds();

const modelOptions = computed(() => availableModels.value);
const filteredWorks = computed(() => {
  let result = useMockData.value && renderedTab.value === "favorite"
    ? homeWorks.filter((work) => [1, 2, 4].includes(work.id)).map((work) => ({ ...work, favorited: true }))
    : works.value;
  if (renderedTab.value === "published") result = result.filter((work) => work.published);
  if (renderedTab.value === "draft") result = result.filter((work) => !work.published);
  if (renderedTab.value === "favorite") {
    result = result.filter((work) => work.favorited || work.liked || (useMockData.value && [3, 11].includes(work.id)));
  }
  if (selectedModel.value !== "all") result = result.filter((work) => (work.modelName || "未标注模型") === selectedModel.value);
  if (selectedStatus.value === "published") result = result.filter((work) => work.published);
  if (selectedStatus.value === "draft") result = result.filter((work) => !work.published);
  if (selectedStatus.value === "pending") result = result.filter((work) => work.status === "pending");
  return [...result].sort((a, b) => {
    const diff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    return sortDescending.value ? diff : -diff;
  });
});

const displayedWorks = computed(() => filteredWorks.value.slice(0, visibleCount.value));
const leftColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 1));
const hasMore = computed(() => visibleCount.value < filteredWorks.value.length || (!useMockData.value && pageState.hasMore));
const isWaterfallSwitching = computed(() => activeTab.value !== renderedTab.value);
const selectedCount = computed(() => selectedIds.value.size);
const selectedWorks = computed(() => works.value.filter((work) => selectedIds.value.has(work.id)));
const selectedPublishedWorks = computed(() => selectedWorks.value.filter((work) => work.published));
const canMoveSelectedToDraft = computed(() => selectedPublishedWorks.value.length > 0);
const allCurrentSelected = computed(() => displayedWorks.value.length > 0 && displayedWorks.value.every((work) => selectedIds.value.has(work.id)));
const hasGenderIcon = computed(() => profile.value.gender === "female" || profile.value.gender === "male");
const genderIcon = computed(() => {
  if (profile.value.gender === "female") return "♀";
  if (profile.value.gender === "male") return "♂";
  return "";
});
const emptyInfo = computed(() => {
  if (renderedTab.value === "published") return { icon: "□", title: "暂无已发布作品", sub: "创作完成后点击发布，让更多人看到" };
  if (renderedTab.value === "draft") return { icon: "▤", title: "暂无草稿", sub: "生成的作品会自动保存到草稿箱" };
  if (renderedTab.value === "favorite") return { icon: "♡", title: "暂无收藏", sub: "收藏的优秀作品会显示在这里" };
  return { icon: "□", title: "还没有作品", sub: "去创作页生成你的第一幅AI画作吧" };
});

function refreshGalleryPage() {
  const loadKey = `${useMockData.value}-${isLoggedIn.value}`;
  const changed = lastLoadKey !== loadKey;
  lastLoadKey = loadKey;
  if (changed || Date.now() - lastLoadedAt > 60_000) void reloadGalleryData();
}

function markInitialContentReady() {
  initialContentTimer = setTimeout(() => {
    isInitialContentReady.value = true;
    initialContentTimer = undefined;
    setTimeout(() => reportPageNavigationPerformance("gallery"), 800);
  }, 0);
}

onShow(refreshGalleryPage);

onMounted(() => {
  refreshGalleryPage();
  void loadModelOptions();
  markInitialContentReady();
});
const hasMembership = computed(() => !["创作者", "AI创作者", "体验用户"].includes(profile.value.role));
const membershipTitle = computed(() => (hasMembership.value ? profile.value.role : "未开通 PRO"));
const membershipSubtitle = computed(() => (hasMembership.value ? "会员权益已生效" : "加入 PRO 会员解锁所有权益"));

async function loadModelOptions() {
  if (useMockData.value) {
    availableModels.value = createModels.map((model) => model.name);
    return;
  }
  try {
    const config = await fetchCreateConfig();
    availableModels.value = config.models.map((model) => model.name);
  } catch {
    availableModels.value = Array.from(new Set(works.value.map((work) => work.modelName).filter(Boolean))) as string[];
  }
}

watch(activeEmbeddedPrimaryTab, (tab) => {
  if (tab === props.pageMode) refreshGalleryPage();
});

onBeforeUnmount(() => {
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  if (genTaskTimer) clearTimeout(genTaskTimer);
  if (initialContentTimer) clearTimeout(initialContentTimer);
  clearWaterfallAnimation();
});

function getStatusForTab(tab = renderedTab.value) {
  if (tab === "published") return "published";
  if (tab === "draft") return "draft";
  return undefined;
}

function resetMockGalleryData() {
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  clearWaterfallAnimation();
  isLoading.value = false;
  isLoadingMore.value = false;
  profile.value = galleryUser;
  works.value = galleryWorks;
  genTasks.value = galleryGenTasks;
  syncSideMessageBadge();
  manageMode.value = false;
  selectedIds.value = new Set();
  pageState.page = 1;
  pageState.hasMore = false;
  visibleCount.value = PAGE_SIZE;
  renderKey.value += 1;
}

function resetRealGalleryData() {
  clearWaterfallAnimation();
  profile.value = EMPTY_PROFILE;
  works.value = [];
  genTasks.value = [];
  unreadMessageCount.value = 0;
  workAuthors.value = [];
  syncSideMessageBadge();
  manageMode.value = false;
  selectedIds.value = new Set();
  pageState.page = 1;
  pageState.hasMore = false;
  visibleCount.value = PAGE_SIZE;
  renderKey.value += 1;
}

function syncSideMessageBadge() {
  const messageRow = sideRows.value.find((item) => item.url === "/pages/messages/index");
  if (!messageRow) return;
  messageRow.badge = useMockData.value ? "5" : unreadMessageCount.value > 0 ? String(unreadMessageCount.value) : undefined;
}

async function loadUnreadMessages() {
  if (useMockData.value || !isLoggedIn.value) {
    unreadMessageCount.value = 0;
    syncSideMessageBadge();
    return;
  }
  try {
    unreadMessageCount.value = await fetchUnreadMessageCount();
    syncSideMessageBadge();
  } catch {
    unreadMessageCount.value = 0;
    syncSideMessageBadge();
  }
}

async function loadGenerateTasks(scheduleNext = false) {
  if (useMockData.value || !isLoggedIn.value) {
    if (genTaskTimer) clearTimeout(genTaskTimer);
    activeGenerateTaskIds = new Set();
    return;
  }

  const previousIds = new Set([...activeGenerateTaskIds, ...readActiveGenerateJobIds()]);
  let nextTasks: GalleryGenTask[] = [];
  let loadedTasks = false;
  try {
    nextTasks = await fetchGalleryGenerateTasks();
    genTasks.value = nextTasks;
    loadedTasks = true;
  } catch {
    genTasks.value = [];
  }
  if (!loadedTasks) return;

  const nextIds = new Set(nextTasks.map((task) => String(task.id)));
  const completedIds = [...previousIds].filter((id) => !nextIds.has(id));
  activeGenerateTaskIds = nextIds;
  syncActiveGenerateJobIds(nextIds);
  if (completedIds.length) {
    await handleGenerateTasksCompleted(completedIds);
  }

  if (genTaskTimer) clearTimeout(genTaskTimer);
  if (scheduleNext && genTasks.value.length) {
    genTaskTimer = setTimeout(() => void loadGenerateTasks(true), 5000);
  }
}

async function handleGenerateTasksCompleted(ids: string[]) {
  try {
    const terminalJobs = await fetchGalleryTerminalGenerateJobs();
    const terminalIds = new Set(terminalJobs.map((job) => job.id));
    const staleIds = ids.filter((id) => !terminalIds.has(id));
    if (staleIds.length) removeActiveGenerateJobIds(staleIds);

    const notifiedIds = readNotifiedGenerateJobIds();
    const finished = terminalJobs.filter((job) => ids.includes(job.id) && !notifiedIds.has(job.id));
    if (!finished.length) return;

    const finishedIds = finished.map((job) => job.id);
    addNotifiedGenerateJobIds(finishedIds);
    removeActiveGenerateJobIds(finishedIds);

    const hasSavedDraft = finished.some((job) => job.status === "succeeded" || job.status === "partial_failed");
    if (hasSavedDraft) {
      await Promise.all([loadGalleryPage(1, false), fetchGalleryUser().then((nextProfile) => (profile.value = nextProfile))]);
      visibleCount.value = PAGE_SIZE;
      renderKey.value += 1;
      uni.showModal({
        title: "生成完成",
        content: "生成的作品已自动保存到草稿箱，可回到创作页查看结果，或在画廊草稿箱继续发布。",
        confirmText: "去创作页",
        cancelText: "留在画廊",
        success(result) {
          if (result.confirm) uni.navigateTo({ url: `/pages/create/index?jobId=${encodeURIComponent(finished[0].id)}` });
        }
      });
      return;
    }

    uni.showToast({ title: "生成任务已结束，未保存草稿", icon: "none" });
  } catch {
    uni.showToast({ title: "生成任务已结束，请刷新画廊查看", icon: "none" });
  }
}

async function loadGalleryPage(page = 1, append = false) {
  if (renderedTab.value === "favorite") {
    const result = await fetchFavorites(page, PAGE_SIZE);
    const favorites = result.items.map(toFavoriteWork);
    const nextAuthors = result.items.map((item) => toFavoriteUser(item.author));
    const authorMap = new Map(workAuthors.value.map((user) => [user.id, user]));
    nextAuthors.forEach((user) => authorMap.set(user.id, user));
    workAuthors.value = Array.from(authorMap.values());
    works.value = append ? [...works.value, ...favorites] : favorites;
    pageState.page = result.page;
    pageState.hasMore = result.hasMore;
    return;
  }
  const result = await fetchGalleryWorks({
    status: getStatusForTab(),
    page,
    pageSize: PAGE_SIZE
  });
  works.value = append ? [...works.value, ...result.works] : result.works;
  pageState.page = result.page;
  pageState.hasMore = result.hasMore;
}

async function reloadGalleryData() {
  if (useMockData.value) {
    resetMockGalleryData();
    return;
  }

  if (!isLoggedIn.value) {
    resetRealGalleryData();
    return;
  }

  if (isPageRequesting.value) return;
  isPageRequesting.value = true;
  isLoading.value = !works.value.length;
  try {
    const [nextProfile] = await Promise.all([fetchGalleryUser(), loadGalleryPage(1, false), loadGenerateTasks(true), loadUnreadMessages()]);
    profile.value = nextProfile;
    visibleCount.value = PAGE_SIZE;
    renderKey.value += 1;
    lastLoadedAt = Date.now();
  } catch {
    if (!works.value.length) resetRealGalleryData();
    uni.showToast({ title: "画廊数据加载失败，请稍后重试", icon: "none" });
  } finally {
    isLoading.value = false;
    isPageRequesting.value = false;
  }
}

function goHome() {
  goRootTab("/pages/home/index");
}

function goPlaza() {
  goRootTab("/pages/plaza/index");
}

function goCreate() {
  openEmbeddedCreate();
}

function goMine() {
  goRootTab("/pages/mine/index");
}

function goSearch() {
  if (!ensureLogin()) return;
  uni.navigateTo({ url: `/pages/search/index?scope=${isMineMode.value ? "mine" : "gallery"}` });
}

function goGallery() {
  goRootTab("/pages/gallery/index");
}

function getWorkAuthor(work: HomeWork) {
  if (work.userId === profile.value.id || renderedTab.value !== "favorite") {
    return { id: profile.value.id, name: profile.value.name, avatar: profile.value.avatar, color: profile.value.color };
  }
  return workAuthors.value.find((user) => user.id === work.userId) || homeUsers.find((user) => user.id === work.userId) || {
    id: work.userId,
    name: `用户${work.userId}`,
    avatar: "U",
    color: "var(--accent)"
  };
}

function goEditProfile() {
  if (!ensureLogin()) return;
  uni.navigateTo({ url: "/pages/edit-profile/index" });
}

function goRecharge() {
  if (!ensureLogin()) return;
  uni.navigateTo({ url: "/pages/recharge/index" });
}

function goPublish() {
  if (!ensureLogin()) return;
  uni.navigateTo({ url: "/pages/publish/index" });
}

function goFollowList() {
  if (!ensureLogin()) return;
  uni.navigateTo({ url: "/pages/follow-list/index?type=followers" });
}

function openLoginSheet() {
  loginSheetMounted.value = true;
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
}

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    await reloadGalleryData();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function openSideMenu() {
  sideDrawerMounted.value = true;
  sideOpen.value = true;
}

function closeSideMenu() {
  sideOpen.value = false;
}

function navigateSide(url: string) {
  closeSideMenu();
  if (!ensureLogin()) return;
  uni.navigateTo({ url });
}

function goSettings() {
  uni.navigateTo({ url: "/pages/settings/index" });
}

function showDraftTool(title: string) {
  uni.showToast({ title, icon: "none" });
}

function toggleSort() {
  sortDescending.value = !sortDescending.value;
  uni.showToast({ title: sortDescending.value ? "已按最新排序" : "已按最早排序", icon: "none" });
}

function clearWaterfallAnimation() {
  if (waterfallAnimationTimer) clearTimeout(waterfallAnimationTimer);
  waterfallAnimationTimer = undefined;
  waterfallAnimationClass.value = "";
}

function playWaterfallAnimation(direction: ReturnType<typeof getWaterfallDirection>) {
  clearWaterfallAnimation();
  waterfallAnimationClass.value = getWaterfallAnimationClass(direction);
  waterfallAnimationTimer = setTimeout(() => {
    waterfallAnimationClass.value = "";
    waterfallAnimationTimer = undefined;
  }, WATERFALL_ANIMATION_DURATION);
}

function switchGalleryTab(tab: GalleryTab, index: number) {
  if (tab === activeTab.value || isLoading.value) return;
  const previousIndex = workspaceTabs.value.findIndex((item) => item.key === activeTab.value);
  const direction = getWaterfallDirection(index, previousIndex);
  activeTab.value = tab;
  selectedIds.value = new Set();
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  isLoadingMore.value = false;
  clearWaterfallAnimation();
  isLoading.value = true;

  loadingTimer = setTimeout(() => {
    if (!isLoading.value) return;
    loadingTimer = setTimeout(async () => {
      renderedTab.value = tab;
      visibleCount.value = PAGE_SIZE;
      if (!useMockData.value) {
        works.value = [];
        pageState.page = 1;
        pageState.hasMore = false;
        try {
          await loadGalleryPage(1, false);
        } catch {
          uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
        }
      }
      renderKey.value += 1;
      isLoading.value = false;
      loadingTimer = undefined;
      playWaterfallAnimation(direction);
    }, WATERFALL_SWITCH_DELAY);
  }, WATERFALL_LOADING_FRAME_DELAY);
}

function handleReachBottom() {
  if (isLoading.value || isLoadingMore.value || !hasMore.value) return;
  isLoadingMore.value = true;
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  loadMoreTimer = setTimeout(async () => {
    if (!useMockData.value && visibleCount.value >= filteredWorks.value.length && pageState.hasMore) {
      try {
        await loadGalleryPage(pageState.page + 1, true);
      } catch {
        uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
      }
    }
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filteredWorks.value.length);
    isLoadingMore.value = false;
  }, 500);
}

function toggleManage() {
  if (!ensureLogin()) return;
  manageMode.value = !manageMode.value;
  selectedIds.value = new Set();
}

function toggleWorkSelection(workId: number) {
  const next = new Set(selectedIds.value);
  if (next.has(workId)) {
    next.delete(workId);
  } else {
    next.add(workId);
  }
  selectedIds.value = next;
}

function toggleSelect(event: Event, workId: number) {
  if (!manageMode.value) return;
  event.stopPropagation();
  toggleWorkSelection(workId);
}

function selectAll() {
  if (!displayedWorks.value.length) return;
  selectedIds.value = allCurrentSelected.value ? new Set() : new Set(displayedWorks.value.map((work) => work.id));
}

function confirmBatchAction(options: { title: string; content: string; confirmText: string; confirmColor?: string }) {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: options.title,
      content: options.content,
      confirmText: options.confirmText,
      confirmColor: options.confirmColor,
      success(result) {
        resolve(Boolean(result.confirm));
      },
      fail() {
        resolve(false);
      }
    });
  });
}

async function refreshAfterBatchAction() {
  selectedIds.value = new Set();
  manageMode.value = false;
  visibleCount.value = PAGE_SIZE;
  if (!useMockData.value) {
    await Promise.all([loadGalleryPage(1, false), fetchGalleryUser().then((nextProfile) => (profile.value = nextProfile))]);
  }
  renderKey.value += 1;
}

async function moveSelectedToDraft() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: "请先选择要回草稿的作品", icon: "none" });
    return;
  }

  const ids = selectedPublishedWorks.value.map((work) => work.id);
  if (!ids.length) {
    uni.showToast({ title: "所选作品没有已发布内容", icon: "none" });
    return;
  }

  const confirmed = await confirmBatchAction({
    title: "回到草稿",
    content: `将 ${ids.length} 个已发布作品转回草稿箱，广场将不再展示，确定继续吗？`,
    confirmText: "回草稿",
    confirmColor: "#ff8a65"
  });
  if (!confirmed) return;

  if (!useMockData.value) {
    try {
      await moveGalleryWorksToDraft(ids);
    } catch {
      uni.showToast({ title: "回草稿失败，请稍后重试", icon: "none" });
      return;
    }
  } else {
    works.value = works.value.map((work) => (ids.includes(work.id) ? { ...work, published: false, status: "draft" } : work));
  }

  await refreshAfterBatchAction();
  uni.showToast({ title: `已转入草稿 ${ids.length} 个作品`, icon: "none" });
}

async function deleteSelected() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: "请先选择要删除的作品", icon: "none" });
    return;
  }

  const count = selectedIds.value.size;
  const ids = Array.from(selectedIds.value);
  const confirmed = await confirmBatchAction({
    title: "删除作品",
    content: `确定删除已选中的 ${count} 个作品吗？删除后不可恢复。`,
    confirmText: "删除",
    confirmColor: "#ff5c7a"
  });
  if (!confirmed) return;

  if (!useMockData.value) {
    try {
      await deleteGalleryWorks(ids);
    } catch {
      uni.showToast({ title: "删除失败，请稍后重试", icon: "none" });
      return;
    }
  }

  works.value = works.value.filter((work) => !ids.includes(work.id));
  await refreshAfterBatchAction();
  uni.showToast({ title: `已删除 ${count} 个作品`, icon: "none" });
}

function displayTitle(work: HomeWork) {
  return work.title || (work.prompt.length > 18 ? `${work.prompt.slice(0, 18)}...` : work.prompt);
}

function statusBadgeText(work: HomeWork) {
  if (work.status === "pending") return "⌛ 审核中";
  if (work.status === "rejected") return "× 未通过";
  if (work.status === "offline") return "↓ 已下架";
  return work.published ? "✓ 已发布" : "▤ 草稿";
}

function statusBadgeClass(work: HomeWork) {
  return {
    draft: !work.published && work.status !== "pending",
    pending: work.status === "pending",
    rejected: work.status === "rejected" || work.status === "offline"
  };
}

function getAspectRatio(ratio: string) {
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height) return "1 / 1";
  return `${width} / ${height}`;
}

function openWork(work: HomeWork) {
  if (!ensureLogin()) return;
  if (manageMode.value) {
    toggleWorkSelection(work.id);
    return;
  }
  uni.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` });
}

</script>

<template>
  <view class="gallery-page" :class="themeClass">
    <scroll-view class="gallery-scroll" scroll-y :lower-threshold="80" @scrolltolower="handleReachBottom">
      <view class="header-bg">
        <view class="nav-header">
          <view class="status-spacer" :style="{ height: statusBarHeight + 'px' }" />
          <view class="nav-row">
            <view class="nav-left-actions">
              <view class="icon-btn nav-menu" @click="isMineMode ? goSettings() : openSideMenu()">{{ isMineMode ? "⚙" : "▤" }}</view>
              <view v-if="isMineMode" class="icon-btn search" @click="goSearch">⌕</view>
              <view v-if="isMineMode" class="icon-btn checkin" @click="navigateSide('/pages/checkin/index')">◷</view>
            </view>
            <text v-if="!isMineMode" class="nav-title">画廊</text>
            <view v-if="isMineMode" class="nav-invite" :style="{ right: `${navInviteRight}px` }" @click="navigateSide('/pages/invite/index')"><text>🎁</text><text>邀请有礼</text></view>
          </view>
        </view>

        <view v-if="isMineMode && isInitialContentReady && isLoggedIn" class="profile-area">
          <view class="profile-row">
            <view class="avatar-wrap">
              <view class="profile-avatar" :style="{ background: profile.color }">{{ profile.avatar }}</view>
            </view>
            <view class="profile-main">
              <view class="profile-name">{{ profile.name }}</view>
              <view class="id-row">
                <text class="profile-id">ID: {{ profile.userNo }}</text>
                <view v-if="hasGenderIcon" class="gender-tag" :class="profile.gender">{{ genderIcon }}</view>
              </view>
              <view class="role-tag">✦ {{ profile.role }}</view>
            </view>
            <view class="points-pill" @click="goRecharge"><text class="points-gem">◆</text><text class="points-value">{{ profile.points }}</text></view>
          </view>

          <view class="bio">{{ profile.bio }}</view>

          <view class="stats-row">
            <view class="stats">
              <view class="stat">
                <text class="stat-num rose">{{ profile.works }}</text>
                <text class="stat-label">作品</text>
              </view>
              <view class="stat" @click="goFollowList">
                <text class="stat-num accent">{{ profile.followers }}</text>
                <text class="stat-label">粉丝</text>
              </view>
              <view class="stat">
                <text class="stat-num lavender">{{ profile.likes }}</text>
                <text class="stat-label">获赞</text>
              </view>
              <view class="stat" @click="navigateSide('/pages/follow-list/index?type=following')">
                <text class="stat-num mint">{{ profile.following }}</text>
                <text class="stat-label">关注</text>
              </view>
            </view>
            <button class="edit-home-btn" @click="goEditProfile">编辑主页</button>
          </view>
          <view class="membership-banner" @click="navigateSide('/pages/membership/index')">
            <view class="membership-mark">♕</view>
            <view class="membership-copy">
              <view class="membership-title">{{ membershipTitle }}</view>
              <view class="membership-subtitle">{{ membershipSubtitle }}</view>
            </view>
            <button class="membership-action">{{ hasMembership ? "查看权益" : "升级 PRO" }}</button>
          </view>
        </view>

        <view v-else-if="isMineMode && isInitialContentReady" class="gallery-login-prompt">
          <view class="gallery-login-icon">▣</view>
          <view class="gallery-login-title">登录查看我的画廊</view>
          <view class="gallery-login-sub">登录后即可管理你的AI作品、草稿与创作记录</view>
          <button class="gallery-login-btn" @click="openLoginSheet">立即登录</button>
        </view>

        <view v-else-if="isMineMode" class="gallery-initial-placeholder">
          <view class="profile-placeholder-row">
            <view class="profile-placeholder-avatar" />
            <view class="profile-placeholder-lines">
              <view class="profile-placeholder-line wide" />
              <view class="profile-placeholder-line narrow" />
            </view>
          </view>
          <view class="profile-placeholder-line full" />
        </view>
      </view>

      <view v-if="!isMineMode && isInitialContentReady && !isLoggedIn" class="gallery-content guest-empty-wrap">
        <view class="empty-state">
          <view class="empty-icon">□</view>
          <view class="empty-title">还没有作品哦~</view>
          <view class="empty-sub">登录后可查看和管理全部作品，也可以先去创作</view>
          <button class="empty-btn" @click="goCreate">✦ 立即去创作</button>
        </view>
      </view>

      <view v-if="isInitialContentReady && isLoggedIn" class="gallery-tabs-row" :class="{ 'draft-toolbar-row': !isMineMode }">
        <view v-if="isMineMode" class="gallery-tabs">
          <view
            v-for="(tab, index) in workspaceTabs"
            :key="tab.key"
            class="gallery-tab"
            :class="{ active: activeTab === tab.key }"
            @click="switchGalleryTab(tab.key, index)"
          >
            {{ tab.label }}
          </view>
          <view class="tab-indicator" :style="{ transform: `translateX(${workspaceTabs.findIndex((tab) => tab.key === activeTab) * 61}px)` }" />
        </view>
        <view v-else class="draft-tools">
          <view class="draft-tool" @click="goSearch">⌕</view>
          <view class="draft-tool" :class="{ active: filterOpen || selectedModel !== 'all' || selectedStatus !== 'all' }" @click="filterOpen = true">▽</view>
          <view class="draft-tool" @click="toggleSort">{{ sortDescending ? "↓" : "↑" }}</view>
        </view>
        <view v-if="isMineMode" class="mine-work-tools">
          <view class="draft-tool" :class="{ active: filterOpen || selectedModel !== 'all' || selectedStatus !== 'all' }" @click="filterOpen = true">▽</view>
        </view>
        <button class="manage-btn" :class="{ active: manageMode }" @click="toggleManage">
          {{ manageMode ? "✓ 完成" : "☷ 管理" }}
        </button>
      </view>

      <view v-if="isInitialContentReady && isLoggedIn" class="gallery-content">
        <view v-if="genTasks.length" class="gen-cards">
          <view v-for="task in genTasks" :key="task.id" class="gen-task-card">
            <view class="shimmer-bg" />
            <view class="gen-inner">
              <view class="gen-row1">
                <view class="gen-info">
                  <view class="gen-prompt">{{ task.prompt }}</view>
                  <view class="gen-meta">{{ task.model }} · {{ task.count }}张 · {{ task.ratio }} · {{ task.quality }}</view>
                </view>
                <view class="gen-status">
                  <text class="gen-percent">{{ task.percent }}%</text>
                  <text class="gen-elapsed">{{ task.elapsed }}s</text>
                </view>
              </view>
              <view class="gen-row2">
                <view class="gen-track">
                  <view class="gen-fill" :style="{ width: `${task.percent}%` }" />
                </view>
                <view class="gen-spinner" />
                <text class="gen-stage">{{ task.stage }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="waterfall-stage" :class="{ switching: isWaterfallSwitching }">
          <view v-if="isLoading && !isWaterfallSwitching" :key="`loading-${activeTab}`" class="loading-card">
            <view class="spinner" />
          </view>

        <view v-else-if="filteredWorks.length" :key="`waterfall-${renderedTab}-${renderKey}`" class="waterfall" :class="waterfallAnimationClass">
          <view class="waterfall-column">
            <view v-for="work in leftColumnWorks" :key="work.id" class="work-card" @click="openWork(work)">
              <view v-if="manageMode" class="select-dot" :class="{ selected: selectedIds.has(work.id) }" @click="toggleSelect($event, work.id)">✓</view>
              <view class="status-badge" :class="statusBadgeClass(work)">{{ statusBadgeText(work) }}</view>
              <image class="work-img" :src="work.image" mode="aspectFill" lazy-load :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="author">
                    <view class="mini-avatar" :style="{ background: getWorkAuthor(work).color }">{{ getWorkAuthor(work).avatar }}</view>
                    <text class="author-name">{{ getWorkAuthor(work).name }}</text>
                  </view>
                  <view v-if="work.published" class="likes">♡ {{ work.likes }}</view>
                </view>
              </view>
            </view>
          </view>

          <view class="waterfall-column">
            <view v-for="work in rightColumnWorks" :key="work.id" class="work-card" @click="openWork(work)">
              <view v-if="manageMode" class="select-dot" :class="{ selected: selectedIds.has(work.id) }" @click="toggleSelect($event, work.id)">✓</view>
              <view class="status-badge" :class="statusBadgeClass(work)">{{ statusBadgeText(work) }}</view>
              <image class="work-img" :src="work.image" mode="aspectFill" lazy-load :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="author">
                    <view class="mini-avatar" :style="{ background: getWorkAuthor(work).color }">{{ getWorkAuthor(work).avatar }}</view>
                    <text class="author-name">{{ getWorkAuthor(work).name }}</text>
                  </view>
                  <view v-if="work.published" class="likes">♡ {{ work.likes }}</view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else :key="`empty-${renderedTab}-${renderKey}`" class="empty-state">
          <view class="empty-icon">{{ emptyInfo.icon }}</view>
          <view class="empty-title">{{ emptyInfo.title }}</view>
          <view class="empty-sub">{{ emptyInfo.sub }}</view>
          <button v-if="renderedTab === 'all' || renderedTab === 'draft'" class="empty-btn" @click="goCreate">✦ 立即去创作</button>
        </view>

          <view class="switch-loading-card" :class="{ show: isWaterfallSwitching }">
            <view class="spinner" />
          </view>
        </view>

        <view v-if="!isLoading && !isWaterfallSwitching && filteredWorks.length" class="load-more-hint" :class="{ 'is-loading': isLoadingMore }">
          <view v-if="isLoadingMore" class="spinner mini" />
          <text>{{ isLoadingMore ? "正在加载更多作品" : hasMore ? "继续往下滑获取更多作品" : "我也是有底线的~" }}</text>
        </view>
      </view>

    </scroll-view>

    <view v-if="isInitialContentReady && isLoggedIn" :class="['manage-bar', { show: manageMode }]">
      <text class="selected-count">已选择 {{ selectedCount }} 项</text>
      <button class="select-all-btn" @click="selectAll">{{ allCurrentSelected ? "取消全选" : "全选" }}</button>
      <button class="draft-btn" :class="{ enabled: canMoveSelectedToDraft }" @click="moveSelectedToDraft">回草稿</button>
      <button class="delete-btn" :class="{ enabled: selectedCount > 0 }" @click="deleteSelected">删除</button>
    </view>

    <view class="filter-overlay" :class="{ show: filterOpen }" @click="filterOpen = false" />
    <view class="filter-sheet" :class="{ show: filterOpen }">
      <view class="sheet-handle" />
      <view class="filter-title">筛选作品</view>
      <view class="filter-section-title">模型</view>
      <view class="filter-options">
        <view class="filter-chip" :class="{ active: selectedModel === 'all' }" @click="selectedModel = 'all'">全部模型</view>
        <view v-for="model in modelOptions" :key="model" class="filter-chip" :class="{ active: selectedModel === model }" @click="selectedModel = model">{{ model }}</view>
        <view class="filter-chip" :class="{ active: selectedModel === '未标注模型' }" @click="selectedModel = '未标注模型'">未标注模型</view>
      </view>

      <view class="filter-section-title">发布状态</view>
      <view class="filter-options">
        <view v-for="item in [{ key: 'all', label: '全部' }, { key: 'published', label: '已发布' }, { key: 'draft', label: '草稿' }, { key: 'pending', label: '审核中' }]" :key="item.key" class="filter-chip" :class="{ active: selectedStatus === item.key }" @click="selectedStatus = item.key">{{ item.label }}</view>
      </view>
      <button class="filter-confirm" @click="filterOpen = false">查看 {{ filteredWorks.length }} 个作品</button>
    </view>

    <view v-if="!isMineMode && isInitialContentReady && isLoggedIn" class="publish-btn" @click="goPublish">+</view>

    <view class="tab-bar">
      <view class="tab-item" @click="goHome">
        <text class="tab-icon">⌂</text>
        <text class="tab-label">首页</text>
      </view>
      <view class="tab-item" @click="goPlaza">
        <text class="tab-icon">◇</text>
        <text class="tab-label">广场</text>
      </view>
      <view class="tab-item center" @click="goCreate">
        <text class="tab-icon">✦</text>
        <text class="tab-label">创作</text>
      </view>
      <view class="tab-item" :class="{ active: !isMineMode }" @click="goGallery">
        <text class="tab-icon">□</text>
        <text class="tab-label">画廊</text>
      </view>
      <view class="tab-item" :class="{ active: isMineMode }" @click="goMine">
        <text class="tab-icon">☺</text>
        <text class="tab-label">我的</text>
      </view>
    </view>

    <LumiSideDrawer
      v-if="sideDrawerMounted"
      :open="sideOpen"
      :user-name="profile.name"
      :user-avatar="profile.avatar"
      :user-color="profile.color"
      :user-points="profile.points"
      :quick-actions="sideQuickActions"
      :rows="sideRows"
      @close="closeSideMenu"
      @navigate="navigateSide"
    />
    <LumiLoginSheet v-if="loginSheetMounted" :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.gallery-page {
  --lumi-tabbar-height: calc(56px + env(safe-area-inset-bottom));
  position: relative;
  display: block;
  width: 100vw;
  max-width: 100vw;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  box-sizing: border-box;
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.gallery-scroll {
  position: absolute;
  inset: 0 0 var(--lumi-tabbar-height);
  z-index: 1;
  box-sizing: border-box;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.gallery-scroll::-webkit-scrollbar,
.gallery-scroll .uni-scroll-view::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.header-bg {
  padding-bottom: 8px;
}

.nav-header {
  position: relative;
  z-index: 1;
}

.nav-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  padding: 0 16px;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--fg-primary);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  font-size: 22px;
  color: var(--fg-primary);
}

.icon-btn.search {
  font-size: 25px;
}

.icon-btn.checkin {
  font-size: 23px;
}

.nav-menu {
  position: absolute;
  left: 16px;
}

.nav-search {
  position: absolute;
  right: 16px;
}

.nav-left-actions {
  position: absolute;
  left: 16px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.nav-left-actions .nav-menu {
  position: static;
}

.nav-invite {
  position: absolute;
  right: 100px;
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 9px;
  font-size: 11px;
  color: var(--fg-primary);
  background: var(--bg-soft);
  border-radius: 8px;
}

.gallery-initial-placeholder {
  padding: 12px 16px 18px;
}

.profile-placeholder-row {
  display: flex;
  gap: 14px;
  align-items: center;
}

.profile-placeholder-avatar {
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 50%;
  opacity: 0.72;
}

.profile-placeholder-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.profile-placeholder-line {
  height: 14px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 7px;
  opacity: 0.72;
}

.profile-placeholder-line.wide {
  width: 68%;
}

.profile-placeholder-line.narrow {
  width: 44%;
}

.profile-placeholder-line.full {
  width: 100%;
  margin-top: 18px;
}

.manage-btn,
.select-all-btn,
.draft-btn,
.delete-btn,
.empty-btn {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border: none;
  border-radius: 999px;
}

.profile-row {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 12px 16px 0;
}

.points-pill { display: flex; flex: 0 0 auto; gap: 7px; align-items: center; align-self: center; padding: 9px 13px; color: var(--fg-primary); background: var(--bg-soft); border-radius: 999px; }
.points-gem { font-size: 17px; color: var(--lavender); }
.points-value { font-size: 17px; font-weight: 600; }

.avatar-wrap {
  position: relative;
  flex: 0 0 auto;
}

.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.profile-main {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 18px;
  font-weight: 700;
}

.id-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 3px;
}

.profile-id {
  font-size: 13px;
  color: var(--fg-muted);
}

.gender-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 999px;
}

.gender-tag.female {
  color: var(--rose);
  background: var(--rose-soft);
}

.gender-tag.male {
  color: var(--accent);
  background: var(--accent-soft);
}

.bio {
  padding: 10px 16px 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fg-secondary);
}

.role-tag {
  display: inline-flex;
  margin-top: 6px;
  padding: 3px 9px;
  font-size: 12px;
  color: #8470c7;
  background: var(--lavender-soft);
  border-radius: 999px;
}

.stats-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 16px 10px;
}

.gallery-login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 70px 32px;
  text-align: center;
}

.gallery-login-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 18px;
  font-size: 38px;
  color: #fff;
  background: var(--gradient-dream);
  border-radius: 24px;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.gallery-login-title {
  margin-bottom: 8px;
  font-size: 19px;
  font-weight: 700;
  color: var(--fg-primary);
}

.gallery-login-sub {
  max-width: 260px;
  margin-bottom: 24px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--fg-muted);
}

.gallery-login-btn {
  width: 70%;
  height: 42px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 12px;
}

.gallery-login-btn::after {
  border: none;
}

.stats {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
}

.edit-home-btn {
  flex: 0 0 auto;
  width: 86px;
  height: 42px;
  padding: 0;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 42px;
  color: var(--fg-primary);
  background: var(--bg-soft);
  border: 0;
  border-radius: 8px;
}

.edit-home-btn::after {
  border: 0;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  text-align: center;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
}

.stat-num.rose {
  color: var(--rose);
}

.stat-num.accent {
  color: var(--accent);
}

.stat-num.lavender {
  color: var(--lavender);
}

.stat-num.mint {
  color: var(--mint);
}

.stat-label {
  margin-left: 0;
  font-size: 11px;
  color: var(--fg-muted);
  white-space: nowrap;
}

.gallery-tabs-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 16px;
  margin-bottom: 8px;
  box-sizing: border-box;
  width: 100%;
}

.gallery-tabs-row.draft-toolbar-row { justify-content: flex-end; }

.gallery-tabs-row.draft-toolbar-row {
  position: relative;
  width: 100vw;
  max-width: 100vw;
  height: 40px;
  padding: 0;
}

.draft-toolbar-row .draft-tools {
  position: absolute;
  top: 4px;
  right: 104px;
  margin: 0;
}

.draft-toolbar-row .manage-btn {
  position: absolute;
  top: 5px;
  right: 10px;
  min-width: 76px;
  padding-left: 14px;
  margin: 0;
  border-left: 1px solid var(--border);
  border-radius: 0;
}

.guest-empty-wrap {
  padding-top: 96px;
}

.gallery-tabs {
  position: relative;
  display: flex;
  flex: 1;
  gap: 20px;
  align-items: center;
  padding-bottom: 6px;
}

.gallery-tab {
  width: 41px;
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-muted);
  text-align: center;
  transition:
    color 0.3s ease,
    font-weight 0.3s ease;
}

.gallery-tab.active {
  font-weight: 700;
  color: var(--tab-active);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 10px;
  width: 20px;
  height: 3px;
  background: var(--tab-active);
  border-radius: 999px;
  transition: transform 0.28s ease;
}

.manage-btn {
  flex: 0 0 auto;
  color: var(--fg-secondary);
  background: transparent;
}

.draft-tools {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
}

.mine-work-tools {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  margin-left: auto;
}

.draft-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 22px;
  color: var(--fg-muted);
}

.draft-tool.active {
  color: var(--accent);
}

.gallery-tabs-row > .manage-btn:not(:first-child) {
  padding-left: 14px;
  margin-left: 2px;
  border-left: 1px solid var(--border);
  border-radius: 0;
}

.filter-overlay {
  position: fixed;
  inset: 0;
  z-index: 180;
  pointer-events: none;
  background: rgba(15, 31, 58, 0.36);
  opacity: 0;
  transition: opacity 0.25s;
}

.filter-overlay.show { pointer-events: auto; opacity: 1; }
.filter-sheet { position: fixed; right: 0; bottom: 0; left: 0; z-index: 181; padding: 10px 18px calc(18px + env(safe-area-inset-bottom)); background: var(--bg-card); border-radius: 20px 20px 0 0; transform: translateY(105%); transition: transform 0.28s ease; }
.filter-sheet.show { transform: translateY(0); }
.sheet-handle { width: 38px; height: 4px; margin: 0 auto 14px; background: var(--border-strong); border-radius: 999px; }
.filter-title { margin-bottom: 18px; font-size: 18px; font-weight: 700; text-align: center; }
.filter-section-title { margin: 14px 0 9px; font-size: 13px; font-weight: 700; color: var(--fg-secondary); }
.filter-options { display: flex; flex-wrap: wrap; gap: 8px; }
.filter-chip { padding: 7px 13px; font-size: 12px; color: var(--fg-secondary); background: var(--bg-soft); border: 1px solid transparent; border-radius: 999px; }
.filter-chip.active { color: var(--accent-deep); background: var(--accent-soft); border-color: var(--accent); }
.filter-confirm { width: 100%; height: 42px; margin-top: 20px; font-size: 14px; font-weight: 700; color: #fff; background: var(--gradient-dream); border: 0; border-radius: 12px; }
.filter-confirm::after { border: 0; }

.membership-banner {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 72px;
  padding: 10px 12px;
  margin: 2px 16px 8px;
  box-sizing: border-box;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 8px;
}

.membership-mark {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 20px;
  color: #fff3d4;
  background: #c88332;
  border-radius: 50%;
}

.membership-copy {
  flex: 1;
  min-width: 0;
}

.membership-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--fg-primary);
}

.membership-subtitle {
  margin-top: 4px;
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.membership-action {
  flex: 0 0 auto;
  min-width: 76px;
  height: 36px;
  padding: 0 10px;
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 36px;
  color: var(--fg-primary);
  background: var(--bg-soft);
  border: 0;
  border-radius: 8px;
}

.membership-action::after {
  border: 0;
}

.manage-btn::after {
  border: 0;
}

.manage-btn.active {
  color: var(--accent);
  background: transparent;
}

.gallery-content {
  padding: 0 8px 12px;
}

.gen-cards {
  margin-bottom: 6px;
}

.gen-task-card {
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
  background: var(--bg-card);
  border: 1.5px solid var(--accent-soft);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(91, 159, 232, 0.1);
}

.shimmer-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 25%, rgba(91, 159, 232, 0.06) 50%, transparent 75%);
  background-size: 200% 100%;
  animation: shimmer 2s ease infinite;
}

.gen-inner {
  position: relative;
  padding: 14px;
}

.gen-row1 {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.gen-info {
  flex: 1;
  min-width: 0;
}

.gen-prompt {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gen-meta {
  margin-top: 3px;
  font-size: 11px;
  color: var(--fg-muted);
}

.gen-status {
  flex: 0 0 auto;
  text-align: right;
}

.gen-percent {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
}

.gen-elapsed {
  margin-left: 4px;
  font-size: 11px;
  color: var(--fg-muted);
}

.gen-row2 {
  display: flex;
  gap: 8px;
  align-items: center;
}

.gen-track {
  flex: 1;
  height: 4px;
  overflow: hidden;
  background: var(--border);
  border-radius: 2px;
}

.gen-fill {
  height: 100%;
  background: var(--gradient-dream);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.gen-spinner {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.gen-stage {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--accent);
}

.waterfall-stage {
  position: relative;
  min-height: 320px;
}

.waterfall-stage.switching .waterfall,
.waterfall-stage.switching .empty-state {
  opacity: 0;
}

.switch-loading-card {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  display: flex;
  justify-content: center;
  padding: 20px 0;
  pointer-events: none;
  background: var(--bg-base);
  opacity: 0;
  transition: opacity 0.12s ease;
}

.switch-loading-card.show {
  opacity: 1;
}

.waterfall {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.waterfall-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.work-card {
  position: relative;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(91, 159, 232, 0.05);
}

.work-img {
  display: block;
  width: 100%;
}

.status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}

.status-badge.draft {
  color: #e59a74;
}

.status-badge.pending {
  color: #5b9fe8;
  background: rgba(91, 159, 232, 0.14);
}

.status-badge.rejected {
  color: #d4556a;
  background: rgba(212, 85, 106, 0.14);
}

.select-dot {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 14px;
  color: transparent;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid var(--border-strong);
  border-radius: 50%;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.select-dot.selected {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

.work-body {
  padding: 8px 10px 6px;
}

.work-title {
  margin-bottom: 2px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}

.author {
  display: flex;
  flex: 1;
  gap: 5px;
  align-items: center;
  min-width: 0;
}

.mini-avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.author-name {
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.likes {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
}

.loading-card {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner.mini {
  width: 16px;
  height: 16px;
  border-width: 1.5px;
}

.load-more-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 18px 0 12px;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: center;
}

.load-more-hint.is-loading {
  color: var(--accent);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50px 20px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 10px;
  font-size: 30px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 16px;
}

.empty-title {
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 700;
}

.empty-sub {
  font-size: 12px;
  color: var(--fg-muted);
}

.empty-btn {
  margin-top: 14px;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border-radius: 8px;
}

.manage-bar {
  position: absolute;
  right: 0;
  bottom: var(--lumi-tabbar-height);
  left: 0;
  z-index: 79;
  display: flex;
  gap: 8px;
  align-items: center;
  height: 60px;
  padding: 8px 16px;
  box-sizing: border-box;
  pointer-events: none;
  background: var(--bg-glass);
  border-top: 0;
  opacity: 0;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
  backdrop-filter: blur(16px);
}

.manage-bar.show {
  pointer-events: auto;
  opacity: 1;
  transform: translateY(0);
}

.selected-count {
  flex: 1;
  font-size: 13px;
  color: var(--fg-secondary);
}

.select-all-btn {
  color: var(--accent);
  background: var(--accent-soft);
}

.draft-btn {
  color: #fff;
  background: #ff8a65;
  opacity: 0.5;
}

.draft-btn.enabled {
  opacity: 1;
}

.delete-btn {
  color: #fff;
  background: var(--rose);
  opacity: 0.5;
}

.delete-btn.enabled {
  background: #e03050;
  opacity: 1;
}

.publish-btn {
  position: absolute;
  right: 16px;
  bottom: 108px;
  z-index: 75;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 28px;
  color: #fff;
  background: linear-gradient(135deg, rgba(91, 159, 232, 0.75), rgba(70, 130, 210, 0.8));
  border-radius: 50%;
  box-shadow:
    0 4px 20px rgba(91, 159, 232, 0.32),
    0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(16px) saturate(180%);
}

.tab-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: var(--lumi-tabbar-height);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
  background: var(--bg-glass);
  border-top: 0;
  box-shadow: none;
  backdrop-filter: blur(24px) saturate(180%);
}

.tab-item {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 4px 8px;
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 22px;
  color: var(--fg-muted);
}

.tab-label {
  font-size: 10px;
  color: var(--fg-muted);
}

.tab-item.active .tab-icon,
.tab-item.active .tab-label {
  color: var(--tab-active);
}

.tab-item.center {
  margin-top: 0;
}

.tab-item.center .tab-icon {
  width: 24px;
  height: 24px;
  font-size: 22px;
  color: var(--tab-active);
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.tab-item.center .tab-label {
  margin-top: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
