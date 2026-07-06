<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
  buttonText?: string;
}>();

defineEmits<{
  (event: "login"): void;
}>();
</script>

<template>
  <view class="login-required">
    <view class="login-icon">◎</view>
    <view class="login-title">{{ title }}</view>
    <view class="login-subtitle">{{ subtitle }}</view>
    <button class="login-btn" @click="$emit('login')">{{ buttonText || "立即登录" }}</button>
  </view>
</template>

<style scoped>
.login-required {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52vh;
  padding: 40px 24px;
  text-align: center;
  color: var(--fg-primary);
}

.login-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  font-size: 28px;
  color: var(--accent);
  background: rgba(255, 92, 122, 0.12);
  border-radius: 18px;
}

.login-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 800;
}

.login-subtitle {
  max-width: 260px;
  margin-bottom: 22px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-secondary);
}

.login-btn {
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

.login-btn::after {
  border: none;
}
</style>
