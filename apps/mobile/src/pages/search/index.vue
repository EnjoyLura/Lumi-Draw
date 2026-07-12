<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, reactive, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { homeUsers as mockHomeUsers, homeWorks, type HomeUser, type HomeWork } from "../home/homeData";
import { hotSearches, initialSearchHistory, searchKeywordAliases } from "./searchData";
import { fetchHotSearches, searchWorks } from "./searchService";
import { useTheme } from "../../services/theme";
import { galleryUser, galleryWorks } from "../gallery/galleryData";

const { themeClass } = useTheme();

const PAGE_SIZE = 12;
const SEARCH_HISTORY_KEY = "lumi-search-history";
const { useMockData } = useDataMode();
const { isLoggedIn } = useAuth();
const searchScope = ref<"all" | "gallery" | "mine">("all");
const isPersonalScope = computed(() => searchScope.value !== "all");
const searchTitle = computed(() => (searchScope.value === "mine" ? "搜索我的作品" : searchScope.value === "gallery" ? "搜索画廊作品" : "搜索"));
const searchPlaceholder = computed(() => (isPersonalScope.value ? "搜索作品标题、提示词或模型" : "搜索作品、提示词或用户"));
const keyword = ref("");
const submittedKeyword = ref("");
const searchHistory = ref([...initialSearchHistory]);
const backendResults = ref<HomeWork[]>([]);
const userList = ref<HomeUser[]>([]);
const hotSearchList = ref([...hotSearches]);
const hotSearchLoadFailed = ref(false);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const pageState = reactive({ page: 1, hasMore: false });
let lastMockMode: boolean | null = null;

const results = computed(() => {
  const query = submittedKeyword.value.trim().toLowerCase();
  if (!query) return [];
  if (!useMockData.value) return backendResults.value;

  const terms = [query, ...(searchKeywordAliases[submittedKeyword.value.trim()] || [])].map((item) => item.toLowerCase());

  const sourceWorks = isPersonalScope.value ? galleryWorks : homeWorks;
  return sourceWorks.filter((work) => {
    const user = getUser(work);
    const searchableText = `${work.title} ${work.prompt} ${work.modelName || ""} ${isPersonalScope.value ? "" : user.name}`.toLowerCase();
    return terms.some((term) => searchableText.includes(term));
  });
});

const leftColumnWorks = computed(() => results.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => results.value.filter((_, index) => index % 2 === 1));
const hasMore = computed(() => !useMockData.value && pageState.hasMore);

onLoad((query) => {
  const scope = query?.scope;
  searchScope.value = scope === "gallery" || scope === "mine" ? scope : "all";
});

onShow(() => {
  loadSearchHistory();
  if (lastMockMode === useMockData.value) {
    if (!useMockData.value && submittedKeyword.value) void runBackendSearch(submittedKeyword.value, 1, false);
    return;
  }
  lastMockMode = useMockData.value;
  if (useMockData.value) {
    userList.value = isPersonalScope.value
      ? [{ id: galleryUser.id, name: galleryUser.name, avatar: galleryUser.avatar, color: galleryUser.color }]
      : mockHomeUsers;
  } else {
    userList.value = [];
    backendResults.value = [];
    pageState.page = 1;
    pageState.hasMore = false;
  }
  if (!isPersonalScope.value) void loadHotSearches();
  if (!useMockData.value && submittedKeyword.value) void runBackendSearch(submittedKeyword.value, 1, false);
});

function loadSearchHistory() {
  try {
    const stored = uni.getStorageSync(SEARCH_HISTORY_KEY);
    if (Array.isArray(stored)) {
      searchHistory.value = stored
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 6);
    }
  } catch {
    // Storage can be unavailable in preview environments.
  }
}

function saveSearchHistory() {
  try {
    uni.setStorageSync(SEARCH_HISTORY_KEY, searchHistory.value);
  } catch {
    // Storage can be unavailable in preview environments.
  }
}

function mergeUsers(nextUsers: HomeUser[]) {
  const map = new Map<number, HomeUser>();
  userList.value.forEach((user) => map.set(user.id, user));
  nextUsers.forEach((user) => map.set(user.id, user));
  userList.value = Array.from(map.values());
}

async function loadHotSearches() {
  if (useMockData.value) {
    hotSearchList.value = [...hotSearches];
    hotSearchLoadFailed.value = false;
    return;
  }

  try {
    const rows = await fetchHotSearches();
    hotSearchList.value = rows;
    hotSearchLoadFailed.value = false;
  } catch {
    hotSearchList.value = [];
    hotSearchLoadFailed.value = true;
  }
}

async function runBackendSearch(query: string, page = 1, append = false) {
  isLoading.value = !append;
  isLoadingMore.value = append;
  try {
    const result = await searchWorks(query, page, PAGE_SIZE, {
      skipAuth: !isLoggedIn.value,
      scope: searchScope.value === "gallery" || searchScope.value === "mine" ? searchScope.value : undefined
    });
    backendResults.value = append ? [...backendResults.value, ...result.works] : result.works;
    mergeUsers(result.users);
    pageState.page = result.page;
    pageState.hasMore = result.hasMore;
  } catch {
    if (!append) backendResults.value = [];
    uni.showToast({ title: "搜索失败，请稍后重试", icon: "none" });
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
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

async function doSearch(value = keyword.value) {
  const query = value.trim();
  keyword.value = query;
  submittedKeyword.value = query;
  if (!query) {
    backendResults.value = [];
    return;
  }

  searchHistory.value = [query, ...searchHistory.value.filter((item) => item !== query)].slice(0, 6);
  saveSearchHistory();
  if (!useMockData.value) {
    await runBackendSearch(query, 1, false);
  }
}

function handleTyping() {
  if (!keyword.value.trim()) submittedKeyword.value = "";
}

function clearSearchHistory() {
  searchHistory.value = [];
  saveSearchHistory();
  uni.showToast({ title: "已清空搜索历史", icon: "none" });
}

function openWorkDetail(workId: number) {
  uni.navigateTo({ url: `/pages/work-detail/index?id=${workId}` });
}

function goUserProfile(userId: number) {
  uni.navigateTo({ url: `/pages/user-profile/index?id=${userId}` });
}

function handleReachBottom() {
  if (useMockData.value || isLoading.value || isLoadingMore.value || !hasMore.value || !submittedKeyword.value) return;
  void runBackendSearch(submittedKeyword.value, pageState.page + 1, true);
}
</script>

<template>
  <view class="search-page" :class="themeClass">
    <LumiPageHeader :title="searchTitle" />
    <LumiDeferredPageContent>
    <scroll-view class="page-scroll" scroll-y :lower-threshold="80" @scrolltolower="handleReachBottom">
      <view class="search-wrap">
        <view class="search-row">
          <view class="input-wrap">
            <LumiIcon class="search-icon" name="search" :size="18" />
            <input
              v-model="keyword"
              class="search-input"
              :placeholder="searchPlaceholder"
              confirm-type="search"
              @input="handleTyping"
              @confirm="doSearch()"
            />
          </view>
          <button class="search-btn" @click="doSearch()">搜索</button>
        </view>

        <view v-if="!submittedKeyword" class="search-default">
          <view class="section">
            <view class="section-title">
              <text>搜索历史</text>
              <text class="more" @click="clearSearchHistory">清空</text>
            </view>
            <view v-if="searchHistory.length" class="chip-row">
              <view v-for="item in searchHistory" :key="item" class="chip" @click="doSearch(item)">{{ item }}</view>
            </view>
            <view v-else class="empty-history">暂无搜索历史</view>
          </view>

          <view v-if="!isPersonalScope" class="section">
            <view class="section-title hot-title">
              <text class="fire">♨</text>
              <text>热门搜索</text>
            </view>
            <view class="hot-list">
              <view v-for="(item, index) in hotSearchList" :key="item" class="hot-row" @click="doSearch(item)">
                <text class="hot-index" :class="{ top: index < 3 }">{{ index + 1 }}</text>
                <text class="hot-text">{{ item }}</text>
              </view>
            </view>
            <view v-if="!useMockData && !hotSearchList.length" class="hot-empty">
              <text>{{ hotSearchLoadFailed ? "热门搜索加载失败" : "暂无热门搜索" }}</text>
              <button v-if="hotSearchLoadFailed" class="hot-retry" @click="loadHotSearches">重试</button>
            </view>
          </view>
        </view>

        <view v-else-if="isLoading" class="loading-state">
          <view class="spinner" />
          <text>正在搜索</text>
        </view>

        <view v-else-if="results.length" class="waterfall">
          <view class="waterfall-column">
            <view v-for="work in leftColumnWorks" :key="work.id" class="work-card" @click="openWorkDetail(work.id)">
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ work.title }}</view>
                <view class="work-meta">
                  <view class="author" @click.stop="goUserProfile(work.userId)">
                    <view class="avatar" :style="{ background: getUser(work).color }">{{ getUser(work).avatar }}</view>
                    <text class="author-name">{{ getUser(work).name }}</text>
                  </view>
                  <view class="likes" :class="{ liked: work.liked }"><LumiIcon :name="work.liked ? 'heart-filled' : 'heart'" :size="14" />{{ work.likes }}</view>
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
                  <view class="author" @click.stop="goUserProfile(work.userId)">
                    <view class="avatar" :style="{ background: getUser(work).color }">{{ getUser(work).avatar }}</view>
                    <text class="author-name">{{ getUser(work).name }}</text>
                  </view>
                  <view class="likes" :class="{ liked: work.liked }"><LumiIcon :name="work.liked ? 'heart-filled' : 'heart'" :size="14" />{{ work.likes }}</view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="submittedKeyword && results.length && !isLoading" class="load-more-hint" :class="{ 'is-loading': isLoadingMore }">
          <view v-if="isLoadingMore" class="spinner mini" />
          <text>{{ isLoadingMore ? "正在加载更多作品" : hasMore ? "继续往下滑获取更多作品" : "已经到底了" }}</text>
        </view>

        <view v-if="submittedKeyword && !isLoading && !results.length" class="empty-state">
          <view class="empty-icon"><LumiIcon name="search" :size="30" /></view>
          <view class="empty-title">没有找到相关作品</view>
          <view class="empty-sub">试试其他关键词吧</view>
        </view>
      </view>
    </scroll-view>
    </LumiDeferredPageContent>
  </view>
</template>

<style scoped>
.search-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
  box-sizing: border-box;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar,
.page-scroll .uni-scroll-view::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.search-wrap {
  padding: 12px 16px 18px;
}

.search-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.input-wrap {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  z-index: 1;
  font-size: 18px;
  color: var(--fg-muted);
  transform: translateY(-50%);
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 38px;
  box-sizing: border-box;
  font-size: 14px;
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  transition: border-color 0.3s, box-shadow 0.3s, background 0.3s;
}

.search-input:focus-within {
  background: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search-btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin: 0;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  background: transparent;
  border: none;
  border-radius: 10px;
  line-height: 1.35;
  white-space: nowrap;
}

.search-btn::after {
  border: none;
}

.section {
  margin-bottom: 18px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 700;
}

.more {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.hot-title {
  justify-content: flex-start;
  gap: 4px;
}

.fire {
  font-size: 18px;
  color: var(--peach);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 12px;
  font-size: 13px;
  color: var(--fg-secondary);
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 999px;
}

.empty-history {
  padding: 4px 0;
  font-size: 13px;
  color: var(--fg-muted);
}

.hot-list {
  display: flex;
  flex-direction: column;
}

.hot-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 13px;
  color: var(--fg-muted);
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.hot-retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin: 0;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: none;
  border-radius: 999px;
  line-height: 1.4;
}

.hot-retry::after {
  border: none;
}

.hot-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 13px 16px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.hot-row:active {
  background: var(--accent-soft);
  transform: scale(0.99);
}

.hot-index {
  display: inline-block;
  width: 24px;
  font-family: Georgia, serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--fg-muted);
  text-align: left;
}

.hot-row:first-child .hot-index {
  color: #e03050;
}

.hot-row:nth-child(2) .hot-index {
  color: #e87040;
}

.hot-row:nth-child(3) .hot-index {
  color: #f0a060;
}

.hot-text {
  flex: 1;
  font-size: 15px;
  color: var(--fg-primary);
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

.likes {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
}

.likes.liked {
  color: var(--rose);
}

.loading-state,
.load-more-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 24px 0 12px;
  font-size: 12px;
  color: var(--fg-muted);
}

.loading-state {
  flex-direction: column;
  padding: 54px 0;
}

.load-more-hint.is-loading {
  color: var(--accent);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
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

/* Lumi custom page header layout */
.search-page {
  display: flex;
  flex-direction: column;
}

.search-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
