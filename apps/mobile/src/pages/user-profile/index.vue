<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import type { HomeWork } from "../home/homeData";
import { getProfileUser, getUserWorks, isFollowing, setFollowing } from "./userProfileData";

const userId = ref(1);
const searchOpen = ref(false);
const searchText = ref("");
const confirmOpen = ref(false);

const user = computed(() => getProfileUser(userId.value));
const following = computed(() => isFollowing(userId.value));
const allWorks = computed(() => getUserWorks(userId.value));
const filteredWorks = computed(() => {
  const query = searchText.value.trim().toLowerCase();
  if (!query) return allWorks.value;
  return allWorks.value.filter((work) => (work.title || work.prompt || "").toLowerCase().includes(query));
});
const leftColumn = computed(() => filteredWorks.value.filter((_, index) => index % 2 === 0));
const rightColumn = computed(() => filteredWorks.value.filter((_, index) => index % 2 === 1));
const genderIcon = computed(() => (user.value.gender === "female" ? "♀" : "♂"));

onLoad((query) => {
  const id = Number(query?.id || 1);
  if (Number.isFinite(id) && id > 0) userId.value = id;
});

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

function toggleSearch() {
  searchOpen.value = !searchOpen.value;
  if (!searchOpen.value) searchText.value = "";
}

function toggleFollow() {
  if (following.value) {
    confirmOpen.value = true;
    return;
  }
  setFollowing(userId.value, true);
  uni.showToast({ title: "关注成功", icon: "none" });
}

function confirmUnfollow() {
  setFollowing(userId.value, false);
  confirmOpen.value = false;
  uni.showToast({ title: "已取消关注", icon: "none" });
}
</script>

<template>
  <view class="profile-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="profile-header">
        <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
        <view class="header-main">
          <view class="user-name">{{ user.name }}</view>
          <view class="user-id">ID: LUMI{{ user.id }}</view>
          <view class="gender-tag" :class="user.gender">{{ genderIcon }}</view>
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
        <view class="search-toggle" @click="toggleSearch">⌕</view>
      </view>

      <view v-if="searchOpen" class="search-bar">
        <text class="search-icon">⌕</text>
        <input class="search-input" v-model="searchText" placeholder="搜索TA的作品..." />
      </view>

      <view class="works-wrap">
        <view v-if="filteredWorks.length" class="waterfall">
          <view class="waterfall-column">
            <view v-for="work in leftColumn" :key="work.id" class="work-card" @click="openWork(work)">
              <image class="work-img" :src="work.image" mode="aspectFill" :style="{ aspectRatio: getAspectRatio(work.ratio) }" />
              <view class="work-body">
                <view class="work-title">{{ displayTitle(work) }}</view>
                <view class="work-meta">
                  <view class="mini-avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
                  <text class="likes">♡ {{ work.likes }}</text>
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
                  <text class="likes">♡ {{ work.likes }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="works-empty">未找到相关作品</view>
        <view v-if="filteredWorks.length" class="load-more-hint">继续往下滑获取更多作品</view>
      </view>
    </scroll-view>

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
  </view>
</template>

<style scoped>
.profile-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
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

.user-id {
  margin-top: 3px;
  font-size: 13px;
  color: var(--fg-muted);
}

.gender-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  margin-top: 6px;
  padding: 0 6px;
  font-size: 12px;
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
  border: 1px solid var(--border);
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

.likes {
  flex: 1;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: right;
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
</style>
