<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { homeUsers, homeWorks, type HomeWork } from "../home/homeData";
import { plazaCategories, plazaTabs, type PlazaTab } from "./plazaData";

const filterOpen = ref(false);
const filterModels = ["全部", "GPT Image 2", "Nano Banana 2", "Flux Pro", "SDXL", "DALL-E 3", "Midjourney"];
const filterSizes = ["全部", "1:1", "3:4", "4:3", "16:9", "9:16"];
const filterQualities = ["全部", "标清", "高清", "超清"];
const filterSelection = reactive({
  category: new Set<string>(),
  model: new Set<string>(),
  size: new Set<string>(),
  quality: new Set<string>()
});
type FilterGroup = keyof typeof filterSelection;

function isFilterActive(group: FilterGroup, value: string) {
  return filterSelection[group].has(value);
}

function toggleFilter(group: FilterGroup, value: string) {
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
  uni.showToast({ title: "筛选已应用", icon: "none" });
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
const lastCategoryIndex = ref(0);
const likedWorkIds = ref<Set<number>>(new Set());
const visibleWorkCount = ref(10);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const slideDirection = ref<"left" | "right">("left");
const renderKey = ref(0);

let loadingTimer: ReturnType<typeof setTimeout> | undefined;
let loadMoreTimer: ReturnType<typeof setTimeout> | undefined;

const displayedWorks = computed(() => filteredWorks.value.slice(0, visibleWorkCount.value));
const leftColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 1));
const hasMoreWorks = computed(() => visibleWorkCount.value < filteredWorks.value.length);

const filteredWorks = computed(() => {
  if (renderedTab.value === "favorite") {
    return homeWorks.filter((work) => likedWorkIds.value.has(work.id));
  }

  const category = plazaCategories[activeCategoryIndex.value];
  const baseWorks = category === "全部" ? homeWorks : filterByCategory(homeWorks, category);

  if (renderedTab.value === "hot") {
    return [...baseWorks].sort((a, b) => b.likes - a.likes);
  }

  if (renderedTab.value === "new") {
    return [...baseWorks].reverse();
  }

  return baseWorks;
});

onBeforeUnmount(() => {
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
});

function showTodo(label: string) {
  uni.showToast({ title: `${label}将在后续任务迁移`, icon: "none" });
}

function goHome() {
  uni.redirectTo({ url: "/pages/home/index" });
}

function goCreate() {
  uni.navigateTo({ url: "/pages/create/index" });
}

function goGallery() {
  uni.redirectTo({ url: "/pages/gallery/index" });
}

function goMine() {
  uni.redirectTo({ url: "/pages/mine/index" });
}

function goSearch() {
  uni.navigateTo({ url: "/pages/search/index" });
}

function openWorkDetail(workId: number) {
  uni.navigateTo({ url: `/pages/work-detail/index?id=${workId}` });
}

function switchPlazaTab(tab: PlazaTab, index: number) {
  if (tab === activeTab.value || isLoading.value) return;
  activeTab.value = tab;
  slideDirection.value = index > plazaTabs.findIndex((item) => item.key === renderedTab.value) ? "left" : "right";
  queueRefresh(() => {
    renderedTab.value = tab;
  });
}

function selectCategory(index: number) {
  if (index === activeCategoryIndex.value || isLoading.value) return;
  slideDirection.value = index > lastCategoryIndex.value ? "left" : "right";
  lastCategoryIndex.value = index;
  activeCategoryIndex.value = index;
  queueRefresh();
}

function queueRefresh(after?: () => void) {
  isLoading.value = true;
  visibleWorkCount.value = 10;
  if (loadingTimer) clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => {
    after?.();
    renderKey.value += 1;
    isLoading.value = false;
  }, 300);
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
  return homeUsers.find((user) => user.id === work.userId) || homeUsers[0];
}

function getAspectRatio(ratio: string) {
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height) return "1 / 1";
  return `${width} / ${height}`;
}

function toggleLike(event: Event, workId: number) {
  event.stopPropagation();
  const next = new Set(likedWorkIds.value);
  if (next.has(workId)) {
    next.delete(workId);
  } else {
    next.add(workId);
  }
  likedWorkIds.value = next;
}

function openFilter() {
  filterOpen.value = true;
}

function closeFilter() {
  filterOpen.value = false;
}

function handleReachBottom() {
  if (isLoading.value || isLoadingMore.value || !hasMoreWorks.value) return;
  isLoadingMore.value = true;
  if (loadMoreTimer) clearTimeout(loadMoreTimer);
  loadMoreTimer = setTimeout(() => {
    visibleWorkCount.value = Math.min(visibleWorkCount.value + 4, filteredWorks.value.length);
    isLoadingMore.value = false;
  }, 500);
}
</script>

<template>
  <view class="plaza-page">
    <scroll-view class="plaza-scroll" scroll-y :lower-threshold="80" @scrolltolower="handleReachBottom">
      <view class="plaza-content">
        <view class="nav-header">
          <view class="status-spacer" :style="{ height: statusBarHeight + 'px' }" />
          <view class="nav-row">
            <text class="nav-title">广场</text>
          </view>
        </view>

        <view class="top-tabs">
          <view class="menu-btn" @click="showTodo('侧边菜单')">☰</view>
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
                v-for="(category, index) in plazaCategories"
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

        <view v-if="isLoading" class="loading-card">
          <view class="spinner" />
        </view>

        <view
          v-else-if="filteredWorks.length"
          :key="renderKey"
          class="waterfall"
          :class="slideDirection === 'left' ? 'slide-left' : 'slide-right'"
        >
          <view class="waterfall-column">
            <view v-for="work in leftColumnWorks" :key="work.id" class="work-card" @click="openWorkDetail(work.id)">
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ work.title }}</view>
                <view class="work-meta">
                  <view class="author">
                    <view class="avatar" :style="{ background: getUser(work).color }">{{ getUser(work).avatar }}</view>
                    <text class="author-name">{{ getUser(work).name }}</text>
                  </view>
                  <view class="like" :class="{ liked: likedWorkIds.has(work.id) }" @click="toggleLike($event, work.id)">
                    <text>{{ likedWorkIds.has(work.id) ? "♥" : "♡" }}</text>
                    <text>{{ work.likes + (likedWorkIds.has(work.id) ? 1 : 0) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="waterfall-column">
            <view v-for="work in rightColumnWorks" :key="work.id" class="work-card" @click="openWorkDetail(work.id)">
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ work.title }}</view>
                <view class="work-meta">
                  <view class="author">
                    <view class="avatar" :style="{ background: getUser(work).color }">{{ getUser(work).avatar }}</view>
                    <text class="author-name">{{ getUser(work).name }}</text>
                  </view>
                  <view class="like" :class="{ liked: likedWorkIds.has(work.id) }" @click="toggleLike($event, work.id)">
                    <text>{{ likedWorkIds.has(work.id) ? "♥" : "♡" }}</text>
                    <text>{{ work.likes + (likedWorkIds.has(work.id) ? 1 : 0) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-state">
          <view class="empty-icon">{{ renderedTab === "favorite" ? "♡" : "⌕" }}</view>
          <view class="empty-title">{{ renderedTab === "favorite" ? "暂无收藏" : "暂无作品" }}</view>
          <view class="empty-sub">{{ renderedTab === "favorite" ? "点击作品上的收藏按钮，收藏喜欢的创作" : "换个分类看看更多作品" }}</view>
        </view>

        <view v-if="!isLoading && filteredWorks.length" class="load-more-hint" :class="{ 'is-loading': isLoadingMore }">
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

    <view class="sheet-overlay" :class="{ show: filterOpen }" @click="closeFilter" />
    <view class="filter-sheet" :class="{ show: filterOpen }">
      <view class="sheet-handle" />
      <view class="sheet-body">
        <view class="filter-title">分类</view>
        <view class="chip-wrap">
          <view
            v-for="cat in plazaCategories"
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

.waterfall {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 0 8px;
}

.waterfall.slide-left {
  animation: wf-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.waterfall.slide-right {
  animation: wf-right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.waterfall-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.work-card {
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

.like {
  display: flex;
  gap: 3px;
  align-items: center;
  padding: 2px 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
  border-radius: 8px;
  transition:
    color 0.25s ease,
    background 0.25s ease,
    transform 0.25s ease;
}

.like.liked {
  color: var(--rose);
  transform: scale(1.04);
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

@keyframes wf-left {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes wf-right {
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
