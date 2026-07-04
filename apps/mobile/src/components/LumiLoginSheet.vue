<script setup lang="ts">
defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  login: [];
}>();
</script>

<template>
  <view v-if="open" class="login-overlay" @click="emit('close')" />
  <view class="login-sheet" :class="{ show: open }">
    <view class="sheet-handle" />
    <view class="login-logo">✎</view>
    <view class="login-title">登录露米绘画</view>
    <view class="login-sub">登录后即可体验AI创作、收藏作品等功能</view>
    <button class="login-primary" @click="emit('login')">▣ 手机号一键登录</button>
    <button class="login-wechat" @click="emit('login')">微信登录</button>
    <view class="login-agree">
      登录即代表同意 <text>用户协议</text> 和 <text>隐私政策</text>
    </view>
  </view>
</template>

<style scoped>
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

.login-sheet.show {
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
  border: 1px solid var(--card-border);
}

.login-agree {
  margin-top: 6px;
  font-size: 11px;
  color: var(--fg-muted);
}

.login-agree text {
  color: var(--accent);
}
</style>
