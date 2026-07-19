<script setup lang="ts">
import { ref, watch } from "vue";
import { useAuth } from "../services/auth";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  login: [];
}>();

const { isLoggingIn } = useAuth();
const agreed = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) agreed.value = false;
  }
);

function handleAgreementChange(event: { detail: { value: string[] } }) {
  agreed.value = event.detail.value.includes("accepted");
}

function openAgreement(type: "user" | "privacy") {
  uni.navigateTo({ url: `/pages/agreement/index?type=${type}` });
}

function submitLogin() {
  if (isLoggingIn.value) return;
  if (!agreed.value) {
    uni.showToast({ title: "请先阅读并同意用户协议和隐私政策", icon: "none" });
    return;
  }
  emit("login");
}
</script>

<template>
  <view v-if="open" class="login-overlay" @click="emit('close')" />
  <view class="login-sheet" :class="{ 'login-sheet-show': open }">
    <view class="sheet-handle" />
    <view class="login-logo"><LumiIcon name="pencil" :size="30" /></view>
    <view class="login-title">登录露米绘画</view>
    <view class="login-sub">登录后即可体验AI创作、收藏作品等功能</view>
    <button class="login-primary" :disabled="isLoggingIn" @click="submitLogin">
      <view v-if="isLoggingIn" class="login-spinner" />
      <LumiIcon v-else name="log-in" :size="18" />
      <text>{{ isLoggingIn ? "登录中..." : "微信一键登录" }}</text>
    </button>
    <checkbox-group class="login-agree" @change="handleAgreementChange">
      <label class="agree-label">
        <checkbox class="agree-checkbox" value="accepted" :checked="agreed" color="var(--accent)" />
        <text>我已阅读并同意</text>
      </label>
      <text class="agree-link" @click.stop="openAgreement('user')">用户协议</text>
      <text>和</text>
      <text class="agree-link" @click.stop="openAgreement('privacy')">隐私政策</text>
    </checkbox-group>
  </view>
</template>

<style>
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
  pointer-events: none;
  background: var(--bg-card);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 30px rgba(14, 31, 58, 0.12);
  transform: translateY(110%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-sheet-show {
  pointer-events: auto;
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

.login-primary {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
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

.login-agree {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 6px;
  font-size: 11px;
  color: var(--fg-muted);
}

.agree-label {
  display: inline-flex;
  align-items: center;
}

.agree-checkbox {
  margin-right: 2px;
  transform: scale(0.72);
}

.agree-link {
  color: var(--accent);
}

.login-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: login-spin 0.7s linear infinite;
}

@keyframes login-spin {
  to { transform: rotate(360deg); }
}
</style>
