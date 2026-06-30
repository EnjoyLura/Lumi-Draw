<template>
  <view v-if="visible" class="login-overlay" @click="close">
    <view class="login-sheet" @click.stop>
      <view class="login-handle" />
      <!-- Logo + 欢迎语 -->
      <view class="login-header">
        <view class="login-logo">
          <text class="login-logo-text">L</text>
        </view>
        <text class="login-title">欢迎来到绘光</text>
        <text class="login-subtitle">AI驱动的创意绘画平台</text>
      </view>

      <!-- 微信登录按钮 -->
      <view class="login-btn" @click="wxLogin">
        <text class="login-btn-icon">💬</text>
        <text class="login-btn-text">微信一键登录</text>
      </view>

      <!-- 协议 -->
      <view class="login-agreement">
        <text class="login-agree-text">登录即表示同意</text>
        <text class="login-agree-link">《用户协议》</text>
        <text class="login-agree-text">和</text>
        <text class="login-agree-link">《隐私政策》</text>
      </view>

      <!-- 关闭 -->
      <view class="login-close" @click="close">
        <text class="login-close-icon">✕</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { onLoginSuccess } from '@/utils/auth';
import { post } from '@/utils/request';

const visible = ref(false);

const show = () => { visible.value = true; };
const close = () => { visible.value = false; };

const wxLogin = async () => {
  // #ifdef MP-WEIXIN
  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      try {
        const res = await post('/auth/wx-login', { code: loginRes.code });
        if (res.data?.token) {
          onLoginSuccess(res.data.token);
          visible.value = false;
          uni.showToast({ title: '登录成功', icon: 'success' });
        }
      } catch (e) {
        uni.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    },
    fail: () => {
      uni.showToast({ title: '微信授权失败', icon: 'none' });
    },
  });
  // #endif

  // #ifdef H5
  // H5 模式模拟登录
  onLoginSuccess('mock_token_' + Date.now());
  visible.value = false;
  uni.showToast({ title: '登录成功', icon: 'success' });
  // #endif
};

onMounted(() => {
  uni.$on('showLoginPopup', show);
});
onUnmounted(() => {
  uni.$off('showLoginPopup', show);
});
</script>

<style scoped>
.login-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end; justify-content: center;
}
.login-sheet {
  width: 100%; background: #fff; border-radius: 24px 24px 0 0;
  padding: 8px 24px 40px; position: relative;
  animation: sheetUp 0.4s cubic-bezier(0.16,1,0.3,1);
}
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.login-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(91,159,232,0.3); margin: 0 auto 16px; }
.login-header { text-align: center; margin-bottom: 28px; }
.login-logo {
  width: 56px; height: 56px; border-radius: 16px;
  background: linear-gradient(135deg, #5B9FE8, #6FD4B0);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  box-shadow: 0 8px 24px rgba(91,159,232,0.25);
}
.login-logo-text { font-size: 24px; font-weight: 800; color: #fff; }
.login-title { font-size: 20px; font-weight: 700; color: #0E1F3A; display: block; margin-bottom: 6px; }
.login-subtitle { font-size: 14px; color: #8497B5; }
.login-btn {
  width: 100%; padding: 14px 0;
  background: #07C160; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(7,193,96,0.3);
}
.login-btn:active { transform: scale(0.97); }
.login-btn-icon { font-size: 20px; }
.login-btn-text { font-size: 16px; font-weight: 700; color: #fff; }
.login-agreement { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 2px; }
.login-agree-text { font-size: 11px; color: #8497B5; }
.login-agree-link { font-size: 11px; color: #5B9FE8; }
.login-close {
  position: absolute; top: 16px; right: 16px;
  width: 28px; height: 28px; border-radius: 50%;
  background: #E1EBF8; display: flex; align-items: center; justify-content: center;
}
.login-close-icon { font-size: 14px; color: #8497B5; }
</style>
