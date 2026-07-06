<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { resolveTabEnterClass } from "../../services/pageTransition";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { accountItems, mineUser, quickActions, supportItems, type MineListItem } from "./mineData";
import { fetchMineProfile, fetchUnreadMessageCount, toMineUser } from "./mineService";

const { isLoggedIn, currentUser, login: commitLogin, updateCurrentUser } = useAuth();
const { useMockData } = useDataMode();
const tabEnterClass = resolveTabEnterClass("pages/mine/index");
const EMPTY_MINE_USER = {
  ...mineUser,
  name: "",
  avatar: "",
  userNo: "",
  credits: 0
};
const showLoginSheet = ref(false);
const displayUser = ref(EMPTY_MINE_USER);
const unreadMessageCount = ref(0);
const isLoadingProfile = ref(false);
let lastLoadKey = "";

function resetRealMineUser() {
  displayUser.value = EMPTY_MINE_USER;
  unreadMessageCount.value = 0;
}

const accountRows = computed(() => {
  if (useMockData.value) return accountItems;
  return accountItems.map((item) => {
    if (item.key !== "messages") return item;
    return {
      ...item,
      badge: unreadMessageCount.value > 0 ? String(unreadMessageCount.value) : undefined,
      dot: unreadMessageCount.value > 0
    };
  });
});

onShow(() => {
  const loadKey = `${useMockData.value}-${isLoggedIn.value}-${currentUser.value?.id || 0}`;
  if (useMockData.value && lastLoadKey === loadKey) return;
  lastLoadKey = loadKey;
  void loadProfile();
});

async function loadProfile() {
  if (useMockData.value) {
    displayUser.value = mineUser;
    unreadMessageCount.value = 0;
    return;
  }
  if (!isLoggedIn.value) {
    resetRealMineUser();
    return;
  }

  isLoadingProfile.value = true;
  try {
    const [profile, unread] = await Promise.all([fetchMineProfile(), fetchUnreadMessageCount()]);
    displayUser.value = toMineUser(profile);
    unreadMessageCount.value = unread;
    updateCurrentUser({
      nickname: profile.nickname,
      avatarText: profile.avatarText,
      avatarColor: profile.avatarColor,
      credits: profile.credits
    });
  } catch {
    resetRealMineUser();
    uni.showToast({ title: "用户资料加载失败", icon: "none" });
  } finally {
    isLoadingProfile.value = false;
  }
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

function goGallery() {
  uni.redirectTo({ url: "/pages/gallery/index" });
}

function handleProfileTap() {
  if (!isLoggedIn.value) {
    showLoginSheet.value = true;
    return;
  }
  uni.navigateTo({ url: "/pages/edit-profile/index" });
}

function handleCreditsTap() {
  if (isLoggedIn.value) {
    uni.navigateTo({ url: "/pages/recharge/index" });
  } else {
    showLoginSheet.value = true;
  }
}

function handleQuickAction(label: string) {
  if (!isLoggedIn.value) {
    showLoginSheet.value = true;
    return;
  }
  const item = quickActions.find((action) => action.label === label);
  if (item?.key === "recharge") {
    uni.navigateTo({ url: "/pages/recharge/index" });
    return;
  }
  if (item?.key === "checkin") {
    uni.navigateTo({ url: "/pages/checkin/index" });
    return;
  }
  if (item?.key === "membership") {
    uni.navigateTo({ url: "/pages/membership/index" });
    return;
  }
  if (item?.key === "invite") {
    uni.navigateTo({ url: "/pages/invite/index" });
    return;
  }
}

function handleListItem(item: MineListItem) {
  if (item.key === "messages" && !isLoggedIn.value) {
    showLoginSheet.value = true;
    return;
  }
  if (item.key === "messages") {
    uni.navigateTo({ url: "/pages/messages/index" });
    return;
  }
  if (item.key === "settings") {
    uni.navigateTo({ url: "/pages/settings/index" });
    return;
  }
  if (item.key === "feedback") {
    uni.navigateTo({ url: "/pages/feedback/index" });
    return;
  }
  if (item.key === "service") {
    uni.navigateTo({ url: "/pages/feedback/index?source=service" });
    return;
  }
  if (item.key === "drafts") {
    uni.navigateTo({ url: "/pages/drafts/index" });
    return;
  }
  if (item.key === "history") {
    uni.navigateTo({ url: "/pages/history/index" });
    return;
  }
  if (item.key === "generationHistory") {
    uni.navigateTo({ url: "/pages/generation-history/index" });
    return;
  }
  if (item.key === "following") {
    uni.navigateTo({ url: "/pages/follow-list/index?type=following" });
    return;
  }
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
</script>

<template>
  <view class="mine-page" :class="tabEnterClass">
    <scroll-view class="mine-scroll" scroll-y>
      <view class="mine-content">
        <view class="profile-card">
          <view class="user-row">
            <view class="avatar" :style="{ background: isLoggedIn ? displayUser.color : 'var(--bg-soft)' }" @click="handleProfileTap">
              {{ isLoggedIn ? displayUser.avatar : "☺" }}
            </view>
            <view class="user-info" @click="handleProfileTap">
              <view class="user-name">{{ isLoggedIn ? (isLoadingProfile ? "加载中..." : displayUser.name) : "点击登录" }}</view>
              <view class="user-id">{{ isLoggedIn ? `ID: ${displayUser.userNo}` : "登录解锁更多功能" }}</view>
            </view>
            <view class="credits" @click="handleCreditsTap">
              <view class="credits-label">我的积分</view>
              <view class="credits-num">{{ isLoggedIn ? displayUser.credits : "--" }}</view>
            </view>
          </view>

          <view class="quick-grid">
            <view v-for="item in quickActions" :key="item.key" class="quick-item" @click="handleQuickAction(item.label)">
              <view class="quick-icon" :style="{ background: item.gradient }">{{ item.icon }}</view>
              <view class="quick-label">{{ item.label }}</view>
            </view>
          </view>
        </view>

        <view class="list-card">
          <view v-for="item in accountRows" :key="item.key" class="list-row" @click="handleListItem(item)">
            <view class="row-icon" :style="{ color: item.color || 'var(--fg-muted)' }">{{ item.icon }}</view>
            <view class="row-text">{{ item.label }}</view>
            <view v-if="item.badge" class="badge">{{ item.badge }}</view>
            <view v-if="item.dot" class="dot" />
            <view class="arrow">›</view>
          </view>
        </view>

        <view class="list-card support-card">
          <view v-for="item in supportItems" :key="item.key" class="list-row" @click="handleListItem(item)">
            <view class="row-icon">{{ item.icon }}</view>
            <view class="row-text">{{ item.label }}</view>
            <view class="arrow">›</view>
          </view>
        </view>
      </view>
    </scroll-view>

    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />

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
      <view class="tab-item" @click="goGallery">
        <text class="tab-icon">□</text>
        <text class="tab-label">画廊</text>
      </view>
      <view class="tab-item active">
        <text class="tab-icon">☺</text>
        <text class="tab-label">我的</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.mine-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.mine-scroll {
  position: absolute;
  inset: 0 0 80px;
  z-index: 1;
  box-sizing: border-box;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.mine-scroll::-webkit-scrollbar,
.mine-scroll .uni-scroll-view::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.mine-content {
  padding: 16px 16px 20px;
}

.profile-card {
  position: relative;
  padding: 18px 16px;
}

.user-row {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 16px;
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 4px 12px var(--accent-glow);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  overflow: hidden;
  font-size: 17px;
  font-weight: 700;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-id {
  margin-top: 3px;
  font-size: 13px;
  color: var(--fg-muted);
}

.credits {
  flex: 0 0 auto;
  text-align: right;
}

.credits-label {
  font-size: 14px;
  color: var(--fg-muted);
}

.credits-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding-top: 14px;
  border-top: 0.5px solid var(--border);
}

.quick-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  border-radius: 12px;
}

.quick-label {
  font-size: 11px;
  color: var(--fg-secondary);
}

.list-card {
  overflow: hidden;
  margin-bottom: 16px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.support-card {
  margin-bottom: 20px;
}

.list-row {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 52px;
  padding: 0 14px;
}

.list-row + .list-row::before {
  content: "";
  position: absolute;
  top: 0;
  right: 16px;
  left: 16px;
  height: 0.5px;
  background: var(--border);
}

.row-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 22px;
  color: var(--fg-muted);
}

.row-text {
  flex: 1;
  font-size: 15px;
  color: var(--fg-primary);
}

.badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 10px;
  line-height: 18px;
  color: #fff;
  text-align: center;
  background: var(--rose);
  border-radius: 999px;
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--rose);
  border-radius: 50%;
}

.arrow {
  flex: 0 0 auto;
  font-size: 18px;
  color: var(--fg-muted);
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
</style>
