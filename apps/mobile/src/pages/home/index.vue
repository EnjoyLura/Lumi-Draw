<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, reactive, ref } from "vue";
import { onLoad, onReady, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import GalleryPage from "../gallery/index.vue";
import MinePage from "../mine/index.vue";
import PlazaPage from "../plaza/index.vue";
import {
  gameplays as mockGameplays,
  homeAnnouncements as mockHomeAnnouncements,
  homeBanners as mockHomeBanners,
  homeUsers as mockHomeUsers,
  homeWorks as mockHomeWorks,
  type Gameplay,
  type HomeAnnouncement,
  type HomeBanner,
  type HomeUser,
  type HomeWork
} from "./homeData";
import { fetchHomeBootstrap, fetchHomeFeed } from "./homeService";
import { useDataMode } from "../../services/dataMode";
import { useTheme } from "../../services/theme";
import { goRootTab } from "../../services/tabNavigation";
import { activeEmbeddedPrimaryTab, setEmbeddedPrimaryTab } from "../../services/primaryShell";
import { invalidateTabPage, refreshTabPage } from "../../services/tabPageCache";
import { savePendingInviteCode, useAuth } from "../../services/auth";
import { toggleWorkLike } from "../../services/social";
import { fetchUnreadMessageCount } from "../mine/mineService";
import {
  getWaterfallAnimationClass,
  getWaterfallDirection,
  WATERFALL_ANIMATION_DURATION,
  WATERFALL_LOADING_FRAME_DELAY,
  WATERFALL_SWITCH_DELAY
} from "../../services/waterfallTransition";

type HomeTab = "recommend" | "new";
const FEED_PAGE_SIZE = 8;
const ANNOUNCEMENT_SESSION_KEY = "lumi-home-announcement-shown-session";
const lumiRuntime = globalThis as typeof globalThis & { __lumiHomeAnnouncementShown?: boolean };
const { useMockData } = useDataMode();

const statusBarHeight = ref(0);
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight ?? 0;
} catch {
  statusBarHeight.value = 0;
}

const activeBanner = ref(0);
const selectedHomeTab = ref<HomeTab>("recommend");
const renderedHomeTab = ref<HomeTab>("recommend");
const bannerList = ref<HomeBanner[]>(useMockData.value ? mockHomeBanners : []);
const announcementList = ref<HomeAnnouncement[]>(useMockData.value ? mockHomeAnnouncements : []);
const gameplayList = ref<Gameplay[]>(useMockData.value ? mockGameplays : []);
const userList = ref<HomeUser[]>(useMockData.value ? mockHomeUsers : []);
const recommendWorks = ref<HomeWork[]>(useMockData.value ? mockHomeWorks : []);
const latestWorks = ref<HomeWork[]>(useMockData.value ? [...mockHomeWorks].reverse() : []);
const likedWorkIds = ref<Set<number>>(new Set());
const likePendingIds = ref<Set<number>>(new Set());
const showLoginSheet = ref(false);
const showAnnouncementPopup = ref(false);
const unreadMessageCount = ref(0);
const visibleWorkCount = ref(8);
const isPageLoading = ref(!useMockData.value);
const isWorksSwitching = ref(false);
const isLoadingMore = ref(false);
const loadFailed = ref(false);
const worksRenderKey = ref(0);
const waterfallAnimationClass = ref("");
const plazaMounted = ref(false);
const galleryMounted = ref(false);
const mineMounted = ref(false);
const { themeClass } = useTheme();
const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const feedState = reactive({
  recommend: { page: 1, hasMore: false },
  new: { page: 1, hasMore: false }
});

let loadMoreTimer: ReturnType<typeof setTimeout> | undefined;
let announcementTimer: ReturnType<typeof setTimeout> | undefined;
let worksSwitchTimer: ReturnType<typeof setTimeout> | undefined;
let worksAnimationTimer: ReturnType<typeof setTimeout> | undefined;
let lastLoadKey = useMockData.value ? "mock" : "";
let lastInviteCode = "";

const currentTabWorks = computed(() => {
  return renderedHomeTab.value === "new" ? latestWorks.value : recommendWorks.value;
});

const displayedWorks = computed(() => currentTabWorks.value.slice(0, visibleWorkCount.value));
const leftColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 1));
const currentFeedState = computed(() => (renderedHomeTab.value === "new" ? feedState.new : feedState.recommend));
const hasMoreWorks = computed(() => visibleWorkCount.value < currentTabWorks.value.length || (!useMockData.value && currentFeedState.value.hasMore));
const popupAnnouncement = computed(() => announcementList.value.find((item) => item.popup));
const showUnreadDot = computed(() => useMockData.value || unreadMessageCount.value > 0);
const isWaterfallSwitching = computed(() => selectedHomeTab.value !== renderedHomeTab.value);

onLoad((query) => {
  applyInviteCode(query);
});

onShow(() => {
  setEmbeddedPrimaryTab("home");
  applyInviteCode();
  void loadUnreadMessages();
  const loadKey = `${useMockData.value}-${isLoggedIn.value}`;
  const changed = lastLoadKey !== loadKey;
  lastLoadKey = loadKey;
  void loadHomeData(changed);
});

onReady(() => {
  setTimeout(() => {
    plazaMounted.value = true;
    galleryMounted.value = true;
    mineMounted.value = true;
  }, 0);
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", handleHashChange);
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("hashchange", handleHashChange);
});

onBeforeUnmount(() => {
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  if (announcementTimer) clearTimeout(announcementTimer);
  clearWorksSwitchTimers();
});

function handleHashChange() {
  applyInviteCode();
}

function resolveInviteCode(query?: Record<string, unknown>) {
  const queryCode = typeof query?.inviteCode === "string" ? query.inviteCode : "";
  if (queryCode) return decodeURIComponent(queryCode);

  if (typeof window !== "undefined") {
    const hashCode = window.location.hash.match(/[?&]inviteCode=([^&]+)/)?.[1];
    if (hashCode) return decodeURIComponent(hashCode);
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  const pageCode = current?.options?.inviteCode || current?.$page?.options?.inviteCode || "";
  return pageCode ? decodeURIComponent(pageCode) : "";
}

function applyInviteCode(query?: Record<string, unknown>) {
  const inviteCode = resolveInviteCode(query).trim();
  if (!inviteCode || inviteCode === lastInviteCode) return;
  lastInviteCode = inviteCode;
  savePendingInviteCode(inviteCode);
  uni.showToast({ title: "已记录邀请码，登录后自动绑定", icon: "none" });
}

function resetMockHomeData() {
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  clearWorksSwitchTimers();
  isPageLoading.value = false;
  isLoadingMore.value = false;
  loadFailed.value = false;
  bannerList.value = mockHomeBanners;
  announcementList.value = mockHomeAnnouncements;
  gameplayList.value = mockGameplays;
  userList.value = mockHomeUsers;
  recommendWorks.value = mockHomeWorks;
  latestWorks.value = [...mockHomeWorks].reverse();
  feedState.recommend = { page: 1, hasMore: false };
  feedState.new = { page: 1, hasMore: false };
  visibleWorkCount.value = 8;
  worksRenderKey.value += 1;
  scheduleAnnouncementPopup();
}

function clearRealHomeData() {
  if (announcementTimer) clearTimeout(announcementTimer);
  clearWorksSwitchTimers();
  showAnnouncementPopup.value = false;
  bannerList.value = [];
  announcementList.value = [];
  gameplayList.value = [];
  userList.value = [];
  recommendWorks.value = [];
  latestWorks.value = [];
  likedWorkIds.value = new Set();
  feedState.recommend = { page: 1, hasMore: false };
  feedState.new = { page: 1, hasMore: false };
  visibleWorkCount.value = 8;
  worksRenderKey.value += 1;
}

async function loadUnreadMessages() {
  if (useMockData.value || !isLoggedIn.value) {
    unreadMessageCount.value = 0;
    return;
  }
  try {
    unreadMessageCount.value = await fetchUnreadMessageCount();
  } catch {
    unreadMessageCount.value = 0;
  }
}

function mergeUsers(nextUsers: HomeUser[]) {
  const map = new Map<number, HomeUser>();
  userList.value.forEach((user) => map.set(user.id, user));
  nextUsers.forEach((user) => map.set(user.id, user));
  userList.value = Array.from(map.values());
}

async function loadHomeData(force = false) {
  if (useMockData.value) {
    resetMockHomeData();
    return;
  }

  const timestampKey = "home";
  await refreshTabPage(timestampKey, async () => {
  isPageLoading.value = !recommendWorks.value.length && !latestWorks.value.length;
  loadFailed.value = false;
  try {
    const requestOptions = isLoggedIn.value ? undefined : { skipAuth: true };
    const [bootstrap, recommendFeed, latestFeed] = await Promise.all([
      fetchHomeBootstrap(),
      fetchHomeFeed("recommend", 1, FEED_PAGE_SIZE, requestOptions),
      fetchHomeFeed("latest", 1, FEED_PAGE_SIZE, requestOptions)
    ]);

    bannerList.value = bootstrap.banners;
    announcementList.value = bootstrap.announcements;
    gameplayList.value = bootstrap.gameplays;
    recommendWorks.value = recommendFeed.works;
    latestWorks.value = latestFeed.works;
    syncLikedWorkIds([...recommendFeed.works, ...latestFeed.works]);
    userList.value = [];
    mergeUsers([...recommendFeed.users, ...latestFeed.users]);
    feedState.recommend = { page: recommendFeed.page, hasMore: recommendFeed.hasMore };
    feedState.new = { page: latestFeed.page, hasMore: latestFeed.hasMore };
    visibleWorkCount.value = 8;
    worksRenderKey.value += 1;
    scheduleAnnouncementPopup();
  } catch (error) {
    if (!recommendWorks.value.length && !latestWorks.value.length) clearRealHomeData();
    loadFailed.value = true;
    uni.showToast({ title: "首页数据加载失败，请稍后重试", icon: "none" });
    throw error;
  } finally {
    isPageLoading.value = false;
  }
  }, { force });
}

function refreshHomeData() {
  invalidateTabPage("home");
  return loadHomeData(true);
}

function showUnsupportedBanner(title: string) {
  uni.showToast({ title: `${title}入口未配置`, icon: "none" });
}

function hasShownHomeAnnouncementThisSession() {
  if (lumiRuntime.__lumiHomeAnnouncementShown) return true;
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(ANNOUNCEMENT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markHomeAnnouncementShown() {
  lumiRuntime.__lumiHomeAnnouncementShown = true;
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(ANNOUNCEMENT_SESSION_KEY, "1");
  } catch {
    // Some mini-program preview environments do not expose sessionStorage.
  }
}

function scheduleAnnouncementPopup() {
  if (announcementTimer) clearTimeout(announcementTimer);
  const announcement = popupAnnouncement.value;
  showAnnouncementPopup.value = false;
  if (!announcement || hasShownHomeAnnouncementThisSession()) return;
  announcementTimer = setTimeout(() => {
    markHomeAnnouncementShown();
    showAnnouncementPopup.value = true;
  }, 1200);
}

function closeAnnouncement() {
  showAnnouncementPopup.value = false;
}

function dismissAnnouncementWeek() {
  closeAnnouncement();
}

function handleAnnouncementAction() {
  const announcement = popupAnnouncement.value;
  if (!announcement) return;
  closeAnnouncement();
  handleBannerTap(announcement.action, announcement.title);
}

const bannerActionRoutes: Record<string, string> = {
  checkin: "/pages/checkin/index",
  签到页: "/pages/checkin/index",
  create: "/pages/create/index",
  创作页: "/pages/create/index",
  membership: "/pages/membership/index",
  会员页: "/pages/membership/index",
  publish: "/pages/publish/index",
  发布页: "/pages/publish/index",
  recharge: "/pages/recharge/index",
  充值页: "/pages/recharge/index",
  invite: "/pages/invite/index",
  邀请页: "/pages/invite/index",
  plaza: "/pages/plaza/index",
  广场页: "/pages/plaza/index",
  gallery: "/pages/gallery/index",
  画廊页: "/pages/gallery/index",
  messages: "/pages/messages/index",
  消息页: "/pages/messages/index",
  "all-gameplays": "/pages/all-gameplays/index",
  全部玩法: "/pages/all-gameplays/index",
  "reverse-prompt": "/pages/reverse-prompt/index",
  反推提示词: "/pages/reverse-prompt/index"
};

const registeredPageRoutes = new Set([
  "/pages/home/index",
  "/pages/create/index",
  "/pages/plaza/index",
  "/pages/gallery/index",
  "/pages/generation-history/index",
  "/pages/mine/index",
  "/pages/all-gameplays/index",
  "/pages/search/index",
  "/pages/reverse-prompt/index",
  "/pages/work-detail/index",
  "/pages/report/index",
  "/pages/user-profile/index",
  "/pages/recharge/index",
  "/pages/checkin/index",
  "/pages/invite/index",
  "/pages/membership/index",
  "/pages/messages/index",
  "/pages/message-detail/index",
  "/pages/settings/index",
  "/pages/agreement/index",
  "/pages/edit-profile/index",
  "/pages/feedback/index",
  "/pages/changelog/index",
  "/pages/publish/index",
  "/pages/edit-work/index",
  "/pages/drafts/index",
  "/pages/history/index",
  "/pages/follow-list/index"
]);

function resolvePageAction(action: string) {
  const value = action.trim();
  if (!value) return "";
  const route = bannerActionRoutes[value];
  if (route) return route;
  if (!value.startsWith("/pages/")) return "";

  const [path] = value.split("?");
  return registeredPageRoutes.has(path) ? value : "";
}

function selectGameplay(name: string) {
  uni.navigateTo({
    url: `/pages/create/index?gameplay=${encodeURIComponent(name)}`
  });
}

function goCreate() {
  uni.navigateTo({
    url: "/pages/create/index"
  });
}

function goPlaza() {
  if (plazaMounted.value) {
    setEmbeddedPrimaryTab("plaza");
    return;
  }
  plazaMounted.value = true;
  void nextTick(() => setEmbeddedPrimaryTab("plaza"));
}

function goMessages() {
  uni.navigateTo({
    url: "/pages/messages/index"
  });
}

function goUserProfile(userId: number) {
  uni.navigateTo({
    url: `/pages/user-profile/index?id=${userId}`
  });
}

function goGallery() {
  if (galleryMounted.value) {
    setEmbeddedPrimaryTab("gallery");
    return;
  }
  galleryMounted.value = true;
  void nextTick(() => setEmbeddedPrimaryTab("gallery"));
}

function goMine() {
  if (mineMounted.value) {
    setEmbeddedPrimaryTab("mine");
    return;
  }
  mineMounted.value = true;
  void nextTick(() => setEmbeddedPrimaryTab("mine"));
}

function goAllGameplays() {
  uni.navigateTo({
    url: "/pages/all-gameplays/index"
  });
}

function handleBannerTap(action: string, title: string) {
  const route = resolvePageAction(action);
  if (route) {
    uni.navigateTo({ url: route });
    return;
  }

  if (!action || action === "无" || action === "none") {
    return;
  }

  showUnsupportedBanner(title);
}

function openWorkDetail(workId: number) {
  uni.navigateTo({
    url: `/pages/work-detail/index?id=${workId}`
  });
}

function clearWorksSwitchTimers() {
  if (worksSwitchTimer) clearTimeout(worksSwitchTimer);
  if (worksAnimationTimer) clearTimeout(worksAnimationTimer);
  worksSwitchTimer = undefined;
  worksAnimationTimer = undefined;
  isWorksSwitching.value = false;
  waterfallAnimationClass.value = "";
}

function playWaterfallAnimation(direction: ReturnType<typeof getWaterfallDirection>) {
  if (worksAnimationTimer) clearTimeout(worksAnimationTimer);
  waterfallAnimationClass.value = getWaterfallAnimationClass(direction);
  worksAnimationTimer = setTimeout(() => {
    waterfallAnimationClass.value = "";
    worksAnimationTimer = undefined;
  }, WATERFALL_ANIMATION_DURATION);
}

function switchHomeTab(tab: HomeTab) {
  if (tab === selectedHomeTab.value || isPageLoading.value || isWorksSwitching.value) return;

  const previousIndex = selectedHomeTab.value === "new" ? 1 : 0;
  const nextIndex = tab === "new" ? 1 : 0;
  const direction = getWaterfallDirection(nextIndex, previousIndex);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  isLoadingMore.value = false;
  selectedHomeTab.value = tab;
  visibleWorkCount.value = 8;
  isWorksSwitching.value = true;
  waterfallAnimationClass.value = "";
  if (worksSwitchTimer) clearTimeout(worksSwitchTimer);
  worksSwitchTimer = setTimeout(() => {
    if (!isWorksSwitching.value || selectedHomeTab.value !== tab) return;
    worksSwitchTimer = setTimeout(() => {
      renderedHomeTab.value = tab;
      worksRenderKey.value += 1;
      isWorksSwitching.value = false;
      worksSwitchTimer = undefined;
      playWaterfallAnimation(direction);
    }, WATERFALL_SWITCH_DELAY);
  }, WATERFALL_LOADING_FRAME_DELAY);
}

async function loadMoreFeed() {
  const tab = renderedHomeTab.value;
  const state = tab === "new" ? feedState.new : feedState.recommend;
  if (useMockData.value || !state.hasMore) return false;

  try {
    const nextPage = state.page + 1;
    const requestOptions = isLoggedIn.value ? undefined : { skipAuth: true };
    const feed = await fetchHomeFeed(tab === "new" ? "latest" : "recommend", nextPage, FEED_PAGE_SIZE, requestOptions);
    if (tab === "new") {
      latestWorks.value = [...latestWorks.value, ...feed.works];
      feedState.new = { page: feed.page, hasMore: feed.hasMore };
    } else {
      recommendWorks.value = [...recommendWorks.value, ...feed.works];
      feedState.recommend = { page: feed.page, hasMore: feed.hasMore };
    }
    syncLikedWorkIds(feed.works, likedWorkIds.value);
    mergeUsers(feed.users);
    return feed.works.length > 0;
  } catch {
    uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
    return false;
  }
}

function handleReachBottom() {
  if (isLoadingMore.value) return;

  isLoadingMore.value = true;
  if (loadMoreTimer) clearTimeout(loadMoreTimer);

  loadMoreTimer = setTimeout(async () => {
    if (visibleWorkCount.value >= currentTabWorks.value.length) {
      await loadMoreFeed();
    }

    if (hasMoreWorks.value) {
      visibleWorkCount.value = Math.min(visibleWorkCount.value + 2, currentTabWorks.value.length);
      worksRenderKey.value += 1;
    } else {
      worksRenderKey.value += 1;
      uni.showToast({
        title: "已刷新最新作品",
        icon: "none"
      });
    }

    isLoadingMore.value = false;
  }, 650);
}

function openLoginSheet() {
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
}

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    await Promise.all([refreshHomeData(), loadUnreadMessages()]);
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function syncLikedWorkIds(works: HomeWork[], base?: Set<number>) {
  const next = new Set(base);
  works.forEach((work) => {
    if (work.liked) next.add(work.id);
    else next.delete(work.id);
  });
  likedWorkIds.value = next;
}

function setPendingLike(workId: number, pending: boolean) {
  const next = new Set(likePendingIds.value);
  if (pending) next.add(workId);
  else next.delete(workId);
  likePendingIds.value = next;
}

function updateWorkLikeCount(workId: number, likes: number) {
  const update = (work: HomeWork) => (work.id === workId ? { ...work, likes } : work);
  recommendWorks.value = recommendWorks.value.map(update);
  latestWorks.value = latestWorks.value.map(update);
}

function displayLikeCount(work: HomeWork) {
  return work.likes + (useMockData.value && likedWorkIds.value.has(work.id) ? 1 : 0);
}

async function toggleLike(work: HomeWork) {
  if (!useMockData.value && !ensureLogin()) return;
  if (likePendingIds.value.has(work.id)) return;

  if (!useMockData.value) {
    setPendingLike(work.id, true);
    try {
      const result = await toggleWorkLike(work.id);
      const next = new Set(likedWorkIds.value);
      if (result.liked) next.add(work.id);
      else next.delete(work.id);
      likedWorkIds.value = next;
      updateWorkLikeCount(work.id, result.likes);
    } catch {
      uni.showToast({ title: "点赞失败，请稍后重试", icon: "none" });
    } finally {
      setPendingLike(work.id, false);
    }
    return;
  }

  const next = new Set(likedWorkIds.value);
  if (next.has(work.id)) {
    next.delete(work.id);
  } else {
    next.add(work.id);
  }
  likedWorkIds.value = next;
}

function getUser(userId: number) {
  const fallbackName = userId ? `用户${userId}` : "未知用户";
  return userList.value.find((user) => user.id === userId) ?? {
    id: userId,
    name: fallbackName,
    avatar: "U",
    color: "var(--accent)"
  };
}

function getWorkTitle(work: HomeWork) {
  return work.title || work.prompt.slice(0, 20);
}

function getRatioClass(ratio: string) {
  if (ratio === "1:1") return "ratio-square";
  if (ratio === "4:3" || ratio === "16:9") return "ratio-wide";
  if (ratio === "9:16") return "ratio-portrait";
  return "ratio-tall";
}
</script>

<template>
  <view v-show="activeEmbeddedPrimaryTab === 'home'" class="home-page" :class="themeClass">
    <scroll-view
      class="content-area"
      scroll-y
      :lower-threshold="80"
      @scrolltolower="handleReachBottom"
    >
      <view class="nav-header">
        <view class="status-spacer" :style="{ height: statusBarHeight + 'px' }" />
        <view class="nav-row">
          <view class="nav-notify" @click="goMessages">
            <view class="nav-notify-icon" />
            <view v-if="showUnreadDot" class="nav-notify-dot" />
          </view>
          <text class="nav-title">露米绘画</text>
        </view>
      </view>

      <view class="home-content">
        <view v-if="!useMockData && loadFailed" class="home-failure">
          <view class="failure-icon">!</view>
          <view class="failure-title">首页数据加载失败</view>
          <view class="failure-sub">请检查网络或稍后重试，当前不会显示模拟内容。</view>
          <button class="failure-action" @click="refreshHomeData">重新加载</button>
        </view>

        <template v-else>
        <view v-if="bannerList.length" class="banner-card">
          <swiper
            class="banner-swiper"
            circular
            autoplay
            :interval="4000"
            :current="activeBanner"
            @change="activeBanner = $event.detail.current"
          >
            <swiper-item v-for="banner in bannerList" :key="banner.title">
              <view class="banner-slide" @click="handleBannerTap(banner.action, banner.title)">
                <image class="banner-image" :src="banner.image" mode="aspectFill" />
                <view class="banner-shade" />
                <view class="banner-copy">
                  <text class="banner-title">{{ banner.title }}</text>
                  <text class="banner-desc">{{ banner.description }}</text>
                </view>
                <view class="banner-action">了解更多</view>
              </view>
            </swiper-item>
          </swiper>
          <view class="banner-dots">
            <text
              v-for="(_, index) in bannerList"
              :key="index"
              class="banner-dot"
              :class="{ active: index === activeBanner }"
            />
          </view>
        </view>
        <view v-else class="home-empty-card">
          <view class="home-empty-title">暂无走马灯</view>
          <view class="home-empty-sub">后台配置走马灯后会显示在这里。</view>
        </view>

        <view class="section-title">
          <text>热门玩法</text>
          <view class="more-link" @click="goAllGameplays">
            <text>全部</text>
            <text class="chevron">›</text>
          </view>
        </view>

        <scroll-view v-if="gameplayList.length" class="gameplay-scroll" scroll-x>
          <view class="gameplay-list">
            <view
              v-for="gameplay in gameplayList"
              :key="gameplay.name"
              class="gameplay-card"
              @click="selectGameplay(gameplay.name)"
            >
              <image class="gameplay-img" :src="gameplay.image" mode="aspectFill" />
              <view class="gameplay-overlay" />
              <view v-if="gameplay.hot" class="hot-badge">HOT</view>
              <view class="gameplay-info">
                <text class="gameplay-name">{{ gameplay.name }}</text>
                <text class="gameplay-uses">♨ {{ gameplay.uses }}人用过</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view v-else class="home-empty-card compact">
          <view class="home-empty-title">暂无玩法模板</view>
          <view class="home-empty-sub">后台配置玩法后会显示在这里。</view>
        </view>

        <view class="section-title works-title">
          <text>精选作品</text>
          <view class="home-tabs">
            <view
              class="home-tab"
              :class="{ active: selectedHomeTab === 'recommend' }"
              @click="switchHomeTab('recommend')"
            >
              推荐
            </view>
            <view
              class="home-tab"
              :class="{ active: selectedHomeTab === 'new' }"
              @click="switchHomeTab('new')"
            >
              最新
            </view>
            <view class="tab-indicator" :class="{ right: selectedHomeTab === 'new' }" />
          </view>
        </view>

        <view class="works-stage" :class="{ switching: isWaterfallSwitching }">
          <view v-if="isPageLoading" class="works-loading">
            <view class="loading-spinner" />
          </view>

          <view v-else :key="worksRenderKey" class="waterfall" :class="waterfallAnimationClass">
            <view class="waterfall-col">
              <view v-for="work in leftColumnWorks" :key="work.id" class="work-card">
                <view class="work-media" :class="getRatioClass(work.ratio)" @click="openWorkDetail(work.id)">
                  <image class="work-image" :src="work.image" mode="aspectFill" lazy-load />
                </view>
                <view class="work-body">
                  <text class="work-title">{{ getWorkTitle(work) }}</text>
                  <view class="work-meta">
                    <view class="author" @click.stop="goUserProfile(work.userId)">
                      <view class="avatar" :style="{ background: getUser(work.userId).color }">
                        {{ getUser(work.userId).avatar }}
                      </view>
                      <text class="author-name">{{ getUser(work.userId).name }}</text>
                    </view>
                    <view
                      class="like"
                      :class="{ liked: likedWorkIds.has(work.id) }"
                      @click.stop="toggleLike(work)"
                    >
                      <text class="like-heart">{{ likedWorkIds.has(work.id) ? "♥" : "♡" }}</text>
                      <text>{{ displayLikeCount(work) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view class="waterfall-col">
              <view v-for="work in rightColumnWorks" :key="work.id" class="work-card">
                <view class="work-media" :class="getRatioClass(work.ratio)" @click="openWorkDetail(work.id)">
                  <image class="work-image" :src="work.image" mode="aspectFill" lazy-load />
                </view>
                <view class="work-body">
                  <text class="work-title">{{ getWorkTitle(work) }}</text>
                  <view class="work-meta">
                    <view class="author" @click.stop="goUserProfile(work.userId)">
                      <view class="avatar" :style="{ background: getUser(work.userId).color }">
                        {{ getUser(work.userId).avatar }}
                      </view>
                      <text class="author-name">{{ getUser(work.userId).name }}</text>
                    </view>
                    <view
                      class="like"
                      :class="{ liked: likedWorkIds.has(work.id) }"
                      @click.stop="toggleLike(work)"
                    >
                      <text class="like-heart">{{ likedWorkIds.has(work.id) ? "♥" : "♡" }}</text>
                      <text>{{ displayLikeCount(work) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="switch-loading-card" :class="{ show: isWaterfallSwitching }">
            <view class="loading-spinner" />
          </view>
        </view>

        <view class="load-more-hint" :class="{ 'is-loading': isLoadingMore }">
          <view v-if="isLoadingMore" class="mini-spinner" />
          <text>
            {{ isLoadingMore ? "正在加载更多作品" : hasMoreWorks ? "继续往下滑获取更多作品" : "我也是有底线的~" }}
          </text>
        </view>
        </template>
      </view>
    </scroll-view>

    <view class="tab-bar">
      <view class="tab-item active">
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
      <view class="tab-item" @click="goGallery">
        <text class="tab-icon">□</text>
        <text class="tab-label">画廊</text>
      </view>
      <view class="tab-item" @click="goMine">
        <text class="tab-icon">☺</text>
        <text class="tab-label">我的</text>
      </view>
    </view>
    <view v-if="showAnnouncementPopup && popupAnnouncement" class="announcement-overlay" @click="closeAnnouncement" />
    <view class="announcement-popup" :class="{ show: showAnnouncementPopup && popupAnnouncement }">
      <view v-if="popupAnnouncement" class="announcement-card">
        <view class="announcement-media">
          <image class="announcement-img" :src="popupAnnouncement.image" mode="aspectFill" />
          <view class="announcement-shade" />
          <view class="announcement-title">{{ popupAnnouncement.title }}</view>
        </view>
        <view class="announcement-body">
          <view class="announcement-summary">{{ popupAnnouncement.summary }}</view>
          <button class="announcement-action" @click="handleAnnouncementAction">前往参与</button>
          <view class="announcement-dismiss" @click="dismissAnnouncementWeek">知道了</view>
        </view>
      </view>
      <view class="announcement-close" @click="closeAnnouncement">×</view>
    </view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
  <PlazaPage v-if="plazaMounted" v-show="activeEmbeddedPrimaryTab === 'plaza'" />
  <GalleryPage v-if="galleryMounted" v-show="activeEmbeddedPrimaryTab === 'gallery'" />
  <MinePage v-if="mineMounted" v-show="activeEmbeddedPrimaryTab === 'mine'" />
</template>

<style scoped>
.home-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
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

.nav-notify {
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.nav-notify-icon {
  width: 21px;
  height: 21px;
  background: var(--fg-primary);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2a7 7 0 0 0-7 7v4.586l-1.707 1.707A1 1 0 0 0 4 17h16a1 1 0 0 0 .707-1.707L19 13.586V9a7 7 0 0 0-7-7zm0 20a3 3 0 0 0 2.995-2.824L15 19H9a3 3 0 0 0 3 3z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2a7 7 0 0 0-7 7v4.586l-1.707 1.707A1 1 0 0 0 4 17h16a1 1 0 0 0 .707-1.707L19 13.586V9a7 7 0 0 0-7-7zm0 20a3 3 0 0 0 2.995-2.824L15 19H9a3 3 0 0 0 3 3z'/%3E%3C/svg%3E") center / contain no-repeat;
}

.nav-notify-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  background: var(--rose);
  border-radius: 50%;
}

.home-page::after {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: "";
  background:
    radial-gradient(ellipse 120% 40% at 80% 0%, rgba(91, 159, 232, 0.06), transparent 60%),
    radial-gradient(ellipse 100% 30% at 10% 100%, rgba(111, 212, 176, 0.04), transparent 50%);
}

.home-page.theme-dark::after,
:root[data-theme="dark"] .home-page::after {
  background: none;
}

.content-area {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 80px;
  left: 0;
  z-index: 1;
  box-sizing: border-box;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.content-area::-webkit-scrollbar,
.gameplay-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.content-area :deep(.uni-scroll-view),
.gameplay-scroll :deep(.uni-scroll-view) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.content-area :deep(.uni-scroll-view::-webkit-scrollbar),
.gameplay-scroll :deep(.uni-scroll-view::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

.home-content {
  padding: 12px 0 20px;
}

.home-failure {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 58vh;
  padding: 44px 24px;
  text-align: center;
}

.failure-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 14px;
  font-size: 30px;
  font-weight: 900;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 18px;
}

.failure-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 800;
  color: var(--fg-primary);
}

.failure-sub {
  max-width: 280px;
  margin-bottom: 22px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-secondary);
}

.failure-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 132px;
  height: 42px;
  padding: 0 22px;
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(91, 159, 232, 0.2);
}

.failure-action::after {
  border: none;
}

.banner-card {
  position: relative;
  height: 150px;
  margin: 0 12px 16px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.home-empty-card {
  padding: 26px 18px;
  margin: 0 12px 16px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.home-empty-card.compact {
  margin: 0 16px 16px;
}

.home-empty-title {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 800;
  color: var(--fg-primary);
}

.home-empty-sub {
  font-size: 12px;
  color: var(--fg-secondary);
}

.banner-swiper,
.banner-slide,
.banner-image {
  width: 100%;
  height: 150px;
}

.banner-slide {
  position: relative;
  overflow: hidden;
}

.banner-shade {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 88px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

.banner-copy {
  position: absolute;
  bottom: 20px;
  left: 16px;
  display: flex;
  flex-direction: column;
  max-width: 250px;
  color: #fff;
}

.banner-title {
  margin-bottom: 3px;
  font-size: 15px;
  font-weight: 700;
}

.banner-desc {
  font-size: 11px;
  line-height: 1.4;
  opacity: 0.86;
}

.banner-action {
  position: absolute;
  top: 50%;
  right: 16px;
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-50%);
  backdrop-filter: blur(12px) saturate(180%);
}

.banner-dots {
  position: absolute;
  right: 0;
  bottom: 8px;
  left: 0;
  display: flex;
  gap: 6px;
  justify-content: center;
}

.banner-dot {
  width: 6px;
  height: 6px;
  background: var(--accent-soft);
  border-radius: 50%;
  transition: all 0.3s;
}

.banner-dot.active {
  width: 20px;
  background: var(--accent);
  border-radius: 999px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 700;
}

.more-link {
  display: flex;
  gap: 2px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.home-page.theme-dark .more-link,
:root[data-theme="dark"] .more-link {
  color: #fff;
}

.chevron {
  font-size: 20px;
  line-height: 1;
}

.gameplay-scroll {
  width: 100%;
  margin-bottom: 18px;
  white-space: nowrap;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.gameplay-list {
  display: flex;
  gap: 8px;
  padding: 0 16px;
}

.gameplay-card {
  position: relative;
  flex: 0 0 auto;
  width: 90px;
  height: 120px;
  overflow: hidden;
  border-radius: 7px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.gameplay-img {
  width: 90px;
  height: 120px;
}

.gameplay-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.1) 50%, transparent);
}

.hot-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(238, 90, 36, 0.35);
}

.gameplay-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.gameplay-name {
  margin-bottom: 2px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.gameplay-uses {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
}

.works-title {
  padding: 0 12px;
}

.home-tabs {
  position: relative;
  display: flex;
  gap: 16px;
  padding-bottom: 4px;
}

.home-tab {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg-muted);
  transition:
    color 0.25s ease,
    font-weight 0.25s ease,
    transform 0.25s ease;
}

.home-tab.active {
  font-weight: 700;
  color: var(--tab-active);
  transform: translateY(-1px);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 4px;
  width: 20px;
  height: 3px;
  background: var(--tab-active);
  border-radius: 999px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-indicator.right {
  transform: translateX(42px);
}

.works-stage {
  position: relative;
  min-height: 420px;
}

.works-stage.switching .waterfall {
  opacity: 0;
}

.waterfall {
  display: flex;
  gap: 6px;
  padding: 0 8px;
}

.waterfall-col {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.work-card {
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.works-loading {
  display: flex;
  justify-content: center;
  padding: 20px 0;
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

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.work-media {
  width: 100%;
  overflow: hidden;
  background: var(--bg-soft);
}

.ratio-square {
  height: 172px;
}

.ratio-wide {
  height: 128px;
}

.ratio-tall {
  height: 224px;
}

.ratio-portrait {
  height: 260px;
}

.work-image {
  width: 100%;
  height: 100%;
}

.work-body {
  padding: 8px 10px 6px;
}

.work-title {
  display: block;
  margin-bottom: 4px;
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

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  overflow: hidden;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.author-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.like {
  display: flex;
  flex-shrink: 0;
  gap: 3px;
  align-items: center;
  padding: 2px 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
}

.like.liked {
  color: var(--rose);
}

.like-heart {
  display: inline-block;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.like.liked .like-heart {
  animation: heart-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes heart-pop {
  0% {
    transform: scale(1);
  }

  40% {
    transform: scale(1.4);
  }

  100% {
    transform: scale(1);
  }
}

.mini-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(91, 159, 232, 0.18);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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

.mini-spinner {
  width: 16px;
  height: 16px;
  border-width: 1.5px;
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

.announcement-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.36);
  animation: fade-in 0.28s ease;
}

.announcement-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 401;
  width: calc(100% - 64px);
  max-width: 300px;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.85);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.announcement-popup.show {
  pointer-events: auto;
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.announcement-card {
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.announcement-media {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.announcement-img {
  display: block;
  width: 100%;
  height: 180px;
}

.announcement-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, transparent 60%);
}

.announcement-title {
  position: absolute;
  right: 16px;
  bottom: 12px;
  left: 16px;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.announcement-body {
  padding: 16px;
}

.announcement-summary {
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-secondary);
}

.announcement-action {
  width: 100%;
  height: 42px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 10px;
}

.announcement-action::after {
  border: none;
}

.announcement-dismiss {
  padding: 4px;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: center;
}

.announcement-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 16px auto 0;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.78);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

</style>
