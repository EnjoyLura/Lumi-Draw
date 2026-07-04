<script setup lang="ts">
import { ref } from "vue";
import { accountItems, mineUser, quickActions, supportItems, type MineListItem } from "./mineData";

const isLoggedIn = ref(true);
const showLoginSheet = ref(false);

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

function goGallery() {
  uni.redirectTo({ url: "/pages/gallery/index" });
}

function handleProfileTap() {
  if (!isLoggedIn.value) {
    showLoginSheet.value = true;
  }
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
  showTodo(label);
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
  showTodo(item.label);
}

function login() {
  isLoggedIn.value = true;
  showLoginSheet.value = false;
  uni.showToast({ title: "登录成功", icon: "none" });
}
</script>

<template>
  <view class="mine-page">
    <scroll-view class="mine-scroll" scroll-y>
      <view class="mine-content">
        <view class="profile-card">
          <view class="user-row">
            <view class="avatar" @click="handleProfileTap">{{ isLoggedIn ? mineUser.avatar : "☺" }}</view>
            <view class="user-info" @click="handleProfileTap">
              <view class="user-name">{{ isLoggedIn ? mineUser.name : "点击登录" }}</view>
              <view class="user-id">{{ isLoggedIn ? `ID: ${mineUser.userNo}` : "登录解锁更多功能" }}</view>
            </view>
            <view class="credits" @click="handleCreditsTap">
              <view class="credits-label">我的积分</view>
              <view class="credits-num">{{ isLoggedIn ? mineUser.credits : "--" }}</view>
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
          <view v-for="item in accountItems" :key="item.key" class="list-row" @click="handleListItem(item)">
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

    <view v-if="showLoginSheet" class="login-overlay" @click="showLoginSheet = false" />
    <view class="login-sheet" :class="{ show: showLoginSheet }">
      <view class="sheet-handle" />
      <view class="login-logo">✎</view>
      <view class="login-title">登录露米绘画</view>
      <view class="login-sub">登录后即可体验AI创作、收藏作品等功能</view>
      <button class="login-primary" @click="login">▣ 手机号一键登录</button>
      <button class="login-wechat" @click="login">微信登录</button>
      <view class="login-agree">
        登录即代表同意 <text>用户协议</text> 和 <text>隐私政策</text>
      </view>
    </view>

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
  --bg-base: #eef4fc;
  --bg-soft: #e1ebf8;
  --bg-card: #ffffff;
  --fg-primary: #0e1f3a;
  --fg-secondary: #445876;
  --fg-muted: #8497b5;
  --border: rgba(91, 159, 232, 0.14);
  --accent: #5b9fe8;
  --accent-soft: rgba(91, 159, 232, 0.12);
  --accent-glow: rgba(91, 159, 232, 0.28);
  --tab-active: #5b9fe8;
  --mint: #6fd4b0;
  --peach: #ffb59a;
  --lavender: #b8a5e3;
  --lemon: #ffe08a;
  --rose: #ffa8b8;
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
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
  border: 1px solid var(--border);
  border-radius: 10px;
}

.support-card {
  margin-bottom: 20px;
}

.list-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 52px;
  padding: 0 14px;
  border-bottom: 0.5px solid var(--border);
}

.list-row:last-child {
  border-bottom: none;
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

.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.36);
}

.login-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 310;
  padding: 24px 24px 32px;
  text-align: center;
  background: var(--bg-card);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 30px rgba(14, 31, 58, 0.12);
  transform: translateY(110%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-sheet.show {
  transform: translateY(0);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto 20px;
  background: var(--border-strong, rgba(91, 159, 232, 0.32));
  border-radius: 999px;
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  font-size: 28px;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), #7bc4f0);
  border-radius: 16px;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.login-title {
  margin-bottom: 6px;
  font-size: 20px;
  font-weight: 700;
}

.login-sub {
  margin-bottom: 24px;
  font-size: 13px;
  color: var(--fg-muted);
}

.login-primary,
.login-wechat {
  width: 100%;
  height: 44px;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
}

.login-primary {
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
}

.login-wechat {
  color: #07c160;
  background: var(--bg-soft);
  border: 1px solid var(--border);
}

.login-agree {
  margin-top: 6px;
  font-size: 11px;
  color: var(--fg-muted);
}

.login-agree text {
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
  background: rgba(255, 255, 255, 0.6);
  border-top: 0.5px solid rgba(255, 255, 255, 0.3);
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
