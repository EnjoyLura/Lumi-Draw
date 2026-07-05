<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { resolveTabEnterClass } from "../../services/pageTransition";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import LumiSideDrawer from "../../components/LumiSideDrawer.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import type { HomeWork } from "../home/homeData";
import { galleryGenTasks, galleryTabs, galleryUser, galleryWorks, type GalleryTab } from "./galleryData";
import { deleteGalleryWorks, fetchGalleryGenerateTasks, fetchGalleryUser, fetchGalleryWorks } from "./galleryService";

const PAGE_SIZE = 10;
const tabEnterClass = resolveTabEnterClass("pages/gallery/index");
const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();

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
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight ?? 0;
} catch {
  statusBarHeight.value = 0;
}

const activeTab = ref<GalleryTab>("all");
const renderedTab = ref<GalleryTab>("all");
const works = ref<HomeWork[]>(galleryWorks);
const profile = ref(galleryUser);
const genTasks = ref(galleryGenTasks);
const manageMode = ref(false);
const selectedIds = ref<Set<number>>(new Set());
const isLoading = ref(false);
const isLoadingMore = ref(false);
const sideOpen = ref(false);
const showLoginSheet = ref(false);
const visibleCount = ref(PAGE_SIZE);
const slideDirection = ref<"left" | "right">("left");
const renderKey = ref(0);
const { useMockData } = useDataMode();
const pageState = reactive({ page: 1, hasMore: false });
const sideQuickActions: SideQuick[] = [
  { icon: "💎", label: "充值", url: "/pages/recharge/index", gradient: "linear-gradient(135deg,#a8d8f8,#b0e6d0)" },
  { icon: "✓", label: "签到", url: "/pages/checkin/index", gradient: "linear-gradient(135deg,#ffd4c8,#ffc8d6)" },
  { icon: "★", label: "会员", url: "/pages/membership/index", gradient: "linear-gradient(135deg,#d4c8f0,#b8a8e0)" },
  { icon: "↗", label: "邀请", url: "/pages/invite/index", gradient: "linear-gradient(135deg,#a3e4cc,#8bd8b8)" }
];
const sideRows: SideRow[] = [
  { icon: "✦", label: "发布作品", url: "/pages/publish/index", color: "var(--accent)" },
  { icon: "◷", label: "浏览记录", url: "/pages/history/index", color: "var(--mint)" },
  { icon: "✉", label: "消息中心", url: "/pages/messages/index", color: "var(--rose)", badge: "5" },
  { icon: "♥", label: "我的关注", url: "/pages/follow-list/index?type=following", color: "var(--peach)" },
  { icon: "☺", label: "我的粉丝", url: "/pages/follow-list/index?type=followers", color: "var(--lemon)" }
];

let loadingTimer: ReturnType<typeof setTimeout> | undefined;
let loadMoreTimer: ReturnType<typeof setTimeout> | undefined;
let genTaskTimer: ReturnType<typeof setTimeout> | undefined;
let lastLoadKey = "";

const filteredWorks = computed(() => {
  if (!useMockData.value) return works.value;
  if (renderedTab.value === "published") return works.value.filter((work) => work.published);
  if (renderedTab.value === "draft") return works.value.filter((work) => !work.published);
  return works.value;
});

const displayedWorks = computed(() => filteredWorks.value.slice(0, visibleCount.value));
const leftColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 1));
const hasMore = computed(() => visibleCount.value < filteredWorks.value.length || (!useMockData.value && pageState.hasMore));
const selectedCount = computed(() => selectedIds.value.size);
const allCurrentSelected = computed(() => displayedWorks.value.length > 0 && displayedWorks.value.every((work) => selectedIds.value.has(work.id)));
const emptyInfo = computed(() => {
  if (renderedTab.value === "published") return { icon: "□", title: "暂无已发布作品", sub: "创作完成后点击发布，让更多人看到" };
  if (renderedTab.value === "draft") return { icon: "▤", title: "暂无草稿", sub: "生成的作品会自动保存到草稿箱" };
  return { icon: "□", title: "还没有作品", sub: "去创作页生成你的第一幅AI画作吧" };
});

onShow(() => {
  const loadKey = `${useMockData.value}-${isLoggedIn.value}`;
  if (useMockData.value && lastLoadKey === loadKey) return;
  lastLoadKey = loadKey;
  void reloadGalleryData();
});

onBeforeUnmount(() => {
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  if (genTaskTimer) clearTimeout(genTaskTimer);
});

function getStatusForTab(tab = renderedTab.value) {
  if (tab === "published") return "published";
  if (tab === "draft") return "draft";
  return undefined;
}

function resetMockGalleryData() {
  profile.value = galleryUser;
  works.value = galleryWorks;
  genTasks.value = galleryGenTasks;
  pageState.page = 1;
  pageState.hasMore = false;
  visibleCount.value = PAGE_SIZE;
  renderKey.value += 1;
}

async function loadGenerateTasks(scheduleNext = false) {
  if (useMockData.value || !isLoggedIn.value) {
    if (genTaskTimer) clearTimeout(genTaskTimer);
    return;
  }

  try {
    genTasks.value = await fetchGalleryGenerateTasks();
  } catch {
    genTasks.value = [];
  }

  if (genTaskTimer) clearTimeout(genTaskTimer);
  if (scheduleNext && genTasks.value.length) {
    genTaskTimer = setTimeout(() => void loadGenerateTasks(true), 5000);
  }
}

async function loadGalleryPage(page = 1, append = false) {
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
    genTasks.value = [];
    return;
  }

  isLoading.value = true;
  try {
    const [nextProfile] = await Promise.all([fetchGalleryUser(), loadGalleryPage(1, false), loadGenerateTasks(true)]);
    profile.value = nextProfile;
    visibleCount.value = PAGE_SIZE;
    renderKey.value += 1;
  } catch {
    uni.showToast({ title: "画廊数据加载失败，请稍后重试", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}

function showTodo(label: string) {
  uni.showToast({ title: `${label}将在后续任务迁移`, icon: "none" });
}

function goHome() {
  uni.redirectTo({ url: "/pages/home/index" });
}

function goPlaza() {
  uni.redirectTo({ url: "/pages/plaza/index" });
}

function goCreate() {
  uni.navigateTo({ url: "/pages/create/index" });
}

function goMine() {
  uni.redirectTo({ url: "/pages/mine/index" });
}

function goSearch() {
  uni.navigateTo({ url: "/pages/search/index" });
}

function goEditProfile() {
  if (!ensureLogin()) return;
  uni.navigateTo({ url: "/pages/edit-profile/index" });
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

function switchGalleryTab(tab: GalleryTab, index: number) {
  if (tab === activeTab.value || isLoading.value) return;
  activeTab.value = tab;
  slideDirection.value = index > galleryTabs.findIndex((item) => item.key === renderedTab.value) ? "left" : "right";
  selectedIds.value = new Set();
  isLoading.value = true;
  if (loadingTimer) clearTimeout(loadingTimer);
  loadingTimer = setTimeout(async () => {
    renderedTab.value = tab;
    visibleCount.value = PAGE_SIZE;
    if (!useMockData.value) {
      try {
        await loadGalleryPage(1, false);
      } catch {
        uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
      }
    }
    renderKey.value += 1;
    isLoading.value = false;
  }, 320);
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

async function deleteSelected() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: "请先选择要删除的作品", icon: "none" });
    return;
  }

  const count = selectedIds.value.size;
  const ids = Array.from(selectedIds.value);
  if (!useMockData.value) {
    try {
      await deleteGalleryWorks(ids);
    } catch {
      uni.showToast({ title: "删除失败，请稍后重试", icon: "none" });
      return;
    }
  }

  works.value = works.value.filter((work) => !ids.includes(work.id));
  selectedIds.value = new Set();
  manageMode.value = false;
  renderKey.value += 1;
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
  <view class="gallery-page" :class="tabEnterClass">
    <scroll-view class="gallery-scroll" scroll-y :lower-threshold="80" @scrolltolower="handleReachBottom">
      <view class="header-bg">
        <view class="nav-header">
          <view class="status-spacer" :style="{ height: statusBarHeight + 'px' }" />
          <view class="nav-row">
            <view class="icon-btn nav-menu" @click="openSideMenu">☰</view>
            <text class="nav-title">画廊</text>
            <view class="icon-btn search nav-search" @click="goSearch">⌕</view>
          </view>
        </view>

        <view v-if="isLoggedIn" class="profile-area">
          <view class="profile-row">
            <view class="avatar-wrap">
              <view class="profile-avatar" :style="{ background: profile.color }">{{ profile.avatar }}</view>
            </view>
            <view class="profile-main">
              <view class="profile-name">{{ profile.name }}</view>
              <view class="id-row">
                <text class="profile-id">ID: {{ profile.userNo }}</text>
                <view class="gender-tag">♀</view>
              </view>
              <view class="role-tag">✦ {{ profile.role }}</view>
            </view>
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
            </view>
            <button class="edit-btn" @click="goEditProfile">编辑资料</button>
          </view>
        </view>

        <view v-else class="gallery-login-prompt">
          <view class="gallery-login-icon">▣</view>
          <view class="gallery-login-title">登录查看我的画廊</view>
          <view class="gallery-login-sub">登录后即可管理你的AI作品、草稿与创作记录</view>
          <button class="gallery-login-btn" @click="openLoginSheet">立即登录</button>
        </view>
      </view>

      <view v-if="isLoggedIn" class="gallery-tabs-row">
        <view class="gallery-tabs">
          <view
            v-for="(tab, index) in galleryTabs"
            :key="tab.key"
            class="gallery-tab"
            :class="{ active: activeTab === tab.key }"
            @click="switchGalleryTab(tab.key, index)"
          >
            {{ tab.label }}
          </view>
          <view class="tab-indicator" :style="{ transform: `translateX(${galleryTabs.findIndex((tab) => tab.key === activeTab) * 61}px)` }" />
        </view>
        <button class="manage-btn" :class="{ active: manageMode }" @click="toggleManage">
          {{ manageMode ? "✓ 完成" : "☷ 管理" }}
        </button>
      </view>

      <view v-if="isLoggedIn" class="gallery-content">
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

        <view v-if="isLoading" :key="`loading-${activeTab}`" class="loading-card">
          <view class="spinner" />
        </view>

        <view v-else-if="filteredWorks.length" :key="`waterfall-${renderedTab}-${renderKey}`" class="waterfall" :class="slideDirection === 'left' ? 'slide-left' : 'slide-right'">
          <view class="waterfall-column">
            <view v-for="work in leftColumnWorks" :key="work.id" class="work-card" @click="openWork(work)">
              <view v-if="manageMode" class="select-dot" :class="{ selected: selectedIds.has(work.id) }" @click="toggleSelect($event, work.id)">✓</view>
              <view class="status-badge" :class="statusBadgeClass(work)">{{ statusBadgeText(work) }}</view>
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="author">
                    <view class="mini-avatar" :style="{ background: profile.color }">{{ profile.avatar }}</view>
                    <text class="author-name">{{ profile.name }}</text>
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
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="author">
                    <view class="mini-avatar" :style="{ background: profile.color }">{{ profile.avatar }}</view>
                    <text class="author-name">{{ profile.name }}</text>
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
          <button v-if="renderedTab === 'all'" class="empty-btn" @click="goCreate">✦ 去创作</button>
        </view>

        <view v-if="!isLoading && filteredWorks.length" class="load-more-hint" :class="{ 'is-loading': isLoadingMore }">
          <view v-if="isLoadingMore" class="spinner mini" />
          <text>{{ isLoadingMore ? "正在加载更多作品" : hasMore ? "继续往下滑获取更多作品" : "我也是有底线的~" }}</text>
        </view>
      </view>

      <view v-if="isLoggedIn" :class="['manage-bar', { show: manageMode }]">
        <text class="selected-count">已选择 {{ selectedCount }} 项</text>
        <button class="select-all-btn" @click="selectAll">{{ allCurrentSelected ? "取消全选" : "全选" }}</button>
        <button class="delete-btn" :class="{ enabled: selectedCount > 0 }" @click="deleteSelected">删除</button>
      </view>
    </scroll-view>

    <view v-if="isLoggedIn" class="publish-btn" @click="goPublish">+</view>

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
      <view class="tab-item active">
        <text class="tab-icon">□</text>
        <text class="tab-label">画廊</text>
      </view>
      <view class="tab-item" @click="goMine">
        <text class="tab-icon">☺</text>
        <text class="tab-label">我的</text>
      </view>
    </view>

    <LumiSideDrawer
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
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.gallery-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.gallery-scroll {
  position: absolute;
  inset: 0 0 80px;
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

.nav-menu {
  position: absolute;
  left: 16px;
}

.nav-search {
  position: absolute;
  right: 16px;
}

.manage-btn,
.edit-btn,
.select-all-btn,
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
  align-items: flex-start;
  padding: 12px 16px 0;
}

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
  color: var(--rose);
  background: var(--rose-soft);
  border-radius: 999px;
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
  align-items: center;
  padding: 16px 16px 8px;
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
  display: flex;
  flex: 1;
  gap: 28px;
  align-items: center;
}

.stat {
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

.stat-label {
  margin-left: 4px;
  font-size: 13px;
  color: var(--fg-muted);
}

.edit-btn {
  color: #fff;
  background: var(--accent);
  border-radius: 8px;
}

.gallery-tabs-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 16px;
  margin-bottom: 8px;
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

.manage-btn.active {
  color: var(--accent);
  background: var(--accent-soft);
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

.waterfall {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.waterfall.slide-left {
  animation: wf-left 0.42s ease;
}

.waterfall.slide-right {
  animation: wf-right 0.42s ease;
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
  animation: work-in 0.42s ease both;
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
  position: sticky;
  bottom: 0;
  z-index: 50;
  display: flex;
  gap: 8px;
  align-items: center;
  max-height: 0;
  padding: 0 16px;
  overflow: hidden;
  pointer-events: none;
  background: var(--bg-glass);
  border-top: 0.5px solid var(--border);
  opacity: 0;
  transition:
    max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease,
    padding 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(16px);
}

.manage-bar.show {
  max-height: 60px;
  padding: 8px 16px;
  pointer-events: auto;
  opacity: 1;
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

@keyframes wf-left {
  from {
    opacity: 0;
    transform: translateX(18px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes wf-right {
  from {
    opacity: 0;
    transform: translateX(-18px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes work-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
