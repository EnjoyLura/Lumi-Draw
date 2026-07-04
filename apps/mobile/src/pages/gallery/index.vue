<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import type { HomeWork } from "../home/homeData";
import { galleryTabs, galleryUser, galleryWorks, type GalleryTab } from "./galleryData";

const activeTab = ref<GalleryTab>("all");
const renderedTab = ref<GalleryTab>("all");
const works = ref<HomeWork[]>(galleryWorks);
const manageMode = ref(false);
const selectedIds = ref<Set<number>>(new Set());
const isLoading = ref(false);
const slideDirection = ref<"left" | "right">("left");
const renderKey = ref(0);

let loadingTimer: ReturnType<typeof setTimeout> | undefined;

const filteredWorks = computed(() => {
  if (renderedTab.value === "published") return works.value.filter((work) => work.published);
  if (renderedTab.value === "draft") return works.value.filter((work) => !work.published);
  return works.value;
});

const leftColumnWorks = computed(() => filteredWorks.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => filteredWorks.value.filter((_, index) => index % 2 === 1));
const selectedCount = computed(() => selectedIds.value.size);
const allCurrentSelected = computed(() => filteredWorks.value.length > 0 && selectedCount.value === filteredWorks.value.length);
const publishedCount = computed(() => works.value.filter((work) => work.published).length);
const draftCount = computed(() => works.value.filter((work) => !work.published).length);
const emptyInfo = computed(() => {
  if (renderedTab.value === "published") return { icon: "□", title: "暂无已发布作品", sub: "创作完成后点击发布，让更多人看到" };
  if (renderedTab.value === "draft") return { icon: "▤", title: "暂无草稿", sub: "生成的作品会自动保存到草稿箱" };
  return { icon: "□", title: "还没有作品", sub: "去创作页生成你的第一幅AI画作吧" };
});

onBeforeUnmount(() => {
  if (loadingTimer) clearTimeout(loadingTimer);
});

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

function goPublish() {
  uni.navigateTo({ url: "/pages/publish/index" });
}

function goFollowList() {
  uni.navigateTo({ url: "/pages/follow-list/index?type=followers" });
}

function switchGalleryTab(tab: GalleryTab, index: number) {
  if (tab === activeTab.value || isLoading.value) return;
  activeTab.value = tab;
  slideDirection.value = index > galleryTabs.findIndex((item) => item.key === renderedTab.value) ? "left" : "right";
  selectedIds.value = new Set();
  isLoading.value = true;
  if (loadingTimer) clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => {
    renderedTab.value = tab;
    renderKey.value += 1;
    isLoading.value = false;
  }, 320);
}

function toggleManage() {
  manageMode.value = !manageMode.value;
  selectedIds.value = new Set();
}

function toggleSelect(event: Event, workId: number) {
  if (!manageMode.value) return;
  event.stopPropagation();
  const next = new Set(selectedIds.value);
  if (next.has(workId)) {
    next.delete(workId);
  } else {
    next.add(workId);
  }
  selectedIds.value = next;
}

function selectAll() {
  if (!filteredWorks.value.length) return;
  selectedIds.value = allCurrentSelected.value ? new Set() : new Set(filteredWorks.value.map((work) => work.id));
}

function deleteSelected() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: "请先选择要删除的作品", icon: "none" });
    return;
  }

  const count = selectedIds.value.size;
  works.value = works.value.filter((work) => !selectedIds.value.has(work.id));
  selectedIds.value = new Set();
  manageMode.value = false;
  renderKey.value += 1;
  uni.showToast({ title: `已删除 ${count} 个作品`, icon: "none" });
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
  if (manageMode.value) return;
  uni.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` });
}

</script>

<template>
  <view class="gallery-page">
    <scroll-view class="gallery-scroll" scroll-y>
      <view class="header-bg">
        <view class="header-bar">
          <view class="icon-btn" @click="showTodo('侧边菜单')">☰</view>
          <view class="spacer" />
          <view class="bg-btn" @click="showTodo('设置背景')">
            <text>◉</text>
            <text>设置背景</text>
          </view>
          <view class="icon-btn search" @click="goSearch">⌕</view>
        </view>

        <view class="profile-area">
          <view class="profile-row">
            <view class="avatar-wrap">
              <view class="profile-avatar" :style="{ background: galleryUser.color }">{{ galleryUser.avatar }}</view>
              <view class="avatar-plus" @click="showTodo('更换头像')">+</view>
            </view>
            <view class="profile-main">
              <view class="profile-name">{{ galleryUser.name }}</view>
              <view class="profile-id">ID: {{ galleryUser.userNo }}</view>
              <view class="gender-tag">♀</view>
            </view>
          </view>

          <view class="bio">{{ galleryUser.bio }}</view>
          <view class="role-tag">✦ {{ galleryUser.role }}</view>

          <view class="stats-row">
            <view class="stats">
              <view class="stat">
                <text class="stat-num rose">{{ galleryUser.works }}</text>
                <text class="stat-label">作品</text>
              </view>
              <view class="stat" @click="goFollowList">
                <text class="stat-num accent">{{ galleryUser.followers }}</text>
                <text class="stat-label">粉丝</text>
              </view>
              <view class="stat">
                <text class="stat-num lavender">{{ galleryUser.likes }}</text>
                <text class="stat-label">获赞</text>
              </view>
            </view>
            <button class="edit-btn" @click="showTodo('编辑资料')">编辑资料</button>
          </view>
        </view>
      </view>

      <view class="gallery-tabs-row">
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

      <view class="summary-row">
        <text>全部 {{ works.length }}</text>
        <text>已发布 {{ publishedCount }}</text>
        <text>草稿 {{ draftCount }}</text>
      </view>

      <view class="gallery-content">
        <view v-if="isLoading" :key="`loading-${activeTab}`" class="loading-card">
          <view class="spinner" />
        </view>

        <view v-else-if="filteredWorks.length" :key="`waterfall-${renderedTab}-${renderKey}`" class="waterfall" :class="slideDirection === 'left' ? 'slide-left' : 'slide-right'">
          <view class="waterfall-column">
            <view v-for="work in leftColumnWorks" :key="work.id" class="work-card" @click="openWork(work)">
              <view v-if="manageMode" class="select-dot" :class="{ selected: selectedIds.has(work.id) }" @click="toggleSelect($event, work.id)">✓</view>
              <view class="status-badge" :class="{ draft: !work.published }">{{ work.published ? "✓ 已发布" : "▤ 草稿" }}</view>
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="author">
                    <view class="mini-avatar" :style="{ background: galleryUser.color }">{{ galleryUser.avatar }}</view>
                    <text class="author-name">{{ galleryUser.name }}</text>
                  </view>
                  <view v-if="work.published" class="likes">♡ {{ work.likes }}</view>
                </view>
              </view>
            </view>
          </view>

          <view class="waterfall-column">
            <view v-for="work in rightColumnWorks" :key="work.id" class="work-card" @click="openWork(work)">
              <view v-if="manageMode" class="select-dot" :class="{ selected: selectedIds.has(work.id) }" @click="toggleSelect($event, work.id)">✓</view>
              <view class="status-badge" :class="{ draft: !work.published }">{{ work.published ? "✓ 已发布" : "▤ 草稿" }}</view>
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="author">
                    <view class="mini-avatar" :style="{ background: galleryUser.color }">{{ galleryUser.avatar }}</view>
                    <text class="author-name">{{ galleryUser.name }}</text>
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
      </view>

      <view :class="['manage-bar', { show: manageMode }]">
        <text class="selected-count">已选择 {{ selectedCount }} 项</text>
        <button class="select-all-btn" @click="selectAll">{{ allCurrentSelected ? "取消全选" : "全选" }}</button>
        <button class="delete-btn" :class="{ enabled: selectedCount > 0 }" @click="deleteSelected">删除</button>
      </view>
    </scroll-view>

    <view class="publish-btn" @click="goPublish">+</view>

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
  </view>
</template>

<style scoped>
.gallery-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
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

.header-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 16px;
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
  font-size: 20px;
}

.spacer {
  flex: 1;
}

.bg-btn,
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

.avatar-plus {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 16px;
  color: #fff;
  background: var(--accent);
  border: 2px solid var(--bg-base);
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

.profile-id {
  margin-top: 3px;
  font-size: 13px;
  color: var(--fg-muted);
}

.gender-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  margin-top: 2px;
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
  margin: 8px 16px 0;
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

.summary-row {
  display: flex;
  gap: 8px;
  padding: 0 16px 10px;
  font-size: 11px;
  color: var(--fg-muted);
}

.gallery-content {
  padding: 0 8px 12px;
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
