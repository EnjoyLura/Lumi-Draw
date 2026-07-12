<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import {
  fetchUserProfile,
  fetchUserWorks,
  followUser,
  formatCompactNumber,
  toggleWorkLike,
  toHomeWork,
  unfollowUser,
  type BackendWorkCard,
  type BackendUserProfile
} from "../../services/social";
import type { HomeWork } from "../home/homeData";
import { getProfileUser, getUserWorks, isFollowing, setFollowing } from "./userProfileData";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const PAGE_SIZE = 20;
const userId = ref(1);
const confirmOpen = ref(false);
const showLoginSheet = ref(false);
const likedWorkIds = ref<Set<number>>(new Set());
const pulseId = ref<number | null>(null);
const realProfile = ref<ProfileView | null>(null);
const realWorks = ref<HomeWork[]>([]);
const loading = ref(false);
const isLoadingMore = ref(false);
const loadFailed = ref(false);
const pageState = ref({ page: 1, hasMore: false });
const { useMockData } = useDataMode();
const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
let lastMode: boolean | null = null;

interface ProfileView {
  id: number;
  name: string;
  avatar: string;
  color: string;
  bio: string;
  works: number;
  likes: string;
  followers: string;
  following: number;
  gender: "male" | "female" | "unknown";
  role: string;
  isFollowing: boolean;
}

const emptyProfile = computed<ProfileView>(() => ({
  id: userId.value,
  name: "",
  avatar: "",
  color: "var(--accent)",
  bio: "",
  works: 0,
  likes: "0",
  followers: "0",
  following: 0,
  gender: "unknown",
  role: "AI 创作者",
  isFollowing: false
}));
const user = computed(() => {
  if (useMockData.value) return getProfileUser(userId.value);
  return realProfile.value || emptyProfile.value;
});
const hasProfile = computed(() => useMockData.value || Boolean(realProfile.value));
const following = computed(() => (useMockData.value ? isFollowing(userId.value) : Boolean(realProfile.value?.isFollowing)));
const allWorks = computed(() => (useMockData.value ? getUserWorks(userId.value) : realWorks.value));
const leftColumn = computed(() => allWorks.value.filter((_, index) => index % 2 === 0));
const rightColumn = computed(() => allWorks.value.filter((_, index) => index % 2 === 1));
const hasGenderIcon = computed(() => user.value.gender === "female" || user.value.gender === "male");
const genderIcon = computed(() => {
  if (user.value.gender === "female") return "♀";
  if (user.value.gender === "male") return "♂";
  return "";
});

onLoad((query) => {
  userId.value = resolveRouteId(query);
  lastMode = null;
});

onShow(() => {
  const nextId = resolveRouteId();
  if (nextId !== userId.value) {
    userId.value = nextId;
    lastMode = null;
  }
  if (useMockData.value && lastMode === useMockData.value) return;
  lastMode = useMockData.value;
  void loadProfile();
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", handleHashChange);
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("hashchange", handleHashChange);
});

function handleHashChange() {
  const nextId = resolveRouteId();
  if (nextId === userId.value) return;
  userId.value = nextId;
  lastMode = null;
  void loadProfile();
}

function resolveRouteId(query?: Record<string, unknown>) {
  const queryId = Number(query?.id || 0);
  if (Number.isFinite(queryId) && queryId > 0) return queryId;

  if (typeof window !== "undefined") {
    const hashId = Number(window.location.hash.match(/[?&]id=([^&]+)/)?.[1] || 0);
    if (Number.isFinite(hashId) && hashId > 0) return hashId;
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  const pageId = Number(current?.options?.id || current?.$page?.options?.id || 0);
  return Number.isFinite(pageId) && pageId > 0 ? pageId : 1;
}

function toProfileView(profile: BackendUserProfile): ProfileView {
  const fallbackName = `用户${profile.id}`;
  const name = profile.nickname || fallbackName;
  return {
    id: profile.id,
    name,
    avatar: profile.avatarText || name.slice(0, 1) || "U",
    color: profile.avatarColor || "var(--accent)",
    bio: profile.bio || "这个用户还没有填写简介",
    works: profile.worksCount,
    likes: formatCompactNumber(profile.likesCount),
    followers: formatCompactNumber(profile.followers),
    following: profile.following,
    gender: profile.gender === "male" || profile.gender === "female" ? profile.gender : "unknown",
    role: "AI 创作者",
    isFollowing: profile.isFollowing
  };
}

async function loadProfile() {
  loadFailed.value = false;
  if (useMockData.value) {
    realProfile.value = null;
    realWorks.value = [];
    return;
  }
  loading.value = true;
  try {
    const requestOptions = isLoggedIn.value ? undefined : { skipAuth: true };
    const [profile, worksPage] = await Promise.all([
      fetchUserProfile(userId.value, requestOptions),
      fetchUserWorks(userId.value, 1, PAGE_SIZE, requestOptions)
    ]);
    realProfile.value = toProfileView(profile);
    realWorks.value = worksPage.items.map(toHomeWork);
    likedWorkIds.value = buildLikedWorkIds(worksPage.items);
    pageState.value = { page: worksPage.page, hasMore: worksPage.hasMore };
  } catch {
    realProfile.value = null;
    realWorks.value = [];
    pageState.value = { page: 1, hasMore: false };
    loadFailed.value = true;
    uni.showToast({ title: "用户主页加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function loadMoreWorks() {
  if (useMockData.value || loading.value || isLoadingMore.value || !pageState.value.hasMore) return;

  isLoadingMore.value = true;
  try {
    const nextPage = pageState.value.page + 1;
    const requestOptions = isLoggedIn.value ? undefined : { skipAuth: true };
    const worksPage = await fetchUserWorks(userId.value, nextPage, PAGE_SIZE, requestOptions);
    realWorks.value = [...realWorks.value, ...worksPage.items.map(toHomeWork)];
    likedWorkIds.value = buildLikedWorkIds(worksPage.items, likedWorkIds.value);
    pageState.value = { page: worksPage.page, hasMore: worksPage.hasMore };
  } catch {
    uni.showToast({ title: "作品加载失败，请稍后重试", icon: "none" });
  } finally {
    isLoadingMore.value = false;
  }
}

function buildLikedWorkIds(items: BackendWorkCard[], base?: Set<number>) {
  const next = new Set(base);
  items.forEach((item) => {
    if (item.liked) next.add(item.id);
    else next.delete(item.id);
  });
  return next;
}

function displayTitle(work: HomeWork) {
  return work.title || (work.prompt.length > 18 ? `${work.prompt.slice(0, 18)}...` : work.prompt);
}

function getAspectRatio(ratio: string) {
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height) return "1 / 1";
  return `${width} / ${height}`;
}

function displayLikeCount(work: HomeWork) {
  return work.likes + (useMockData.value && likedWorkIds.value.has(work.id) ? 1 : 0);
}

function openWork(work: HomeWork) {
  uni.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` });
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
    await loadProfile();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

async function toggleLike(event: Event, workId: number) {
  event.stopPropagation();
  if (!useMockData.value) {
    if (!ensureLogin()) return;
    try {
      const result = await toggleWorkLike(workId);
      realWorks.value = realWorks.value.map((work) => (work.id === workId ? { ...work, likes: result.likes } : work));
    } catch {
      uni.showToast({ title: "点赞失败，请稍后重试", icon: "none" });
      return;
    }
  }
  const next = new Set(likedWorkIds.value);
  if (next.has(workId)) {
    next.delete(workId);
  } else {
    next.add(workId);
  }
  likedWorkIds.value = next;

  pulseId.value = null;
  setTimeout(() => {
    pulseId.value = workId;
  }, 0);
  setTimeout(() => {
    if (pulseId.value === workId) pulseId.value = null;
  }, 220);
}

async function toggleFollow() {
  if (following.value) {
    confirmOpen.value = true;
    return;
  }
  if (!useMockData.value && !ensureLogin()) return;
  try {
    if (!useMockData.value) {
      const result = await followUser(userId.value);
      if (realProfile.value) {
        realProfile.value = { ...realProfile.value, isFollowing: result.following, followers: formatCompactNumber(result.followers) };
      }
    } else {
      setFollowing(userId.value, true);
    }
    uni.showToast({ title: "关注成功", icon: "none" });
  } catch {
    uni.showToast({ title: "关注失败，请稍后重试", icon: "none" });
  }
}

async function confirmUnfollow() {
  try {
    if (!useMockData.value) {
      const result = await unfollowUser(userId.value);
      if (realProfile.value) {
        realProfile.value = { ...realProfile.value, isFollowing: result.following, followers: formatCompactNumber(result.followers) };
      }
    } else {
      setFollowing(userId.value, false);
    }
    confirmOpen.value = false;
    uni.showToast({ title: "已取消关注", icon: "none" });
  } catch {
    uni.showToast({ title: "取消关注失败，请稍后重试", icon: "none" });
  }
}
</script>

<template>
  <view class="profile-page" :class="themeClass">
    <LumiPageHeader title="用户主页" />
    <LumiDeferredPageContent>
    <scroll-view class="page-scroll" scroll-y :lower-threshold="80" @scrolltolower="loadMoreWorks">
      <view v-if="loading" class="profile-empty">
        <view class="empty-icon"><LumiIcon name="info" :size="30" /></view>
        <view class="empty-title">正在加载用户主页</view>
      </view>

      <view v-else-if="!hasProfile || loadFailed" class="profile-empty">
        <view class="empty-icon"><LumiIcon name="user" :size="30" /></view>
        <view class="empty-title">用户主页加载失败</view>
        <view class="empty-sub">请确认用户存在，或稍后重试。</view>
        <button class="empty-btn" @click="loadProfile">重新加载</button>
      </view>

      <template v-else>
      <view class="profile-header">
        <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
        <view class="header-main">
          <view class="user-name">{{ user.name }}</view>
          <view class="id-row">
            <text class="user-id">ID: LUMI{{ user.id }}</text>
            <view v-if="hasGenderIcon" class="gender-tag" :class="user.gender">{{ genderIcon }}</view>
          </view>
          <view class="role-tag"><LumiIcon name="sparkles" :size="12" />{{ user.role }}</view>
        </view>
      </view>

      <view class="bio">{{ user.bio }}</view>

      <view class="stats-row">
        <view class="stats">
          <view class="stat">
            <text class="stat-num rose">{{ user.works }}</text>
            <text class="stat-label">作品</text>
          </view>
          <view class="stat">
            <text class="stat-num accent">{{ user.followers }}</text>
            <text class="stat-label">粉丝</text>
          </view>
          <view class="stat">
            <text class="stat-num lavender">{{ user.likes }}</text>
            <text class="stat-label">获赞</text>
          </view>
        </view>
        <button class="follow-btn" :class="{ following }" @click="toggleFollow">{{ following ? "已关注" : "+ 关注" }}</button>
      </view>

      <view class="works-head">
        <text class="works-title">TA的作品 ({{ allWorks.length }})</text>
      </view>

      <view class="works-wrap">
        <view v-if="allWorks.length" class="waterfall">
          <view class="waterfall-column">
            <view v-for="work in leftColumn" :key="work.id" class="work-card" @click="openWork(work)">
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="mini-avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
                  <text class="work-author">{{ user.name }}</text>
                  <view class="like" :class="{ liked: likedWorkIds.has(work.id), pulse: pulseId === work.id }" @click="toggleLike($event, work.id)">
                    <LumiIcon name="heart" :size="15" />
                    <text>{{ displayLikeCount(work) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view class="waterfall-column">
            <view v-for="work in rightColumn" :key="work.id" class="work-card" @click="openWork(work)">
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="mini-avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
                  <text class="work-author">{{ user.name }}</text>
                  <view class="like" :class="{ liked: likedWorkIds.has(work.id), pulse: pulseId === work.id }" @click="toggleLike($event, work.id)">
                    <LumiIcon name="heart" :size="15" />
                    <text>{{ displayLikeCount(work) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="works-empty">暂无作品</view>
        <view v-if="allWorks.length" class="load-more-hint">
          {{ isLoadingMore ? "正在加载更多作品" : useMockData || pageState.hasMore ? "继续往下滑获取更多作品" : "没有更多作品了" }}
        </view>
      </view>
      </template>
    </scroll-view>
    </LumiDeferredPageContent>

    <view v-if="confirmOpen" class="dialog-overlay" @click="confirmOpen = false">
      <view class="dialog" @click.stop>
        <view class="dialog-icon">☹</view>
        <view class="dialog-title">取消关注</view>
        <view class="dialog-msg">确定要取消关注该用户吗？</view>
        <view class="dialog-actions">
          <button class="dialog-btn ghost" @click="confirmOpen = false">再想想</button>
          <button class="dialog-btn danger" @click="confirmUnfollow">取消关注</button>
        </view>
      </view>
    </view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.profile-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.profile-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 56vh;
  padding: 44px 24px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 14px;
  font-size: 42px;
  color: var(--fg-muted);
}

.empty-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 800;
  color: var(--fg-primary);
}

.empty-sub {
  max-width: 260px;
  margin-bottom: 22px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-secondary);
}

.empty-btn {
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
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  border: none;
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(255, 92, 122, 0.24);
}

.empty-btn::after {
  border: none;
}

.profile-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px 16px 0;
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.header-main {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--fg-primary);
}

.id-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 3px;
}

.user-id {
  font-size: 13px;
  color: var(--fg-muted);
}

.gender-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 6px;
  font-size: 12px;
  border-radius: 999px;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  margin-top: 6px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #8470c7;
  background: var(--lavender-soft);
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

.gender-tag.unknown {
  color: var(--fg-muted);
  background: var(--bg-elevated);
}

.bio {
  padding: 10px 16px 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fg-secondary);
}

.stats-row {
  display: flex;
  align-items: center;
  padding: 16px 16px 8px;
}

.stats {
  display: flex;
  flex: 1;
  gap: 28px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  font-size: 13px;
  color: var(--fg-muted);
}

.follow-btn {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 999px;
}

.follow-btn::after {
  border: none;
}

.follow-btn.following {
  color: var(--fg-muted);
  background: var(--bg-soft);
}

.works-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 6px;
}

.works-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
}

.search-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 18px;
  color: var(--fg-muted);
  background: var(--bg-soft);
  border-radius: 8px;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0 16px 8px;
}

.search-icon {
  position: absolute;
  left: 10px;
  font-size: 16px;
  color: var(--fg-muted);
}

.search-input {
  width: 100%;
  height: 36px;
  box-sizing: border-box;
  padding: 0 12px 0 34px;
  font-size: 13px;
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.search-input:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.works-wrap {
  padding: 0 12px;
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
  gap: 5px;
  align-items: center;
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

.work-author {
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.like {
  display: flex;
  flex: 0 0 auto;
  gap: 3px;
  align-items: center;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--fg-muted);
  border-radius: 8px;
  transition:
    color 0.25s ease,
    transform 0.25s ease;
}

.like.liked {
  color: var(--rose);
  transform: scale(1.04);
}

.like.pulse text:first-child {
  animation: icon-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes icon-pop {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.4);
  }

  100% {
    transform: scale(1);
  }
}

.works-empty {
  padding: 40px 0;
  font-size: 13px;
  color: var(--fg-muted);
  text-align: center;
}

.load-more-hint {
  padding: 20px 0;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: center;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgba(0, 0, 0, 0.36);
}

.dialog {
  width: 100%;
  max-width: 300px;
  padding: 24px 20px 20px;
  text-align: center;
  background: var(--bg-card);
  border-radius: 18px;
}

.dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  font-size: 26px;
  color: var(--peach);
  background: rgba(255, 181, 154, 0.2);
  border-radius: 50%;
}

.dialog-title {
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 700;
}

.dialog-msg {
  margin-bottom: 18px;
  font-size: 13px;
  color: var(--fg-muted);
}

.dialog-actions {
  display: flex;
  gap: 10px;
}

.dialog-btn {
  flex: 1;
  height: 42px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
}

.dialog-btn::after {
  border: none;
}

.dialog-btn.ghost {
  color: var(--fg-secondary);
  background: var(--bg-soft);
}

.dialog-btn.danger {
  color: #fff;
  background: var(--rose);
}

/* Lumi custom page header layout */
.profile-page {
  display: flex;
  flex-direction: column;
}

.profile-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
