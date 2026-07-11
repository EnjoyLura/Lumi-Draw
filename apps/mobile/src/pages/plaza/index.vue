<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import LumiPlazaWaterfall from "../../components/LumiPlazaWaterfall.vue";
import LumiSideDrawer from "../../components/LumiSideDrawer.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { useTheme } from "../../services/theme";
import { goRootTab } from "../../services/tabNavigation";
import { openEmbeddedCreate } from "../../services/primaryShell";
import { reportPageNavigationPerformance } from "../../services/pagePerformance";
import { fetchFavorites, toHomeUser, toHomeWork, toggleWorkLike } from "../../services/social";
import { fetchMineProfile, fetchUnreadMessageCount, toMineUser } from "../mine/mineService";
import { mineUser, type MineUser } from "../mine/mineData";
import { homeUsers as mockHomeUsers, homeWorks as mockHomeWorks, type HomeUser, type HomeWork } from "../home/homeData";
import { plazaCategories, plazaTabs, type PlazaTab } from "./plazaData";
import { fetchPlazaConfig, fetchPlazaWorks, type PlazaCategoryOption, type PlazaFilterOption } from "./plazaService";
import {
  getWaterfallAnimationClass,
  getWaterfallDirection,
  WATERFALL_ANIMATION_DURATION,
  WATERFALL_LOADING_FRAME_DELAY,
  WATERFALL_SWITCH_DELAY
} from "../../services/waterfallTransition";

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

const filterOpen = ref(false);
const sideOpen = ref(false);
const showLoginSheet = ref(false);
const isInitialContentReady = ref(false);
const filterMounted = ref(false);
const sideDrawerMounted = ref(false);
const loginSheetMounted = ref(false);
const { isLoggedIn, currentUser, login: commitLogin, requireLogin, updateCurrentUser } = useAuth();
const { useMockData } = useDataMode();
const EMPTY_DRAWER_PROFILE: MineUser = {
  name: "未同步用户",
  avatar: "U",
  color: "var(--accent)",
  userNo: "-",
  credits: 0
};
const fallbackModelFilters: PlazaFilterOption[] = [
  { label: "GPT Image 2", value: "gpt-image-2" },
  { label: "Nano Banana 2", value: "nano-banana-2" },
  { label: "Nano Banana Pro", value: "nano-banana-pro" },
  { label: "Seedream 4.5", value: "seedream-4-5" }
];
const fallbackSizeFilters: PlazaFilterOption[] = ["1:1", "3:4", "4:3", "16:9", "9:16"].map((label) => ({ label, value: label }));
const fallbackQualityFilters: PlazaFilterOption[] = ["1K", "2K", "4K"].map((label) => ({ label, value: label }));
const modelFilterOptions = ref<PlazaFilterOption[]>(fallbackModelFilters);
const sizeFilterOptions = ref<PlazaFilterOption[]>(fallbackSizeFilters);
const qualityFilterOptions = ref<PlazaFilterOption[]>(fallbackQualityFilters);
const filterSelection = reactive({
  category: new Set<string>(),
  model: new Set<string>(),
  size: new Set<string>(),
  quality: new Set<string>()
});
type FilterGroup = keyof typeof filterSelection;

function isFilterActive(group: FilterGroup, value: string) {
  if (value === "全部") return filterSelection[group].size === 0;
  return filterSelection[group].has(value);
}

function toggleFilter(group: FilterGroup, value: string) {
  if (value === "全部") {
    filterSelection[group].clear();
    return;
  }
  const set = filterSelection[group];
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
}

function resetPlazaFilter() {
  filterSelection.category.clear();
  filterSelection.model.clear();
  filterSelection.size.clear();
  filterSelection.quality.clear();
  uni.showToast({ title: "已重置筛选", icon: "none" });
}

function applyPlazaFilter() {
  filterOpen.value = false;
  visibleWorkCount.value = 10;
  if (useMockData.value) {
    renderKey.value += 1;
    uni.showToast({ title: "筛选已应用", icon: "none" });
    return;
  }
  void queueFilterRefresh();
}

const statusBarHeight = ref(0);
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight ?? 0;
} catch {
  statusBarHeight.value = 0;
}

const activeTab = ref<PlazaTab>("recommend");
const renderedTab = ref<PlazaTab>("recommend");
const activeCategoryIndex = ref(0);
const renderedCategoryIndex = ref(0);
const lastCategoryIndex = ref(0);
const categoryOptions = ref<PlazaCategoryOption[]>(plazaCategories.map((name) => ({ name })));
const userList = ref<HomeUser[]>(useMockData.value ? mockHomeUsers : []);
const workList = ref<HomeWork[]>(useMockData.value ? mockHomeWorks : []);
const likedWorkIds = ref<Set<number>>(new Set());
const favoritedWorkIds = ref<Set<number>>(new Set());
const likePendingIds = ref<Set<number>>(new Set());
const drawerProfile = ref<MineUser | null>(null);
const unreadMessageCount = ref(0);
const visibleWorkCount = ref(10);
const isLoading = ref(!useMockData.value);
const isPageRequesting = ref(false);
const isLoadingMore = ref(false);
const loadFailed = ref(false);
const renderKey = ref(0);
const waterfallAnimationClass = ref("");
const { themeClass } = useTheme();
const pageState = reactive({ page: 1, hasMore: false });
const filterModels = computed(() => ["全部", ...modelFilterOptions.value.map((item) => item.label)]);
const filterSizes = computed(() => ["全部", ...sizeFilterOptions.value.map((item) => item.label)]);
const filterQualities = computed(() => ["全部", ...qualityFilterOptions.value.map((item) => item.label)]);
const sideQuickActions: SideQuick[] = [
  { icon: "💎", label: "充值", url: "/pages/recharge/index", gradient: "linear-gradient(135deg,#a8d8f8,#b0e6d0)" },
  { icon: "✓", label: "签到", url: "/pages/checkin/index", gradient: "linear-gradient(135deg,#ffd4c8,#ffc8d6)" },
  { icon: "★", label: "会员", url: "/pages/membership/index", gradient: "linear-gradient(135deg,#d4c8f0,#b8a8e0)" },
  { icon: "↗", label: "邀请", url: "/pages/invite/index", gradient: "linear-gradient(135deg,#a3e4cc,#8bd8b8)" }
];
const sideRows = ref<SideRow[]>([
  { icon: "✦", label: "发布作品", url: "/pages/publish/index", color: "var(--accent)" },
  { icon: "◷", label: "浏览记录", url: "/pages/history/index", color: "var(--mint)" },
  { icon: "✉", label: "消息中心", url: "/pages/messages/index", color: "var(--rose)", badge: "5" },
  { icon: "♥", label: "我的关注", url: "/pages/follow-list/index?type=following", color: "var(--peach)" },
  { icon: "☺", label: "我的粉丝", url: "/pages/follow-list/index?type=followers", color: "var(--lemon)" }
]);

let loadingTimer: ReturnType<typeof setTimeout> | undefined;
let loadMoreTimer: ReturnType<typeof setTimeout> | undefined;
let waterfallAnimationTimer: ReturnType<typeof setTimeout> | undefined;
let initialContentTimer: ReturnType<typeof setTimeout> | undefined;
let lastMockMode: boolean | null = useMockData.value ? true : null;
let lastLoadedAt = 0;

const displayedWorks = computed(() => filteredWorks.value.slice(0, visibleWorkCount.value));
const waterfallColumns = computed(() => {
  const columns: [HomeWork[], HomeWork[]] = [[], []];
  const heights = [0, 0];

  displayedWorks.value.forEach((work) => {
    const [width, height] = work.ratio.split(":").map(Number);
    const estimatedHeight = width && height ? height / width + 0.34 : 1.34;
    const columnIndex = heights[0] <= heights[1] ? 0 : 1;
    columns[columnIndex].push(work);
    heights[columnIndex] += estimatedHeight;
  });

  return columns;
});
const leftColumnWorks = computed(() => waterfallColumns.value[0]);
const rightColumnWorks = computed(() => waterfallColumns.value[1]);
const hasMoreWorks = computed(() => visibleWorkCount.value < filteredWorks.value.length || (!useMockData.value && pageState.hasMore));
const displayCategories = computed(() => categoryOptions.value.map((category) => category.name));
const isWaterfallSwitching = computed(() => activeTab.value !== renderedTab.value || activeCategoryIndex.value !== renderedCategoryIndex.value);
const drawerDisplay = computed(() => {
  if (!isLoggedIn.value) return EMPTY_DRAWER_PROFILE;
  if (useMockData.value) return mineUser;
  if (drawerProfile.value) return drawerProfile.value;
  return currentUser.value ? toMineUser(currentUser.value) : EMPTY_DRAWER_PROFILE;
});

const filteredWorks = computed(() => {
  if (renderedTab.value === "favorite") {
    return useMockData.value ? workList.value.filter((work) => favoritedWorkIds.value.has(work.id)) : workList.value;
  }

  if (!useMockData.value) return workList.value;

  const baseWorks = getMockFilteredWorks();

  if (renderedTab.value === "hot") {
    return [...baseWorks].sort((a, b) => b.likes - a.likes);
  }

  if (renderedTab.value === "new") {
    return [...baseWorks].reverse();
  }

  return baseWorks;
});

function refreshPlazaPage() {
  console.warn("[Lumi probe] plaza onShow");
  void loadUnreadMessages();
  void loadDrawerProfile();
  const modeChanged = lastMockMode !== useMockData.value;
  lastMockMode = useMockData.value;
  if (modeChanged || Date.now() - lastLoadedAt > 60_000) void reloadPlazaData();
}

onShow(refreshPlazaPage);

onMounted(() => {
  refreshPlazaPage();
  console.warn("[Lumi probe] plaza onReady");
  initialContentTimer = setTimeout(() => {
    isInitialContentReady.value = true;
    initialContentTimer = undefined;
    setTimeout(() => reportPageNavigationPerformance("plaza"), 800);
  }, 0);
});

onBeforeUnmount(() => {
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  if (initialContentTimer) clearTimeout(initialContentTimer);
  clearWaterfallAnimation();
});

function resetMockPlazaData() {
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  clearWaterfallAnimation();
  isLoading.value = false;
  isLoadingMore.value = false;
  loadFailed.value = false;
  drawerProfile.value = null;
  syncSideMessageBadge();
  categoryOptions.value = plazaCategories.map((name) => ({ name }));
  modelFilterOptions.value = fallbackModelFilters;
  sizeFilterOptions.value = fallbackSizeFilters;
  qualityFilterOptions.value = fallbackQualityFilters;
  activeCategoryIndex.value = 0;
  renderedCategoryIndex.value = 0;
  userList.value = mockHomeUsers;
  workList.value = mockHomeWorks;
  pageState.page = 1;
  pageState.hasMore = false;
  visibleWorkCount.value = 10;
  renderKey.value += 1;
}

function clearRealPlazaData() {
  clearWaterfallAnimation();
  drawerProfile.value = null;
  categoryOptions.value = plazaCategories.map((name) => ({ name }));
  modelFilterOptions.value = fallbackModelFilters;
  sizeFilterOptions.value = fallbackSizeFilters;
  qualityFilterOptions.value = fallbackQualityFilters;
  activeCategoryIndex.value = 0;
  renderedCategoryIndex.value = 0;
  userList.value = [];
  workList.value = [];
  unreadMessageCount.value = 0;
  syncSideMessageBadge();
  likedWorkIds.value = new Set();
  favoritedWorkIds.value = new Set();
  pageState.page = 1;
  pageState.hasMore = false;
  visibleWorkCount.value = 10;
  renderKey.value += 1;
}

function mergeUsers(nextUsers: HomeUser[]) {
  const map = new Map<number, HomeUser>();
  userList.value.forEach((user) => map.set(user.id, user));
  nextUsers.forEach((user) => map.set(user.id, user));
  userList.value = Array.from(map.values());
}

function getPlazaSort() {
  return renderedTab.value === "new" ? "latest" : "hot";
}

async function loadFavoritePage(page = 1, append = false) {
  const result = await fetchFavorites(page, 10);
  const works = result.items.map(toHomeWork);
  const users = result.items.map((item) => toHomeUser(item.author));
  workList.value = append ? [...workList.value, ...works] : works;
  syncInteractionIds(works, append);
  mergeUsers(users);
  pageState.page = result.page;
  pageState.hasMore = result.hasMore;
}

async function loadCurrentPlazaPage(page = 1, append = false) {
  if (renderedTab.value === "favorite") {
    if (!ensureLogin()) {
      workList.value = [];
      pageState.page = 1;
      pageState.hasMore = false;
      return;
    }
    await loadFavoritePage(page, append);
    return;
  }

  const categoryId = selectedCategoryIds().length ? undefined : categoryOptions.value[renderedCategoryIndex.value]?.id;
  const result = await fetchPlazaWorks({
    categoryId,
    categoryIds: selectedCategoryIds(),
    modelIds: selectedOptionValues(modelFilterOptions.value, filterSelection.model),
    ratios: selectedOptionValues(sizeFilterOptions.value, filterSelection.size),
    qualities: selectedOptionValues(qualityFilterOptions.value, filterSelection.quality),
    sort: getPlazaSort(),
    page,
    pageSize: 10,
    skipAuth: !isLoggedIn.value
  });
  workList.value = append ? [...workList.value, ...result.works] : result.works;
  syncInteractionIds(result.works, append);
    mergeUsers(result.users);
    pageState.page = result.page;
    pageState.hasMore = result.hasMore;
}

function syncInteractionIds(works: HomeWork[], append: boolean) {
  const nextLikes = append ? new Set(likedWorkIds.value) : new Set<number>();
  const nextFavorites = append ? new Set(favoritedWorkIds.value) : new Set<number>();
  works.forEach((work) => {
    if (work.liked) nextLikes.add(work.id);
    else nextLikes.delete(work.id);
    if (work.favorited) nextFavorites.add(work.id);
    else nextFavorites.delete(work.id);
  });
  likedWorkIds.value = nextLikes;
  favoritedWorkIds.value = nextFavorites;
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

async function loadDrawerProfile() {
  if (useMockData.value || !isLoggedIn.value) {
    drawerProfile.value = null;
    return;
  }

  try {
    const profile = await fetchMineProfile();
    drawerProfile.value = toMineUser(profile);
    updateCurrentUser({ credits: profile.credits });
  } catch {
    drawerProfile.value = null;
  }
}

async function reloadPlazaData() {
  if (useMockData.value) {
    resetMockPlazaData();
    return;
  }

  if (isPageRequesting.value) return;
  isPageRequesting.value = true;
  isLoading.value = !workList.value.length;
  loadFailed.value = false;
  try {
    const [config] = await Promise.all([fetchPlazaConfig(), loadDrawerProfile()]);
    categoryOptions.value = config.categories;
    modelFilterOptions.value = config.models.length ? config.models : fallbackModelFilters;
    sizeFilterOptions.value = config.ratios.length ? config.ratios : fallbackSizeFilters;
    qualityFilterOptions.value = config.qualities.length ? config.qualities : fallbackQualityFilters;
    activeCategoryIndex.value = categoryOptions.value.length
      ? Math.max(0, Math.min(activeCategoryIndex.value, categoryOptions.value.length - 1))
      : 0;
    renderedCategoryIndex.value = activeCategoryIndex.value;
    userList.value = [];
    await loadCurrentPlazaPage(1, false);
    visibleWorkCount.value = 10;
    renderKey.value += 1;
    lastLoadedAt = Date.now();
  } catch {
    clearRealPlazaData();
    loadFailed.value = true;
    uni.showToast({ title: "广场数据加载失败，请稍后重试", icon: "none" });
  } finally {
    isLoading.value = false;
    isPageRequesting.value = false;
  }
}

function goHome() {
  goRootTab("/pages/home/index");
}

function goCreate() {
  openEmbeddedCreate();
}

function goGallery() {
  goRootTab("/pages/gallery/index");
}

function goMine() {
  goRootTab("/pages/mine/index");
}

function goSearch() {
  uni.navigateTo({ url: "/pages/search/index" });
}

function goUserProfile(userId: number) {
  uni.navigateTo({ url: `/pages/user-profile/index?id=${userId}` });
}

function openWorkDetail(workId: number) {
  uni.navigateTo({ url: `/pages/work-detail/index?id=${workId}` });
}

function switchPlazaTab(tab: PlazaTab, index: number) {
  if (tab === activeTab.value || isLoading.value) return;
  const previousIndex = plazaTabs.findIndex((item) => item.key === activeTab.value);
  const direction = getWaterfallDirection(index, previousIndex);
  activeTab.value = tab;
  queueRefresh(() => {
    renderedTab.value = tab;
  }, direction);
}

function selectCategory(index: number) {
  if (index === activeCategoryIndex.value || isLoading.value) return;
  lastCategoryIndex.value = activeCategoryIndex.value;
  const direction = getWaterfallDirection(index, lastCategoryIndex.value);
  activeCategoryIndex.value = index;
  queueRefresh(() => {
    renderedCategoryIndex.value = index;
  }, direction);
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

function queueRefresh(after?: () => void, direction: ReturnType<typeof getWaterfallDirection> = "left") {
  visibleWorkCount.value = 10;
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  isLoadingMore.value = false;
  clearWaterfallAnimation();
  isLoading.value = true;

  if (useMockData.value) {
    loadingTimer = setTimeout(() => {
      if (!isLoading.value) return;
      loadingTimer = setTimeout(() => {
        after?.();
        renderKey.value += 1;
        isLoading.value = false;
        loadingTimer = undefined;
        playWaterfallAnimation(direction);
      }, WATERFALL_SWITCH_DELAY);
    }, WATERFALL_LOADING_FRAME_DELAY);
    return;
  }

  loadingTimer = setTimeout(() => {
    if (!isLoading.value) return;
    loadingTimer = setTimeout(async () => {
      after?.();
      try {
        loadFailed.value = false;
        await loadCurrentPlazaPage(1, false);
      } catch {
        workList.value = [];
        pageState.page = 1;
        pageState.hasMore = false;
        loadFailed.value = true;
        uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
      }
      renderKey.value += 1;
      isLoading.value = false;
      loadingTimer = undefined;
      playWaterfallAnimation(direction);
    }, WATERFALL_SWITCH_DELAY);
  }, WATERFALL_LOADING_FRAME_DELAY);
}

async function queueFilterRefresh() {
  isLoading.value = true;
  clearWaterfallAnimation();
  loadFailed.value = false;
  workList.value = [];
  pageState.page = 1;
  pageState.hasMore = false;
  try {
    await loadCurrentPlazaPage(1, false);
    renderKey.value += 1;
    uni.showToast({ title: "筛选已应用", icon: "none" });
  } catch {
    loadFailed.value = true;
    uni.showToast({ title: "筛选失败，请稍后重试", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}

function selectedOptionValues(options: PlazaFilterOption[], labels: Set<string>) {
  const byLabel = new Map(options.map((item) => [item.label, item.value]));
  return [...labels].map((label) => byLabel.get(label)).filter((value): value is string => Boolean(value));
}

function selectedCategoryIds() {
  const byName = new Map(categoryOptions.value.map((category) => [category.name, category.id]));
  return [...filterSelection.category].map((name) => byName.get(name)).filter((id): id is number => Boolean(id));
}

function getMockFilteredWorks() {
  const selectedCategories = [...filterSelection.category];
  const categoryNames = selectedCategories.length ? selectedCategories : displayCategories.value[renderedCategoryIndex.value] === "全部" ? [] : [displayCategories.value[renderedCategoryIndex.value]];
  const categoryWorks = categoryNames.length
    ? categoryNames.flatMap((category) => filterByCategory(mockHomeWorks, category))
    : mockHomeWorks;
  const uniqueWorks = Array.from(new Map(categoryWorks.map((work) => [work.id, work])).values());
  const selectedSizes = filterSelection.size;
  return selectedSizes.size ? uniqueWorks.filter((work) => selectedSizes.has(work.ratio)) : uniqueWorks;
}

function filterByCategory(works: HomeWork[], category: string) {
  const keywordMap: Record<string, string[]> = {
    二次元: ["anime", "girl", "pixel"],
    风景: ["landscape", "mountain", "field", "river"],
    建筑: ["city", "steampunk"],
    表情包: ["cat", "pixel"],
    写实: ["cyberpunk", "lighting", "oil"],
    国风: ["chinese", "hanfu", "ink"],
    人像: ["girl", "angel", "elf"],
    动物: ["cat"],
    抽象: ["abstract", "geometric", "dream"]
  };
  const keywords = keywordMap[category] || [];
  const result = works.filter((work) => keywords.some((keyword) => `${work.title} ${work.prompt}`.toLowerCase().includes(keyword)));
  return result.length ? result : works.slice(0, 6);
}

function getUser(work: HomeWork) {
  const fallbackName = work.userId ? `用户${work.userId}` : "未知用户";
  return userList.value.find((user) => user.id === work.userId) || {
    id: work.userId,
    name: fallbackName,
    avatar: "U",
    color: "var(--accent)"
  };
}

function getAspectRatio(ratio: string) {
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height) return "1 / 1";
  return `${width} / ${height}`;
}

function setPendingLike(workId: number, pending: boolean) {
  const next = new Set(likePendingIds.value);
  if (pending) next.add(workId);
  else next.delete(workId);
  likePendingIds.value = next;
}

function updateWorkLikeCount(workId: number, likes: number) {
  workList.value = workList.value.map((work) => (work.id === workId ? { ...work, likes } : work));
}

function displayLikeCount(work: HomeWork) {
  return work.likes + (useMockData.value && likedWorkIds.value.has(work.id) ? 1 : 0);
}

async function toggleLike(event: Event, workId: number) {
  event.stopPropagation();
  if (!useMockData.value && !ensureLogin()) return;
  if (likePendingIds.value.has(workId)) return;

  if (!useMockData.value) {
    setPendingLike(workId, true);
    try {
      const result = await toggleWorkLike(workId);
      const next = new Set(likedWorkIds.value);
      if (result.liked) next.add(workId);
      else next.delete(workId);
      likedWorkIds.value = next;
      updateWorkLikeCount(workId, result.likes);
    } catch {
      uni.showToast({ title: "点赞失败，请稍后重试", icon: "none" });
    } finally {
      setPendingLike(workId, false);
    }
    return;
  }

  const next = new Set(likedWorkIds.value);
  if (next.has(workId)) {
    next.delete(workId);
  } else {
    next.add(workId);
  }
  likedWorkIds.value = next;
}

function openFilter() {
  filterMounted.value = true;
  filterOpen.value = true;
}

function closeFilter() {
  filterOpen.value = false;
}

function openSideMenu() {
  sideDrawerMounted.value = true;
  sideOpen.value = true;
}

function closeSideMenu() {
  sideOpen.value = false;
}

function openLoginSheet() {
  loginSheetMounted.value = true;
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
}

function navigateSide(url: string) {
  closeSideMenu();
  if (!ensureLogin()) return;
  uni.navigateTo({ url });
}

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    await Promise.all([reloadPlazaData(), loadUnreadMessages()]);
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function handleReachBottom() {
  if (isLoading.value || isLoadingMore.value || !hasMoreWorks.value) return;
  isLoadingMore.value = true;
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  loadMoreTimer = setTimeout(async () => {
    if (!useMockData.value && visibleWorkCount.value >= filteredWorks.value.length && pageState.hasMore) {
      try {
        await loadCurrentPlazaPage(pageState.page + 1, true);
      } catch {
        uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
      }
    }
    visibleWorkCount.value = Math.min(visibleWorkCount.value + 4, filteredWorks.value.length);
    isLoadingMore.value = false;
  }, 500);
}
</script>

<template>
  <view class="plaza-page" :class="themeClass">
    <scroll-view class="plaza-scroll" scroll-y :lower-threshold="80" @scrolltolower="handleReachBottom">
      <view class="plaza-content">
        <view class="nav-header">
          <view class="status-spacer" :style="{ height: statusBarHeight + 'px' }" />
          <view class="nav-row">
            <text class="nav-title">广场</text>
          </view>
        </view>

        <view class="top-tabs">
          <view class="menu-btn" @click="openSideMenu">☰</view>
          <view class="tab-group">
            <view
              v-for="(tab, index) in plazaTabs"
              :key="tab.key"
              class="plaza-tab"
              :class="{ active: activeTab === tab.key }"
              @click="switchPlazaTab(tab.key, index)"
            >
              {{ tab.label }}
            </view>
            <view class="tab-indicator" :style="{ transform: `translateX(${plazaTabs.findIndex((tab) => tab.key === activeTab) * 56}px)` }" />
          </view>
          <view class="search-btn" @click="goSearch">⌕</view>
        </view>

        <view class="category-row">
          <scroll-view class="category-scroll" scroll-x show-scrollbar="false">
            <view class="category-inner">
              <view
                v-for="(category, index) in displayCategories"
                :key="category"
                class="category-chip"
                :class="{ active: activeCategoryIndex === index }"
                @click="selectCategory(index)"
              >
                {{ category }}
              </view>
            </view>
          </scroll-view>
          <view class="filter-btn" @click="openFilter">≡</view>
        </view>

        <view class="waterfall-stage" :class="{ switching: isWaterfallSwitching }">
          <view v-if="!isInitialContentReady" class="initial-waterfall-placeholder">
            <view class="placeholder-column">
              <view class="placeholder-card tall" />
              <view class="placeholder-card short" />
            </view>
            <view class="placeholder-column">
              <view class="placeholder-card short" />
              <view class="placeholder-card tall" />
            </view>
          </view>

          <view v-else-if="isLoading && !isWaterfallSwitching" class="loading-card">
            <view class="spinner" />
          </view>

        <LumiPlazaWaterfall
          v-else-if="filteredWorks.length"
          :animation-class="waterfallAnimationClass"
          :display-like-count="displayLikeCount"
          :get-aspect-ratio="getAspectRatio"
          :get-user="getUser"
          :left-works="leftColumnWorks"
          :liked-work-ids="likedWorkIds"
          :render-key="renderKey"
          :right-works="rightColumnWorks"
          :switching="isWaterfallSwitching"
          @open-work="openWorkDetail"
          @open-user="goUserProfile"
          @toggle-like="toggleLike"
        />

        <view v-else-if="!useMockData && loadFailed" class="empty-state">
          <view class="empty-icon">!</view>
          <view class="empty-title">广场数据加载失败</view>
          <view class="empty-sub">请检查网络或稍后重试，当前不会显示模拟作品。</view>
          <button class="empty-action" @click="reloadPlazaData">重新加载</button>
        </view>

        <view v-else class="empty-state">
          <view class="empty-icon">{{ renderedTab === "favorite" ? "♡" : "⌕" }}</view>
          <view class="empty-title">{{ renderedTab === "favorite" ? "暂无收藏" : "暂无作品" }}</view>
          <view class="empty-sub">{{ renderedTab === "favorite" ? "在作品详情页收藏喜欢的创作" : "换个分类看看更多作品" }}</view>
        </view>

          <view class="switch-loading-card" :class="{ show: isWaterfallSwitching }">
            <view class="spinner" />
          </view>
        </view>

        <view v-if="isInitialContentReady && !isLoading && !isWaterfallSwitching && filteredWorks.length" class="load-more-hint" :class="{ 'is-loading': isLoadingMore }">
          <view v-if="isLoadingMore" class="spinner mini" />
          <text>{{ isLoadingMore ? "正在加载更多作品" : hasMoreWorks ? "继续往下滑获取更多作品" : "我也是有底线的~" }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="tab-bar">
      <view class="tab-item" @click="goHome">
        <text class="tab-icon">⌂</text>
        <text class="tab-label">首页</text>
      </view>
      <view class="tab-item active">
        <text class="tab-icon">◇</text>
        <text class="tab-label">广场</text>
      </view>
      <view class="tab-item center" @click="goCreate">
        <text class="tab-icon">✦</text>
        <text class="tab-label">创作</text>
      </view>
      <view class="tab-item" @click="goGallery">
        <text class="tab-icon">□</text>
        <text class="tab-label">画廊</text>
      </view>
      <view class="tab-item" @click="goMine">
        <text class="tab-icon">☺</text>
        <text class="tab-label">我的</text>
      </view>
    </view>

    <LumiSideDrawer
      v-if="sideDrawerMounted"
      :open="sideOpen"
      :user-name="isLoggedIn ? drawerDisplay.name : '点击登录'"
      :user-avatar="isLoggedIn ? drawerDisplay.avatar : '♙'"
      :user-color="isLoggedIn ? drawerDisplay.color : 'var(--bg-soft)'"
      :user-points="String(drawerDisplay.credits)"
      :quick-actions="sideQuickActions"
      :rows="sideRows"
      @close="closeSideMenu"
      @navigate="navigateSide"
    />
    <LumiLoginSheet v-if="loginSheetMounted" :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />

    <template v-if="filterMounted">
      <view class="sheet-overlay" :class="{ show: filterOpen }" @click="closeFilter" />
      <view class="filter-sheet" :class="{ show: filterOpen }">
      <view class="sheet-handle" />
      <view class="sheet-body">
        <view class="filter-title">分类</view>
        <view class="chip-wrap">
          <view
            v-for="cat in displayCategories"
            :key="`fc-${cat}`"
            class="chip chip-outline"
            :class="{ active: isFilterActive('category', cat) }"
            @click="toggleFilter('category', cat)"
          >
            {{ cat }}
          </view>
        </view>

        <view class="filter-title">模型</view>
        <view class="chip-wrap">
          <view
            v-for="model in filterModels"
            :key="`fm-${model}`"
            class="chip chip-outline"
            :class="{ active: isFilterActive('model', model) }"
            @click="toggleFilter('model', model)"
          >
            {{ model }}
          </view>
        </view>

        <view class="filter-title">尺寸</view>
        <view class="chip-wrap">
          <view
            v-for="size in filterSizes"
            :key="`fz-${size}`"
            class="chip chip-outline"
            :class="{ active: isFilterActive('size', size) }"
            @click="toggleFilter('size', size)"
          >
            {{ size }}
          </view>
        </view>

        <view class="filter-title">精度</view>
        <view class="chip-wrap">
          <view
            v-for="quality in filterQualities"
            :key="`fq-${quality}`"
            class="chip chip-outline"
            :class="{ active: isFilterActive('quality', quality) }"
            @click="toggleFilter('quality', quality)"
          >
            {{ quality }}
          </view>
        </view>

        <view class="filter-actions">
          <view class="btn btn-secondary" @click="resetPlazaFilter">重置</view>
          <view class="btn btn-gradient" @click="applyPlazaFilter">确认</view>
        </view>
      </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.plaza-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.plaza-scroll {
  position: absolute;
  inset: 0 0 80px;
  z-index: 1;
  box-sizing: border-box;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.plaza-scroll::-webkit-scrollbar,
.plaza-scroll .uni-scroll-view::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.plaza-content {
  padding-bottom: 12px;
}

.nav-header {
  position: relative;
  z-index: 1;
  background: var(--bg-base);
}

.nav-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--fg-primary);
}

.top-tabs {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 4px 16px;
}

.menu-btn,
.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 22px;
  color: var(--fg-primary);
}

.search-btn {
  font-size: 26px;
}

.tab-group {
  position: relative;
  display: flex;
  flex: 1;
  justify-content: center;
  gap: 22px;
  padding-bottom: 4px;
}

.plaza-tab {
  z-index: 1;
  width: 34px;
  font-size: 16px;
  font-weight: 500;
  color: var(--fg-muted);
  text-align: center;
  transition:
    color 0.3s ease,
    font-weight 0.3s ease;
}

.plaza-tab.active {
  font-weight: 700;
  color: var(--tab-active);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: calc(50% - 96px);
  width: 24px;
  height: 3px;
  background: var(--tab-active);
  border-radius: 999px;
  transition: transform 0.28s ease;
}

.category-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.category-scroll {
  flex: 1;
  overflow: hidden;
}

.category-inner {
  position: relative;
  display: flex;
  min-width: max-content;
  padding: 0 0 0 8px;
}

.category-inner::after {
  position: sticky;
  right: 0;
  width: 30px;
  content: "";
  background: linear-gradient(to right, transparent, var(--bg-base));
  pointer-events: none;
}

.category-chip {
  flex: 0 0 auto;
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 400;
  color: var(--fg-secondary);
  transition:
    color 0.3s ease,
    font-weight 0.3s ease;
}

.category-chip.active {
  font-weight: 600;
  color: var(--tab-active);
}

.filter-btn {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 36px;
  font-size: 20px;
  color: var(--fg-primary);
  border-left: 0.5px solid var(--border);
}

.waterfall-stage {
  position: relative;
  min-height: 320px;
}

.initial-waterfall-placeholder {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 0 8px;
}

.placeholder-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.placeholder-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  opacity: 0.72;
}

.placeholder-card.tall {
  height: 238px;
}

.placeholder-card.short {
  height: 178px;
}

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

.empty-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112px;
  height: 38px;
  padding: 0 18px;
  margin: 16px auto 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 999px;
  box-shadow: 0 10px 22px rgba(91, 159, 232, 0.2);
}

.empty-action::after {
  border: none;
}

.load-more-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 16px 0 10px;
  font-size: 12px;
  color: var(--fg-muted);
}

.load-more-hint.is-loading {
  color: var(--accent);
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
  height: 80px;
  padding-bottom: 16px;
  box-sizing: border-box;
  background: var(--bg-glass);
  border-top: 0.5px solid var(--border);
  box-shadow: 0 -2px 20px rgba(60, 120, 200, 0.06);
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
  margin-top: -10px;
}

.tab-item.center .tab-icon {
  width: 40px;
  height: 40px;
  font-size: 24px;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3 0%, #5b9fe8 50%, #6fd4b0 100%);
  border-radius: 50%;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.12),
    inset 0 2px 4px rgba(255, 255, 255, 0.6),
    inset 0 -2px 4px rgba(0, 0, 0, 0.08);
}

.tab-item.center .tab-label {
  margin-top: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.sheet-overlay {
  position: absolute;
  inset: 0;
  z-index: 150;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.3s ease,
    visibility 0.3s;
}

.sheet-overlay.show {
  opacity: 1;
  visibility: visible;
}

.filter-sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 200;
  max-height: 80%;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.18);
  transform: translateY(100%);
  visibility: hidden;
  transition:
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0.4s;
}

.filter-sheet.show {
  transform: translateY(0);
  visibility: visible;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 10px auto 4px;
  background: var(--border-strong);
  border-radius: 2px;
}

.sheet-body {
  padding: 8px 20px 24px;
}

.filter-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--fg-primary);
}

.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.chip {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.chip-outline {
  color: var(--fg-secondary);
  background: transparent;
  border: 1px solid var(--border-strong);
}

.chip-outline.active {
  color: var(--accent-deep);
  background: var(--accent-soft);
  border-color: var(--accent);
}

.plaza-page.theme-dark .chip-outline.active,
:root[data-theme="dark"] .chip-outline.active {
  color: var(--tab-active-fg);
  background: var(--tab-active);
  border-color: var(--tab-active);
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.btn {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
  transition: transform 0.2s ease;
}

.btn:active {
  transform: scale(0.97);
}

.btn-secondary {
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
}

.btn-gradient {
  color: #fff;
  background: var(--gradient-dream);
}
</style>
