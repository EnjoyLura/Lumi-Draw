<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { navigateBackOrRedirect } from "../../services/navigation";
import { uploadChosenImage } from "../../services/upload";
import { fetchMyProfile, updateMyProfile } from "./profileService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const { isLoggedIn, login: commitLogin, requireLogin, updateCurrentUser } = useAuth();
const { useMockData } = useDataMode();

const nickname = ref("");
const gender = ref<"male" | "female" | "unknown">("unknown");
const signature = ref("");
const accountId = ref("");
const avatarText = ref("露");
const avatarColor = ref("var(--accent)");
const avatarUrl = ref("");
const isSaving = ref(false);
const isUploading = ref(false);
const showLoginSheet = ref(false);
const loginRequired = ref(false);
const loadFailed = ref(false);

const nickCount = computed(() => `${nickname.value.length}/20`);
const signCount = computed(() => `${signature.value.length}/100`);

function leaveEditProfilePage() {
  navigateBackOrRedirect("/pages/mine/index");
}

onShow(() => {
  void loadProfile();
});

function clearProfile() {
  nickname.value = "";
  gender.value = "unknown";
  signature.value = "";
  accountId.value = "";
  avatarText.value = "露";
  avatarColor.value = "var(--accent)";
  avatarUrl.value = "";
}

function resetMockProfile() {
  nickname.value = "云端造梦师";
  gender.value = "male";
  signature.value = "用 AI 描绘心中的梦境，每一笔都是想象力的延伸";
  accountId.value = "LUMI8829";
  avatarText.value = "梦";
  avatarColor.value = "var(--accent)";
  avatarUrl.value = "";
  loginRequired.value = false;
  loadFailed.value = false;
}

async function loadProfile() {
  loadFailed.value = false;
  if (useMockData.value) {
    resetMockProfile();
    return;
  }
  if (!isLoggedIn.value) {
    clearProfile();
    loginRequired.value = true;
    return;
  }
  loginRequired.value = false;
  clearProfile();

  try {
    const profile = await fetchMyProfile();
    nickname.value = profile.nickname || nickname.value;
    gender.value = (profile.gender as "male" | "female" | "unknown") || "unknown";
    signature.value = profile.bio || "";
    accountId.value = `LUMI${String(profile.id).padStart(4, "0")}`;
    avatarText.value = profile.avatarText || profile.nickname?.slice(0, 1) || "露";
    avatarColor.value = profile.avatarColor || "var(--accent)";
    avatarUrl.value = profile.avatarUrl || "";
  } catch {
    clearProfile();
    loadFailed.value = true;
    uni.showToast({ title: "资料加载失败", icon: "none" });
  }
}

function openLoginSheet() {
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
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

async function pickAvatar() {
  if (!ensureLogin() || isUploading.value) return;

  if (useMockData.value) {
    uni.showToast({ title: "头像已更新", icon: "none" });
    return;
  }

  isUploading.value = true;
  try {
    const uploaded = await uploadChosenImage("avatar");
    avatarUrl.value = uploaded.publicUrl;
    uni.showToast({ title: "头像已上传", icon: "none" });
  } catch {
    uni.showToast({ title: "头像上传失败", icon: "none" });
  } finally {
    isUploading.value = false;
  }
}

async function save() {
  if (isSaving.value) return;
  if (loadFailed.value) {
    uni.showToast({ title: "资料未加载，请重试", icon: "none" });
    return;
  }
  if (!nickname.value.trim()) {
    uni.showToast({ title: "请输入昵称", icon: "none" });
    return;
  }

  if (useMockData.value) {
    uni.showToast({ title: "资料已保存", icon: "none" });
    setTimeout(leaveEditProfilePage, 600);
    return;
  }
  if (!ensureLogin()) return;

  isSaving.value = true;
  try {
    const profile = await updateMyProfile({
      nickname: nickname.value.trim(),
      avatarUrl: avatarUrl.value,
      bio: signature.value.trim(),
      gender: gender.value
    });
    updateCurrentUser({
      nickname: profile.nickname,
      avatarText: profile.avatarText,
      avatarColor: profile.avatarColor,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      gender: profile.gender
    });
    uni.showToast({ title: "资料已保存", icon: "none" });
    setTimeout(leaveEditProfilePage, 600);
  } catch {
    uni.showToast({ title: "保存失败，请稍后重试", icon: "none" });
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <view class="edit-page" :class="themeClass">
    <scroll-view class="page-scroll" scroll-y>
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        title="登录后编辑资料"
        subtitle="登录后才能读取并修改你的真实账号资料。"
        @login="showLoginSheet = true"
      />

      <view v-else-if="loadFailed" class="edit-empty">
        <view class="empty-icon">□</view>
        <view class="empty-title">资料加载失败</view>
        <view class="empty-sub">请检查登录状态或稍后重试。</view>
        <button class="empty-btn" @click="loadProfile">重新加载</button>
      </view>

      <view v-else class="edit-content">
        <view class="avatar-block">
          <view class="avatar-wrap" @click="pickAvatar">
            <image v-if="avatarUrl" class="avatar avatar-img" :src="avatarUrl" mode="aspectFill" />
            <view v-else class="avatar" :style="{ background: avatarColor }">{{ avatarText }}</view>
            <view class="avatar-cam">{{ isUploading ? "..." : "●" }}</view>
          </view>
          <view class="avatar-tip">点击更换头像</view>
        </view>

        <view class="field">
          <view class="field-label">昵称</view>
          <input class="input" type="text" v-model="nickname" placeholder="请输入昵称" :maxlength="20" />
          <view class="counter">{{ nickCount }}</view>
        </view>

        <view class="field">
          <view class="field-label">性别</view>
          <view class="gender-row">
            <view class="gender-option" :class="{ active: gender === 'male' }" @click="gender = 'male'">男</view>
            <view class="gender-option" :class="{ active: gender === 'female' }" @click="gender = 'female'">女</view>
            <view class="gender-option" :class="{ active: gender === 'unknown' }" @click="gender = 'unknown'">保密</view>
          </view>
        </view>

        <view class="field">
          <view class="field-label">个性签名</view>
          <textarea class="input textarea" v-model="signature" placeholder="写一句个性签名吧" :maxlength="100" />
          <view class="counter">{{ signCount }}</view>
        </view>

        <view class="field lock-field">
          <view class="field-label">账号ID</view>
          <view class="lock-row">
            <input class="input locked" type="text" :value="accountId" disabled />
            <view class="lock-icon">●</view>
          </view>
          <view class="lock-tip">账号ID不可修改</view>
        </view>

        <button class="save-btn" :disabled="isSaving || loadFailed" @click="save">{{ isSaving ? "保存中..." : "保存" }}</button>
      </view>
    </scroll-view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.edit-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.edit-content {
  padding: 24px 16px 32px;
}

.edit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52vh;
  padding: 40px 24px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 14px;
  font-size: 42px;
  color: var(--fg-muted);
}

.empty-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 800;
  color: var(--fg-primary);
}

.empty-sub {
  max-width: 260px;
  margin-bottom: 22px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-secondary);
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 132px;
  height: 42px;
  padding: 0 22px;
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  border: none;
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(255, 92, 122, 0.24);
}

.empty-btn::after {
  border: none;
}

.avatar-block {
  margin-bottom: 24px;
  text-align: center;
}

.avatar-wrap {
  position: relative;
  display: inline-block;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
  box-shadow: 0 4px 12px var(--accent-glow);
}

.avatar-img {
  display: block;
}

.avatar-cam {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  font-size: 12px;
  color: #fff;
  background: var(--accent);
  border: 2px solid var(--bg-base);
  border-radius: 50%;
}

.avatar-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--fg-muted);
}

.field {
  margin-bottom: 20px;
}

.field-label {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
}

.input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  font-size: 14px;
  color: var(--fg-primary);
  background: var(--bg-elevated);
  border: 1.5px solid var(--border);
  border-radius: 12px;
}

.textarea {
  height: auto;
  min-height: 72px;
  padding: 10px 14px;
  line-height: 1.6;
}

.counter {
  margin-top: 4px;
  font-size: 11px;
  color: var(--fg-muted);
  text-align: right;
}

.gender-row {
  display: flex;
  gap: 10px;
}

.gender-option {
  flex: 1;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
  text-align: center;
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  border-radius: 10px;
}

.gender-option.active {
  color: var(--accent-deep);
  background: var(--accent-soft);
  border-color: var(--accent);
}

.lock-field {
  margin-bottom: 28px;
}

.lock-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.lock-row .input {
  flex: 1;
}

.input.locked {
  opacity: 0.6;
}

.lock-icon,
.lock-tip {
  color: var(--fg-muted);
}

.lock-tip {
  margin-top: 4px;
  font-size: 11px;
}

.save-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 700;
  line-height: 48px;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 12px;
}

.save-btn[disabled] {
  opacity: 0.65;
}

.save-btn::after {
  border: none;
}
</style>
