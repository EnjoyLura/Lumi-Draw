<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getWorkById, getWorkUser, type DetailWork } from "./workDetailData";

const workId = ref(1);
const liked = ref(false);
const favorited = ref(false);

const work = computed(() => getWorkById(workId.value));
const user = computed(() => (work.value ? getWorkUser(work.value) : undefined));
const isOwn = computed(() => work.value?.userId === 1);
const likeCount = computed(() => (work.value?.likes || 0) + (liked.value ? 1 : 0));
const favoriteCount = computed(() => (work.value?.favorites || 0) + (favorited.value ? 1 : 0));

onLoad((query) => {
  const id = Number(query?.id || 1);
  if (Number.isFinite(id) && id > 0) workId.value = id;
});

function copyPrompt() {
  if (!work.value) return;
  uni.setClipboardData({ data: work.value.prompt });
}

function toggleLike() {
  liked.value = !liked.value;
}

function toggleFavorite() {
  favorited.value = !favorited.value;
}

function goReport() {
  uni.navigateTo({ url: `/pages/report/index?workId=${workId.value}` });
}

function remakeWork(current: DetailWork) {
  uni.navigateTo({
    url: `/pages/create/index?prompt=${encodeURIComponent(current.prompt)}`
  });
}

function showToast(title: string) {
  uni.showToast({ title, icon: "none" });
}
</script>

<template>
  <view class="detail-page">
    <template v-if="work && user">
      <scroll-view class="detail-scroll" scroll-y>
        <image class="detail-image" :src="work.image" mode="aspectFill" @longpress="goReport" />

        <view class="detail-body">
          <view class="author-row">
            <view class="author-main">
              <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
              <view class="author-text">
                <view class="author-name">{{ user.name }}</view>
                <view class="author-sub">{{ isOwn ? "48作品 · 1.2k获赞" : "32作品 · 860获赞" }}</view>
              </view>
            </view>
            <button v-if="isOwn" class="small-btn muted" @click="showToast('管理功能将在后续任务迁移')">管理</button>
            <button v-else class="small-btn primary" @click="showToast('关注成功')">+ 关注</button>
          </view>

          <view class="title-row">
            <view class="work-title">{{ work.title }}</view>
            <view v-if="!isOwn" class="report-link" @click="goReport">举报</view>
          </view>
          <view v-if="work.published" class="work-desc">{{ work.description }}</view>

          <view class="tag-row">
            <text class="tag accent">{{ work.modelName }}</text>
            <text class="tag mint">{{ work.ratio }}</text>
            <text class="tag lavender">{{ work.styleName }}</text>
            <text v-for="tag in work.tags" :key="tag" class="tag peach">{{ tag }}</text>
          </view>

          <view class="prompt-card">
            <view class="prompt-head">
              <text>提示词</text>
              <button class="copy-btn" @click="copyPrompt">复制</button>
            </view>
            <view class="prompt-text">{{ work.prompt }}</view>
          </view>

          <view class="time-text">生成于 {{ work.time }}</view>

          <view v-if="work.published" class="stats-row">
            <view class="stat">
              <view class="stat-num rose">{{ likeCount }}</view>
              <view class="stat-label">点赞</view>
            </view>
            <view class="stat">
              <view class="stat-num accent">{{ favoriteCount }}</view>
              <view class="stat-label">收藏</view>
            </view>
            <view class="stat">
              <view class="stat-num lavender">{{ work.remakes }}</view>
              <view class="stat-label">同款</view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="detail-bottom">
        <template v-if="isOwn">
          <view class="bottom-icon danger" @click="showToast('删除作品将在后续任务迁移')">
            <text>⌫</text>
            <text>删除</text>
          </view>
          <view class="bottom-icon" @click="showToast('已保存到相册')">
            <text>⇩</text>
            <text>下载</text>
          </view>
          <button class="remake-btn" @click="remakeWork(work)">重新生成</button>
        </template>
        <template v-else>
          <view class="bottom-action" :class="{ active: liked }" @click="toggleLike">
            <text>{{ liked ? "♥" : "♡" }}</text>
            <text>{{ likeCount }}</text>
          </view>
          <view class="bottom-action" :class="{ active: favorited }" @click="toggleFavorite">
            <text>{{ favorited ? "★" : "☆" }}</text>
            <text>{{ favoriteCount }}</text>
          </view>
          <button class="remake-btn" @click="remakeWork(work)">一键同款</button>
        </template>
      </view>
    </template>

    <view v-else class="empty-state">
      <view class="empty-icon">▧</view>
      <view class="empty-title">作品不存在</view>
    </view>
  </view>
</template>

<style scoped>
.detail-page {
  --bg-base: #eef4fc;
  --bg-soft: #e1ebf8;
  --bg-card: #ffffff;
  --fg-primary: #0e1f3a;
  --fg-secondary: #445876;
  --fg-muted: #8497b5;
  --border: rgba(91, 159, 232, 0.14);
  --accent: #5b9fe8;
  --accent-soft: rgba(91, 159, 232, 0.12);
  --mint: #6fd4b0;
  --mint-soft: rgba(111, 212, 176, 0.14);
  --peach: #ffb59a;
  --peach-soft: rgba(255, 181, 154, 0.16);
  --lavender: #b8a5e3;
  --lavender-soft: rgba(184, 165, 227, 0.16);
  --rose: #ffa8b8;
  --rose-soft: rgba(255, 168, 184, 0.16);
  --gradient-dream: linear-gradient(135deg, #b8a5e3 0%, #5b9fe8 52%, #6fd4b0 100%);
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--bg-base);
}

.detail-scroll {
  position: absolute;
  inset: 0 0 76px;
}

.detail-image {
  display: block;
  width: 100%;
  max-height: 400px;
}

.detail-body {
  padding: 16px;
}

.author-row,
.author-main {
  display: flex;
  gap: 10px;
  align-items: center;
}

.author-row {
  margin-bottom: 12px;
}

.author-main {
  flex: 1;
  min-width: 0;
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.author-text {
  min-width: 0;
}

.author-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
}

.small-btn {
  flex: 0 0 auto;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 999px;
}

.small-btn::after,
.copy-btn::after,
.remake-btn::after {
  border: none;
}

.small-btn.primary {
  color: #fff;
  background: var(--accent);
}

.small-btn.muted {
  color: var(--fg-secondary);
  background: var(--bg-soft);
}

.title-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.work-title {
  flex: 1;
  min-width: 0;
  font-size: 18px;
  font-weight: 700;
}

.report-link {
  font-size: 12px;
  color: var(--fg-muted);
}

.work-desc {
  margin-bottom: 14px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fg-secondary);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.tag {
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
}

.tag.accent {
  color: var(--accent);
  background: var(--accent-soft);
}

.tag.mint {
  color: var(--mint);
  background: var(--mint-soft);
}

.tag.lavender {
  color: #8470c7;
  background: var(--lavender-soft);
}

.tag.peach {
  color: #e07a5a;
  background: var(--peach-soft);
}

.prompt-card {
  padding: 12px;
  margin-bottom: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.prompt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
}

.copy-btn {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--accent);
  background: transparent;
  border: none;
}

.prompt-text {
  font-size: 13px;
  line-height: 1.6;
}

.time-text {
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--fg-muted);
}

.stats-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 0.5px solid var(--border);
  border-bottom: 0.5px solid var(--border);
}

.stat {
  flex: 1;
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
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
}

.detail-bottom {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 14px 16px 20px;
  background: rgba(255, 255, 255, 0.78);
  border-top: 0.5px solid var(--border);
  box-shadow: 0 -4px 20px rgba(60, 120, 200, 0.06);
  backdrop-filter: blur(20px) saturate(180%);
}

.bottom-action,
.bottom-icon {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-muted);
}

.bottom-icon {
  flex-direction: column;
  gap: 2px;
  min-width: 44px;
  font-size: 11px;
}

.bottom-icon text:first-child {
  font-size: 24px;
}

.bottom-icon.danger {
  color: var(--rose);
}

.bottom-action text:first-child {
  font-size: 28px;
}

.bottom-action.active {
  color: var(--rose);
}

.remake-btn {
  flex: 1;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--fg-muted);
}

.empty-icon {
  margin-bottom: 8px;
  font-size: 38px;
  color: var(--accent);
}

.empty-title {
  font-size: 15px;
  font-weight: 700;
}
</style>
