<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">设置</text>
      <view style="width:40px;" />
    </view>
    <view class="settings-body">
      <text class="group-title">账号</text>
      <view class="menu-card">
        <view class="menu-row" @click="goEditProfile">
          <text class="menu-icon" style="color:#5B9FE8">👤</text>
          <text class="menu-text">编辑个人资料</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row">
          <text class="menu-icon" style="color:#6FD4B0">📱</text>
          <text class="menu-text">手机号 138****8888</text>
          <text class="bind-tag">已绑定</text>
        </view>
      </view>

      <text class="group-title">外观</text>
      <view class="menu-card">
        <view class="menu-row">
          <text class="menu-icon" style="color:#5B9FE8">☀</text>
          <text class="menu-text">深色模式</text>
          <view :class="['toggle-switch', { on: darkMode }]" @click="darkMode = !darkMode" />
        </view>
      </view>

      <text class="group-title">关于</text>
      <view class="menu-card">
        <view class="menu-row"><text class="menu-icon">📄</text><text class="menu-text">用户协议</text><text class="menu-arrow">›</text></view>
        <view class="menu-row"><text class="menu-icon">🛡</text><text class="menu-text">隐私政策</text><text class="menu-arrow">›</text></view>
        <view class="menu-row"><text class="menu-icon">💳</text><text class="menu-text">充值协议</text><text class="menu-arrow">›</text></view>
        <view class="menu-row" @click="clearCache">
          <text class="menu-icon">🗑</text><text class="menu-text">清除缓存</text>
          <text class="menu-value">12.5MB</text><text class="menu-arrow">›</text>
        </view>
        <view class="menu-row" @click="goChangelog">
          <text class="menu-icon">ℹ</text><text class="menu-text">当前版本</text>
          <text class="menu-value">v1.0.0</text><text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="logout-btn" @click="logout">🚪 退出登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const darkMode = ref(false);
const goBack = () => uni.navigateBack();
const goEditProfile = () => uni.navigateTo({ url: '/pages/edit-profile/index' });
const goChangelog = () => uni.navigateTo({ url: '/pages/changelog/index' });
const clearCache = () => uni.showToast({ title: '缓存已清除', icon: 'none' });
const logout = () => uni.showToast({ title: '已退出登录', icon: 'none' });
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.settings-body { padding: 90px 16px 16px; }
.group-title { font-size: 16px; font-weight: 700; color: #0E1F3A; margin-bottom: 10px; display: block; }
.menu-card { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); overflow: hidden; margin-bottom: 16px; }
.menu-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; position: relative; &:active { background: rgba(91,159,232,0.08); } & + .menu-row::before { content: ''; position: absolute; top: 0; left: 16px; right: 16px; height: 0.5px; background: rgba(91,159,232,0.14); } }
.menu-icon { font-size: 22px; width: 22px; text-align: center; flex-shrink: 0; }
.menu-text { flex: 1; font-size: 15px; color: #0E1F3A; }
.menu-arrow { color: #8497B5; font-size: 18px; }
.menu-value { font-size: 12px; color: #8497B5; margin-right: 6px; }
.bind-tag { padding: 2px 8px; background: rgba(111,212,176,0.16); color: #6FD4B0; font-size: 11px; font-weight: 600; border-radius: 999px; }
.toggle-switch { width: 44px; height: 26px; border-radius: 999px; background: #E1EBF8; border: 1px solid rgba(91,159,232,0.14); position: relative; flex-shrink: 0; transition: all 0.3s; }
.toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: all 0.3s; }
.toggle-switch.on { background: #5B9FE8; border-color: #5B9FE8; }
.toggle-switch.on::after { left: 22px; }
.logout-btn { width: 100%; padding: 14px 0; text-align: center; background: #FBFDFF; color: #FFA8B8; font-size: 15px; font-weight: 500; border-radius: 14px; border: 1px solid rgba(91,159,232,0.14); margin-top: 8px; &:active { transform: scale(0.97); } }
</style>
