<script setup lang="ts">
import { computed, ref } from "vue";
import { homeUsers, homeWorks, type HomeWork } from "../home/homeData";
import { hotSearches, initialSearchHistory, searchKeywordAliases } from "./searchData";

const keyword = ref("");
const submittedKeyword = ref("");
const searchHistory = ref([...initialSearchHistory]);

const results = computed(() => {
  const query = submittedKeyword.value.trim().toLowerCase();
  if (!query) return [];
  const terms = [query, ...(searchKeywordAliases[submittedKeyword.value.trim()] || [])].map((item) => item.toLowerCase());

  return homeWorks.filter((work) => {
    const user = getUser(work);
    const searchableText = `${work.title} ${work.prompt} ${user.name}`.toLowerCase();
    return terms.some((term) => searchableText.includes(term));
  });
});

const leftColumnWorks = computed(() => results.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => results.value.filter((_, index) => index % 2 === 1));

function getUser(work: HomeWork) {
  return homeUsers.find((user) => user.id === work.userId) || homeUsers[0];
}

function getAspectRatio(ratio: string) {
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height) return "1 / 1";
  return `${width} / ${height}`;
}

function doSearch(value = keyword.value) {
  const query = value.trim();
  keyword.value = query;
  submittedKeyword.value = query;
  if (!query) return;

  searchHistory.value = [query, ...searchHistory.value.filter((item) => item !== query)].slice(0, 6);
}

function handleTyping() {
  if (!keyword.value.trim()) submittedKeyword.value = "";
}

function clearSearchHistory() {
  searchHistory.value = [];
  uni.showToast({ title: "已清空搜索历史", icon: "none" });
}

function showTodo(label: string) {
  uni.showToast({ title: `${label}将在后续任务迁移`, icon: "none" });
}

function openWorkDetail(workId: number) {
  uni.navigateTo({ url: `/pages/work-detail/index?id=${workId}` });
}
</script>

<template>
  <view class="search-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="search-wrap">
        <view class="search-row">
          <view class="input-wrap">
            <text class="search-icon">⌕</text>
            <input
              v-model="keyword"
              class="search-input"
              placeholder="搜索作品、提示词或用户"
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

          <view class="section">
            <view class="section-title hot-title">
              <text class="fire">♨</text>
              <text>热门搜索</text>
            </view>
            <view class="hot-list">
              <view v-for="(item, index) in hotSearches" :key="item" class="hot-row" @click="doSearch(item)">
                <text class="hot-index" :class="{ top: index < 3 }">{{ index + 1 }}</text>
                <text class="hot-text">{{ item }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="results.length" class="waterfall">
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
                  <view class="likes">♡ {{ work.likes }}</view>
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
                  <view class="likes">♡ {{ work.likes }}</view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-state">
          <view class="empty-icon">⌕</view>
          <view class="empty-title">没有找到相关作品</view>
          <view class="empty-sub">试试其他关键词吧</view>
        </view>
      </view>
    </scroll-view>
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
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
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
</style>
