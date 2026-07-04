<script setup lang="ts">
import { computed } from "vue";
import { galleryUser, galleryWorks } from "../gallery/galleryData";
import type { HomeWork } from "../home/homeData";

const drafts = computed(() => galleryWorks.filter((work) => !work.published));
const leftColumn = computed(() => drafts.value.filter((_, index) => index % 2 === 0));
const rightColumn = computed(() => drafts.value.filter((_, index) => index % 2 === 1));

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
</script>

<template>
  <view class="drafts-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="drafts-content">
        <template v-if="drafts.length">
          <view class="waterfall">
            <view class="waterfall-column">
              <view v-for="work in leftColumn" :key="work.id" class="work-card" @click="openWork(work)">
                <view class="status-badge">▤ 草稿</view>
                <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
                <view class="work-body">
                  <view class="work-title">{{ displayTitle(work) }}</view>
                  <view class="work-meta">
                    <view class="mini-avatar" :style="{ background: galleryUser.color }">{{ galleryUser.avatar }}</view>
                    <text class="author-name">{{ galleryUser.name }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view class="waterfall-column">
              <view v-for="work in rightColumn" :key="work.id" class="work-card" @click="openWork(work)">
                <view class="status-badge">▤ 草稿</view>
                <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
                <view class="work-body">
                  <view class="work-title">{{ displayTitle(work) }}</view>
                  <view class="work-meta">
                    <view class="mini-avatar" :style="{ background: galleryUser.color }">{{ galleryUser.avatar }}</view>
                    <text class="author-name">{{ galleryUser.name }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view class="load-more-hint">继续往下滑获取更多作品</view>
        </template>

        <view v-else class="empty-state">
          <view class="empty-icon">▤</view>
          <view class="empty-title">暂无草稿</view>
          <view class="empty-sub">生成的作品会自动保存到草稿箱</view>
          <button class="empty-btn" @click="goCreate">＋ 去创作</button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.drafts-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
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
  padding: 20px 0;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: center;
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
</style>
