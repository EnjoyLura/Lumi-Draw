<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { gameplays, homeBanners, homeUsers, homeWorks, type HomeWork } from "./homeData";

type HomeTab = "recommend" | "new";

const statusBarHeight = ref(0);
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight ?? 0;
} catch {
  statusBarHeight.value = 0;
}

const activeBanner = ref(0);
const selectedHomeTab = ref<HomeTab>("recommend");
const likedWorkIds = ref<Set<number>>(new Set());
const visibleWorkCount = ref(8);
const isLoadingMore = ref(false);
const isSwitchingWorks = ref(false);
const worksRenderKey = ref(0);
const worksSlideClass = ref("");

let slideTimer: ReturnType<typeof setTimeout> | undefined;
let loadMoreTimer: ReturnType<typeof setTimeout> | undefined;

const currentTabWorks = computed(() => {
  return selectedHomeTab.value === "new" ? [...homeWorks].reverse() : homeWorks;
});

const displayedWorks = computed(() => currentTabWorks.value.slice(0, visibleWorkCount.value));
const leftColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 1));
const hasMoreWorks = computed(() => visibleWorkCount.value < currentTabWorks.value.length);

onBeforeUnmount(() => {
  if (slideTimer) clearTimeout(slideTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
});

function showTodo(label: string) {
  uni.showToast({
    title: `${label}将在后续任务迁移`,
    icon: "none"
  });
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
  uni.navigateTo({
    url: "/pages/plaza/index"
  });
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
  uni.navigateTo({
    url: "/pages/gallery/index"
  });
}

function goMine() {
  uni.navigateTo({
    url: "/pages/mine/index"
  });
}

function goAllGameplays() {
  uni.navigateTo({
    url: "/pages/all-gameplays/index"
  });
}

function handleBannerTap(action: string, title: string) {
  if (action === "checkin") {
    uni.navigateTo({ url: "/pages/checkin/index" });
    return;
  }

  if (action === "create") {
    goCreate();
    return;
  }

  if (action === "membership") {
    uni.navigateTo({ url: "/pages/membership/index" });
    return;
  }

  showTodo(title);
}

function openWorkDetail(workId: number) {
  uni.navigateTo({
    url: `/pages/work-detail/index?id=${workId}`
  });
}

function switchHomeTab(tab: HomeTab) {
  if (tab === selectedHomeTab.value || isSwitchingWorks.value) return;

  const direction = tab === "new" && selectedHomeTab.value === "recommend" ? "left" : "right";
  selectedHomeTab.value = tab;
  visibleWorkCount.value = 8;
  isSwitchingWorks.value = true;
  worksSlideClass.value = "";

  if (slideTimer) clearTimeout(slideTimer);
  slideTimer = setTimeout(() => {
    worksRenderKey.value += 1;
    worksSlideClass.value = direction === "left" ? "wf-slide-left" : "wf-slide-right";
    isSwitchingWorks.value = false;
  }, 300);
}

function handleReachBottom() {
  if (isSwitchingWorks.value || isLoadingMore.value) return;

  isLoadingMore.value = true;
  if (loadMoreTimer) clearTimeout(loadMoreTimer);

  loadMoreTimer = setTimeout(() => {
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

function toggleLike(work: HomeWork) {
  const next = new Set(likedWorkIds.value);
  if (next.has(work.id)) {
    next.delete(work.id);
  } else {
    next.add(work.id);
  }
  likedWorkIds.value = next;
}

function getUser(userId: number) {
  return homeUsers.find((user) => user.id === userId) ?? homeUsers[0];
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
  <view class="home-page">
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
            <view class="nav-notify-dot" />
          </view>
          <text class="nav-title">露米绘画</text>
        </view>
      </view>

      <view class="home-content">
        <view class="banner-card">
          <swiper
            class="banner-swiper"
            circular
            autoplay
            :interval="4000"
            :current="activeBanner"
            @change="activeBanner = $event.detail.current"
          >
            <swiper-item v-for="banner in homeBanners" :key="banner.title">
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
              v-for="(_, index) in homeBanners"
              :key="index"
              class="banner-dot"
              :class="{ active: index === activeBanner }"
            />
          </view>
        </view>

        <view class="section-title">
          <text>热门玩法</text>
          <view class="more-link" @click="goAllGameplays">
            <text>全部</text>
            <text class="chevron">›</text>
          </view>
        </view>

        <scroll-view class="gameplay-scroll" scroll-x>
          <view class="gameplay-list">
            <view
              v-for="gameplay in gameplays"
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

        <view class="works-stage">
          <view v-if="isSwitchingWorks" class="works-loading">
            <view class="loading-spinner" />
          </view>

          <view v-else :key="worksRenderKey" class="waterfall" :class="worksSlideClass">
            <view class="waterfall-col">
              <view v-for="work in leftColumnWorks" :key="work.id" class="work-card">
                <view class="work-media" :class="getRatioClass(work.ratio)" @click="openWorkDetail(work.id)">
                  <image class="work-image" :src="work.image" mode="aspectFill" />
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
                      <text>{{ work.likes + (likedWorkIds.has(work.id) ? 1 : 0) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view class="waterfall-col">
              <view v-for="work in rightColumnWorks" :key="work.id" class="work-card">
                <view class="work-media" :class="getRatioClass(work.ratio)" @click="openWorkDetail(work.id)">
                  <image class="work-image" :src="work.image" mode="aspectFill" />
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
                      <text>{{ work.likes + (likedWorkIds.has(work.id) ? 1 : 0) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="load-more-hint" :class="{ 'is-loading': isLoadingMore }">
          <view v-if="isLoadingMore" class="mini-spinner" />
          <text>
            {{ isLoadingMore ? "正在加载更多作品" : hasMoreWorks ? "继续往下滑获取更多作品" : "我也是有底线的~" }}
          </text>
        </view>
      </view>
    </scroll-view>

    <view class="tab-bar">
      <view class="tab-item active" @click="showTodo('首页')">
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
  </view>
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

.banner-card {
  position: relative;
  height: 150px;
  margin: 0 12px 16px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
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
  min-height: 420px;
}

.waterfall {
  display: flex;
  gap: 6px;
  padding: 0 8px;
}

.wf-slide-left {
  animation: slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.wf-slide-right {
  animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(30px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

</style>
