<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { setUseMockData, useDataMode } from "../../services/dataMode";
import { useTheme } from "../../services/theme";
import { aboutItems, type SettingsLink } from "./settingsData";
import { fetchSettingsProfile, updateSettingsPhone } from "./settingsService";

const { useMockData } = useDataMode();
const { theme, toggleTheme } = useTheme();
const { isLoggedIn, currentUser, login: commitLogin, logout, syncAuthState } = useAuth();
const darkMode = computed(() => theme.value === "dark");
const showLoginSheet = ref(false);
const phone = ref(currentUser.value?.phone || "");
const isSavingPhone = ref(false);

const phoneText = computed(() => {
  if (!isLoggedIn.value) return "手机号 --";
  if (!phone.value) return "手机号 未绑定";
  return `手机号 ${phone.value.slice(0, 3)}****${phone.value.slice(-4)}`;
});
const phoneTagText = computed(() => {
  if (!isLoggedIn.value) return "未登录";
  return phone.value ? "已绑定" : "未绑定";
});

onShow(() => {
  void loadSettingsProfile();
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

async function loadSettingsProfile() {
  if (!isLoggedIn.value) {
    phone.value = "";
    return;
  }
  if (useMockData.value) {
    phone.value = currentUser.value?.phone || "";
    return;
  }

  try {
    const profile = await fetchSettingsProfile();
    phone.value = profile.phone || "";
  } catch {
    phone.value = currentUser.value?.phone || "";
  }
}

function showPhoneInput() {
  return new Promise<string | null>((resolve) => {
    uni.showModal({
      title: phone.value ? "修改手机号" : "绑定手机号",
      content: phone.value,
      editable: true,
      placeholderText: "请输入 11 位手机号",
      confirmText: "保存",
      success(result) {
        const nextValue = "content" in result && typeof result.content === "string" ? result.content : "";
        resolve(result.confirm ? nextValue.trim() : null);
      },
      fail() {
        resolve(null);
      }
    } as UniApp.ShowModalOptions & { editable: boolean; placeholderText: string });
  });
}

async function tapPhone() {
  if (!requireSession()) return;
  if (isSavingPhone.value) return;
  const nextPhone = await showPhoneInput();
  if (nextPhone === null) return;
  if (!/^1[3-9]\d{9}$/.test(nextPhone)) {
    uni.showToast({ title: "请输入正确的手机号", icon: "none" });
    return;
  }

  if (useMockData.value) {
    phone.value = nextPhone;
    if (currentUser.value) currentUser.value.phone = nextPhone;
    uni.showToast({ title: "手机号已保存", icon: "none" });
    return;
  }

  isSavingPhone.value = true;
  try {
    const profile = await updateSettingsPhone(nextPhone);
    phone.value = profile.phone || nextPhone;
    if (currentUser.value) currentUser.value.phone = phone.value;
    uni.showToast({ title: "手机号已保存", icon: "none" });
  } catch {
    uni.showToast({ title: "手机号保存失败", icon: "none" });
  } finally {
    isSavingPhone.value = false;
  }
}

function toggleDark() {
  toggleTheme();
}

function toggleMock() {
  setUseMockData(!useMockData.value);
  syncAuthState();
  void loadSettingsProfile();
  uni.showToast({ title: useMockData.value ? "已切换为模拟数据" : "已切换为后端接口", icon: "none" });
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
    uni.showToast({ title: "缓存已清除", icon: "none" });
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
  <view class="settings-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="settings-content">
        <view class="section-title">账号</view>
        <view class="card">
          <view class="list-row" @click="goEditProfile">
            <view class="lr-icon accent">✎</view>
            <view class="lr-text">{{ isLoggedIn ? `编辑个人资料${currentUser?.nickname ? ` · ${currentUser.nickname}` : ""}` : "登录后编辑个人资料" }}</view>
            <view class="lr-arrow">›</view>
          </view>
          <view class="list-row" @click="tapPhone">
            <view class="lr-icon mint">●</view>
            <view class="lr-text">{{ phoneText }}</view>
            <view class="tag" :class="phone ? 'tag-mint' : 'tag-muted'">{{ isSavingPhone ? "保存中" : phoneTagText }}</view>
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
            <view class="lr-icon lavender">≋</view>
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
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
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
</style>
