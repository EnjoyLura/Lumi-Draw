<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, ref } from "vue";
import { onReady, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { useTheme } from "../../services/theme";
import { currentVersion } from "../changelog/changelogData";
import { aboutItems, type SettingsLink } from "./settingsData";
import { fetchChangelog } from "./settingsService";

const { useMockData } = useDataMode();
const { theme, themeClass, setTheme } = useTheme();
const { isLoggedIn, currentUser, login: commitLogin, logout } = useAuth();
const darkMode = computed(() => theme.value === "dark");
const showLoginSheet = ref(false);
const versionMeta = ref(currentVersion);
const cacheMeta = ref("12.5MB");
const isInitialContentReady = ref(false);
let initialContentTimer: ReturnType<typeof setTimeout> | undefined;

const featureItems = [
  { label: "消息中心", icon: "✉", colorClass: "rose", url: "/pages/messages/index" },
  { label: "浏览历史", icon: "◷", colorClass: "mint", url: "/pages/history/index" },
  { label: "生成记录", icon: "◎", colorClass: "lavender", url: "/pages/generation-history/index" }
];
const visibleAboutItems = computed(() =>
  aboutItems.map((item) => {
    if (item.key === "version") return { ...item, meta: versionMeta.value };
    if (item.key === "cache") return { ...item, meta: cacheMeta.value };
    return item;
  })
);

onShow(() => {
  void loadVersionMeta();
});

onReady(() => {
  initialContentTimer = setTimeout(() => {
    isInitialContentReady.value = true;
    initialContentTimer = undefined;
  }, 16);
});

function requireSession() {
  if (isLoggedIn.value) return true;
  showLoginSheet.value = true;
  return false;
}

function goEditProfile() {
  if (!requireSession()) return;
  uni.navigateTo({ url: "/pages/edit-profile/index" });
}

async function loadVersionMeta() {
  if (useMockData.value) {
    versionMeta.value = currentVersion;
    return;
  }

  try {
    const rows = await fetchChangelog();
    versionMeta.value = rows[0]?.version || currentVersion;
  } catch {
    versionMeta.value = currentVersion;
  }
}

function toggleDarkMode() {
  setTheme(darkMode.value ? "light" : "dark");
}

function openFeature(url: string) {
  if (!requireSession()) return;
  uni.navigateTo({ url });
}

function clearAppCache() {
  const cacheKeys = [
    "lumi-home-announcement-dismissed-week",
    "lumiReadMessageCategories",
    "lumi-search-history",
    "lumiCreatePromptDraft",
    "lumi-draw:active-generate-jobs",
    "lumi-draw:notified-generate-jobs"
  ];

  cacheKeys.forEach((key) => {
    try {
      uni.removeStorageSync(key);
    } catch {
      // Ignore storage errors in preview runtimes.
    }
  });
  cacheMeta.value = "0MB";
  uni.showToast({ title: "缓存已清除", icon: "none" });
}

function handleAbout(item: SettingsLink) {
  const agreementTypes: Record<string, string> = {
    agreement: "user",
    privacy: "privacy",
    "recharge-agreement": "recharge"
  };
  if (agreementTypes[item.key]) {
    uni.navigateTo({ url: `/pages/agreement/index?type=${agreementTypes[item.key]}` });
    return;
  }
  if (item.key === "version") {
    uni.navigateTo({ url: "/pages/changelog/index" });
    return;
  }
  if (item.key === "cache") {
    clearAppCache();
    return;
  }
  uni.showToast({ title: item.label, icon: "none" });
}

async function handleLoginAction() {
  if (!isLoggedIn.value) {
    showLoginSheet.value = true;
    return;
  }

  await logout();
  uni.showToast({ title: "已退出登录", icon: "none" });
}

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}
</script>

<template>
  <view class="settings-page" :class="themeClass">
    <LumiPageHeader title="设置" />
    <view v-if="!isInitialContentReady" class="page-first-frame" />
    <scroll-view v-else class="page-scroll" scroll-y>
      <view class="settings-content">
        <view class="section-title">账号</view>
        <view class="card">
          <view class="list-row" @click="goEditProfile">
            <view class="lr-icon accent">✎</view>
            <view class="lr-text">{{ isLoggedIn ? `编辑个人资料${currentUser?.nickname ? ` · ${currentUser.nickname}` : ""}` : "登录后编辑个人资料" }}</view>
            <view class="lr-arrow">›</view>
          </view>
        </view>

        <view class="section-title">功能</view>
        <view class="card">
          <view v-for="item in featureItems" :key="item.label" class="list-row" @click="openFeature(item.url)">
            <view class="lr-icon" :class="item.colorClass">{{ item.icon }}</view>
            <view class="lr-text">{{ item.label }}</view>
            <view class="lr-arrow">›</view>
          </view>
        </view>

        <view class="section-title">外观</view>
        <view class="card">
          <view class="list-row" @click="toggleDarkMode">
            <view class="lr-icon accent">☀</view>
            <view class="lr-text">深色模式</view>
            <view class="switch" :class="{ active: darkMode }"><view class="knob" /></view>
          </view>
        </view>

        <view class="section-title">关于</view>
        <view class="card">
          <view v-for="item in visibleAboutItems" :key="item.key" class="list-row" @click="handleAbout(item)">
            <view class="lr-icon">{{ item.icon }}</view>
            <view class="lr-text">{{ item.label }}</view>
            <text v-if="item.meta" class="lr-meta">{{ item.meta }}</text>
            <view class="lr-arrow">›</view>
          </view>
        </view>

        <button class="logout-btn" :class="{ login: !isLoggedIn }" @click="handleLoginAction">
          {{ isLoggedIn ? "退出登录" : "立即登录" }}
        </button>
      </view>
    </scroll-view>

    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  flex: 1;
  height: 0;
}

.page-first-frame {
  flex: 1;
  background: var(--page-bg);
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
  border: 1px solid var(--card-border);
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

.lr-icon.rose {
  color: var(--rose);
}

.lr-text {
  flex: 1;
  font-size: 15px;
  color: var(--fg-primary);
}

.lr-multi {
  flex: 1;
}

.lr-sub {
  margin-top: 2px;
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

.tag-muted {
  color: var(--fg-muted);
  background: var(--bg-soft);
}

.switch {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 26px;
  background: var(--bg-soft);
  border: 1px solid var(--card-border);
  border-radius: 999px;
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
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.logout-btn::after {
  border: none;
}

.logout-btn.login {
  color: var(--accent);
}

/* Lumi custom page header layout */
.settings-page {
  display: flex;
  flex-direction: column;
}

.settings-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
