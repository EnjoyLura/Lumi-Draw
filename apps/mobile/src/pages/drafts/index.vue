<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { galleryUser, galleryWorks, type GalleryUser } from "../gallery/galleryData";
import { fetchGalleryUser, fetchGalleryWorks } from "../gallery/galleryService";
import type { HomeWork } from "../home/homeData";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const PAGE_SIZE = 12;

const EMPTY_PROFILE: GalleryUser = {
  id: 0,
  name: "未同步资料",
  avatar: "U",
  color: "var(--accent)",
  points: "0",
  userNo: "-",
  bio: "",
  role: "创作者",
  works: 0,
  followers: "0",
  following: "0",
  likes: "0"
};

const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();
const realDrafts = ref<HomeWork[]>([]);
const profile = ref(EMPTY_PROFILE);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const loginRequired = ref(false);
const showLoginSheet = ref(false);
const pageState = reactive({ page: 1, hasMore: false });
let lastMode: boolean | null = null;

const drafts = computed(() => (useMockData.value ? galleryWorks.filter((work) => !work.published) : realDrafts.value));
const leftColumn = computed(() => drafts.value.filter((_, index) => index % 2 === 0));
const rightColumn = computed(() => drafts.value.filter((_, index) => index % 2 === 1));
const hasMore = computed(() => !useMockData.value && pageState.hasMore);

onShow(() => {
  if (lastMode !== useMockData.value) {
    lastMode = useMockData.value;
    resetRealDrafts();
  }
  void loadDrafts(1, false);
});

function resetRealDrafts() {
  realDrafts.value = [];
  profile.value = EMPTY_PROFILE;
  pageState.page = 1;
  pageState.hasMore = false;
}

function displayTitle(work: HomeWork) {
  return work.title || (work.prompt.length > 18 ? `${work.prompt.slice(0, 18)}...` : work.prompt);
}

function getAspectRatio(ratio: string) {
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height) return "1 / 1";
  return `${width} / ${height}`;
}

function openWork(work: HomeWork) {
  uni.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` });
}

function goCreate() {
  uni.navigateTo({ url: "/pages/create/index" });
}

async function loadDrafts(page = 1, append = false) {
  if (useMockData.value) {
    profile.value = galleryUser;
    loginRequired.value = false;
    return;
  }
  if (!isLoggedIn.value) {
    resetRealDrafts();
    loginRequired.value = true;
    return;
  }

  loginRequired.value = false;
  isLoading.value = !append;
  isLoadingMore.value = append;
  try {
    const [draftPage, nextProfile] = await Promise.all([
      fetchGalleryWorks({ status: "draft", page, pageSize: PAGE_SIZE }),
      page === 1 ? fetchGalleryUser() : Promise.resolve(profile.value)
    ]);
    realDrafts.value = append ? [...realDrafts.value, ...draftPage.works] : draftPage.works;
    profile.value = nextProfile;
    pageState.page = draftPage.page;
    pageState.hasMore = draftPage.hasMore;
  } catch {
    if (!append) resetRealDrafts();
    uni.showToast({ title: "草稿加载失败，请稍后重试", icon: "none" });
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
}

function openLoginSheet() {
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
}

function loadMore() {
  if (isLoading.value || isLoadingMore.value || !hasMore.value) return;
  void loadDrafts(pageState.page + 1, true);
}

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    await loadDrafts(1, false);
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}
</script>

<template>
  <view class="drafts-page" :class="themeClass">
    <LumiPageHeader title="草稿箱" />
    <LumiDeferredPageContent>
    <scroll-view class="page-scroll" scroll-y :lower-threshold="80" @scrolltolower="loadMore">
      <view class="drafts-content">
        <view v-if="!useMockData && loginRequired" class="empty-state">
          <view class="empty-icon"><LumiIcon name="info" :size="30" /></view>
          <view class="empty-title">登录后查看草稿箱</view>
          <view class="empty-sub">生成完成的作品会自动保存为草稿</view>
          <button class="empty-btn" @click="showLoginSheet = true">立即登录</button>
        </view>

        <view v-else-if="isLoading" class="loading-state">
          <view class="spinner" />
        </view>

        <template v-else-if="drafts.length">
          <view class="waterfall">
            <view class="waterfall-column">
              <view v-for="work in leftColumn" :key="work.id" class="work-card" @click="openWork(work)">
                <view class="status-badge"><LumiIcon name="file-text" :size="12" />草稿</view>
                <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
                <view class="work-body">
                  <view class="work-title">{{ displayTitle(work) }}</view>
                  <view class="work-meta">
                    <view class="mini-avatar" :style="{ background: profile.color }">{{ profile.avatar }}</view>
                    <text class="author-name">{{ profile.name }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view class="waterfall-column">
              <view v-for="work in rightColumn" :key="work.id" class="work-card" @click="openWork(work)">
                <view class="status-badge"><LumiIcon name="file-text" :size="12" />草稿</view>
                <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
                <view class="work-body">
                  <view class="work-title">{{ displayTitle(work) }}</view>
                  <view class="work-meta">
                    <view class="mini-avatar" :style="{ background: profile.color }">{{ profile.avatar }}</view>
                    <text class="author-name">{{ profile.name }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view class="load-more-hint" :class="{ loading: isLoadingMore }">
            <view v-if="isLoadingMore" class="spinner mini" />
            <text>{{ isLoadingMore ? "正在加载更多草稿" : hasMore ? "继续下滑查看更多草稿" : "没有更多草稿了" }}</text>
          </view>
        </template>

        <view v-else class="empty-state">
          <view class="empty-icon"><LumiIcon name="file-text" :size="30" /></view>
          <view class="empty-title">暂无草稿</view>
          <view class="empty-sub">生成的作品会自动保存到草稿箱</view>
          <button class="empty-btn" @click="goCreate"><LumiIcon name="sparkles" :size="16" />去创作</button>
        </view>
      </view>
    </scroll-view>
    </LumiDeferredPageContent>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.drafts-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.drafts-content {
  padding: 12px;
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

.status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  display: inline-flex;
  gap: 3px;
  align-items: center;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #e59a74;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
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

.author-name {
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.load-more-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: center;
}

.load-more-hint.loading {
  color: var(--accent);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 70px 0;
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
  width: 15px;
  height: 15px;
  border-width: 1.5px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
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
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  margin-top: 14px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border: none;
  border-radius: 999px;
}

.empty-btn::after {
  border: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Lumi custom page header layout */
.drafts-page {
  display: flex;
  flex-direction: column;
}

.drafts-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
