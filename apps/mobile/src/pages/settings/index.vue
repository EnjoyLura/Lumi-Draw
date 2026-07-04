<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { setUseMockData, useDataMode } from "../../services/dataMode";
import { aboutItems, type SettingsLink } from "./settingsData";

const { useMockData } = useDataMode();
const darkMode = ref(false);
const isLoggedIn = ref(true);

onLoad(() => {
  const theme = uni.getStorageSync("lumi-theme");
  darkMode.value = theme === "dark";
  const login = uni.getStorageSync("lumi-logged-in");
  if (login === "0" || login === "1") {
    isLoggedIn.value = login === "1";
  }
});

function goEditProfile() {
  uni.navigateTo({ url: "/pages/edit-profile/index" });
}

function tapPhone() {
  uni.showToast({ title: "手机号已绑定", icon: "none" });
}

function toggleDark() {
  darkMode.value = !darkMode.value;
  uni.setStorageSync("lumi-theme", darkMode.value ? "dark" : "light");
}

function toggleMock() {
  setUseMockData(!useMockData.value);
  uni.showToast({ title: useMockData.value ? "已切换为模拟数据" : "已切换为后端接口", icon: "none" });
}

function handleAbout(item: SettingsLink) {
  if (item.key === "version") {
    uni.showToast({ title: "更新日志将在后续任务迁移", icon: "none" });
    return;
  }
  if (item.key === "cache") {
    uni.showToast({ title: "缓存已清除", icon: "none" });
    return;
  }
  uni.showToast({ title: item.label, icon: "none" });
}

function toggleLogin() {
  isLoggedIn.value = !isLoggedIn.value;
  uni.setStorageSync("lumi-logged-in", isLoggedIn.value ? "1" : "0");
  uni.showToast({ title: isLoggedIn.value ? "登录成功" : "已退出登录", icon: "none" });
}
</script>

<template>
  <view class="settings-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="settings-content">
        <view class="section-title">账号</view>
        <view class="card">
          <view class="list-row" @click="goEditProfile">
            <view class="lr-icon accent">✎</view>
            <view class="lr-text">编辑个人资料</view>
            <view class="lr-arrow">›</view>
          </view>
          <view class="list-row" @click="tapPhone">
            <view class="lr-icon mint">☏</view>
            <view class="lr-text">手机号 138****8888</view>
            <view class="tag tag-mint">已绑定</view>
          </view>
        </view>

        <view class="section-title">外观</view>
        <view class="card">
          <view class="list-row" @click="toggleDark">
            <view class="lr-icon accent">☀</view>
            <view class="lr-text">深色模式</view>
            <view class="switch" :class="{ active: darkMode }"><view class="knob" /></view>
          </view>
        </view>

        <view class="section-title">开发调试</view>
        <view class="card">
          <view class="list-row" @click="toggleMock">
            <view class="lr-icon lavender">≣</view>
            <view class="lr-multi">
              <view class="lr-text">模拟数据</view>
              <view class="lr-sub">开启后使用静态数据，关闭后请求后端接口</view>
            </view>
            <view class="switch" :class="{ active: useMockData }"><view class="knob" /></view>
          </view>
        </view>

        <view class="section-title">关于</view>
        <view class="card">
          <view v-for="item in aboutItems" :key="item.key" class="list-row" @click="handleAbout(item)">
            <view class="lr-icon">{{ item.icon }}</view>
            <view class="lr-text">{{ item.label }}</view>
            <text v-if="item.meta" class="lr-meta">{{ item.meta }}</text>
            <view class="lr-arrow">›</view>
          </view>
        </view>

        <button class="logout-btn" :class="{ login: !isLoggedIn }" @click="toggleLogin">
          {{ isLoggedIn ? "⤺ 退出登录" : "→ 立即登录" }}
        </button>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.settings-page {
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
  --mint-soft: rgba(111, 212, 176, 0.16);
  --lavender: #b8a5e3;
  --rose: #ffa8b8;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
}

.settings-content {
  padding: 16px;
}

.section-title {
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--fg-primary);
}

.card {
  overflow: hidden;
  margin-bottom: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.list-row {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 52px;
  padding: 6px 16px;
  border-bottom: 0.5px solid var(--border);
}

.list-row:last-child {
  border-bottom: none;
}

.list-row:active {
  background: var(--accent-soft);
}

.lr-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 20px;
  color: var(--fg-muted);
}

.lr-icon.accent {
  color: var(--accent);
}

.lr-icon.mint {
  color: var(--mint);
}

.lr-icon.lavender {
  color: var(--lavender);
}

.lr-text {
  flex: 1;
  font-size: 15px;
  color: var(--fg-primary);
}

.lr-multi {
  flex: 1;
}

.lr-multi .lr-text {
  margin-bottom: 2px;
}

.lr-sub {
  font-size: 11px;
  color: var(--fg-muted);
}

.lr-meta {
  margin-right: 6px;
  font-size: 12px;
  color: var(--fg-muted);
}

.lr-arrow {
  flex: 0 0 auto;
  font-size: 18px;
  color: var(--fg-muted);
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
}

.tag-mint {
  color: var(--mint);
  background: var(--mint-soft);
}

.switch {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 26px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  transition: all 0.2s ease;
}

.switch .knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: left 0.2s ease;
}

.switch.active {
  background: var(--accent);
  border-color: var(--accent);
}

.switch.active .knob {
  left: 22px;
}

.logout-btn {
  width: 100%;
  height: 44px;
  margin-top: 8px;
  font-size: 15px;
  line-height: 44px;
  color: var(--rose);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.logout-btn::after {
  border: none;
}

.logout-btn.login {
  color: var(--accent);
}
</style>
