<template>
  <view class="page-mine">
    <!-- 毛玻璃刘海层 -->
    <view class="glass-header" />
    <view class="status-bar">
      <text class="sb-time">9:41</text>
      <view class="sb-right"><text class="sb-icon">●●●●</text><text class="sb-icon">▲</text><text class="sb-battery">▮</text></view>
    </view>
    <view class="nav-header"><text class="nav-title">我的</text></view>
    <view class="capsule"><view class="cap-btn">⋯</view><view class="cap-divider" /><view class="cap-btn">✕</view></view>

    <!-- 未登录引导 -->
    <view v-if="!isLoggedIn" class="login-guide">
      <view class="login-guide-avatar">
        <text class="login-guide-icon">👤</text>
      </view>
      <text class="login-guide-title">未登录</text>
      <text class="login-guide-desc">登录后享受完整功能</text>
      <view class="login-guide-btn" @click="requireLogin()">微信一键登录</view>
    </view>

    <scroll-view v-else scroll-y class="mine-scroll" :style="{ height: scrollH + 'px' }">
      <!-- 用户信息卡 -->
      <view class="user-card">
        <view class="user-row">
          <view class="user-avatar">
            <text class="user-avatar-text">梦</text>
          </view>
          <view class="user-info">
            <text class="user-name">云端造梦师</text>
            <text class="user-id">ID: LUMI8829</text>
          </view>
          <view class="credits-area" @click="goPage('recharge')">
            <text class="credits-label">我的积分</text>
            <text class="credits-num">2860</text>
          </view>
        </view>
        <view class="shortcuts-grid">
          <view class="shortcut-item" @click="goPage('recharge')">
            <view class="shortcut-icon" style="background:linear-gradient(135deg,#a8d8f8,#b0e6d0)">💰</view>
            <text class="shortcut-text">充值</text>
          </view>
          <view class="shortcut-item" @click="goPage('checkin')">
            <view class="shortcut-icon" style="background:linear-gradient(135deg,#FFD4C8,#FFC8D6)">📅</view>
            <text class="shortcut-text">签到</text>
          </view>
          <view class="shortcut-item" @click="goPage('membership')">
            <view class="shortcut-icon" style="background:linear-gradient(135deg,#D4C8F0,#B8A8E0)">👑</view>
            <text class="shortcut-text">会员</text>
          </view>
          <view class="shortcut-item" @click="goPage('invite')">
            <view class="shortcut-icon" style="background:linear-gradient(135deg,#A3E4CC,#8BD8B8)">👤</view>
            <text class="shortcut-text">邀请</text>
          </view>
        </view>
      </view>

      <!-- 菜单卡片 1 -->
      <view class="menu-card">
        <view class="menu-row" @click="goPage('messages')">
          <text class="menu-icon" style="color:#FFA8B8">💬</text>
          <text class="menu-text">消息中心</text>
          <view class="menu-badge">5</view>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row" @click="goPage('settings')">
          <text class="menu-icon" style="color:#5B9FE8">⚙</text>
          <text class="menu-text">设置</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row" @click="goPage('history')">
          <text class="menu-icon" style="color:#6FD4B0">🕐</text>
          <text class="menu-text">浏览记录</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row" @click="goPage('drafts')">
          <text class="menu-icon" style="color:#FFE08A">📝</text>
          <text class="menu-text">草稿箱</text>
          <view class="menu-dot" />
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row" @click="goPage('following')">
          <text class="menu-icon" style="color:#FFB59A">❤</text>
          <text class="menu-text">我的关注</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 菜单卡片 2 -->
      <view class="menu-card" style="margin-bottom:20px;">
        <view class="menu-row" @click="goPage('feedback')">
          <text class="menu-icon" style="color:#5B9FE8">💡</text>
          <text class="menu-text">意见反馈</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row" @click="contactService">
          <text class="menu-icon" style="color:#5B9FE8">📞</text>
          <text class="menu-text">联系客服</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </scroll-view>
    <LoginPopup />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { userApi } from '@/utils/api';
import { isLoggedIn, requireLogin } from '@/utils/auth';
import LoginPopup from '@/components/LoginPopup.vue';

const scrollH = ref(700);
const userInfo = ref<any>({ nickname: '', credits: 0 });

const pageRoutes: Record<string, string> = {
  recharge: '/pages/recharge/index',
  settings: '/pages/settings/index',
  editProfile: '/pages/edit-profile/index',
  checkin: '/pages/checkin/index',
  invite: '/pages/invite/index',
  membership: '/pages/membership/index',
  messages: '/pages/messages/index',
  publish: '/pages/publish/index',
  history: '/pages/history/index',
  drafts: '/pages/drafts/index',
  following: '/pages/follow-list/index',
  feedback: '/pages/feedback/index',
};
const goPage = (name: string) => {
  if (pageRoutes[name]) uni.navigateTo({ url: pageRoutes[name] });
  else uni.showToast({ title: `${name}页开发中`, icon: 'none' });
};
const contactService = () => uni.showToast({ title: '打开微信客服', icon: 'none' });

onMounted(async () => {
  scrollH.value = uni.getSystemInfoSync().windowHeight - 80;
  try {
    const res = await userApi.getProfile();
    userInfo.value = (res as any).data || res;
  } catch {}
});
</script>

<style lang="scss" scoped>
// 未登录引导
.login-guide {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding-top: 160px; gap: 8px;
}
.login-guide-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  background: #E1EBF8; display: flex; align-items: center; justify-content: center;
  margin-bottom: 8px;
}
.login-guide-icon { font-size: 32px; }
.login-guide-title { font-size: 18px; font-weight: 700; color: #0E1F3A; }
.login-guide-desc { font-size: 14px; color: #8497B5; }
.login-guide-btn {
  margin-top: 16px; padding: 12px 40px;
  background: #07C160; color: #fff; font-size: 15px; font-weight: 600;
  border-radius: 14px; box-shadow: 0 4px 16px rgba(7,193,96,0.3);
  &:active { transform: scale(0.97); }
}

.page-mine {
  min-height: 100vh;
  background: #EEF4FC;
  position: relative;
}

// 毛玻璃
.glass-header {
  position: fixed; top: 0; left: 0; right: 0; height: 74px;
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  z-index: 90;
  border-bottom: 0.5px solid rgba(91, 159, 232, 0.14);
}
.status-bar {
  height: 24px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; position: fixed; top: 0; left: 0; right: 0; z-index: 120;
}
.sb-time { font-size: 13px; font-weight: 600; color: #0E1F3A; }
.sb-right { display: flex; align-items: center; gap: 5px; }
.sb-icon { font-size: 10px; color: #0E1F3A; }
.sb-battery { font-size: 12px; color: #0E1F3A; }
.nav-header {
  height: 50px; display: flex; align-items: center; justify-content: center;
  position: fixed; top: 24px; left: 0; right: 0; z-index: 120;
}
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.capsule {
  position: fixed; right: 7px; top: 28px; width: 87px; height: 32px;
  border-radius: 16px; background: rgba(0, 0, 0, 0.06);
  display: flex; align-items: center; justify-content: space-around;
  z-index: 200; border: 0.5px solid rgba(0, 0, 0, 0.08);
}
.cap-btn { width: 43.5px; height: 32px; display: flex; align-items: center; justify-content: center; color: #0E1F3A; font-size: 14px; }
.cap-divider { width: 0.5px; height: 16px; background: rgba(0, 0, 0, 0.15); }

// 滚动区
.mine-scroll { padding-top: 74px; }

// 用户卡片
.user-card {
  margin: 16px 16px 16px;
  padding: 18px 16px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgba(91, 159, 232, 0.14);
}
.user-row {
  display: flex; align-items: center; gap: 14px; margin-bottom: 16px;
}
.user-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #B8A5E3, #5B9FE8, #6FD4B0);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(91, 159, 232, 0.35);
  flex-shrink: 0;
}
.user-avatar-text { font-size: 22px; color: #fff; font-weight: 700; }
.user-info { flex: 1; }
.user-name { font-size: 17px; font-weight: 700; color: #0E1F3A; display: block; }
.user-id { font-size: 13px; color: #8497B5; margin-top: 3px; display: block; }
.credits-area { text-align: right; }
.credits-label { font-size: 14px; color: #8497B5; display: block; }
.credits-num { font-size: 22px; font-weight: 700; color: #5B9FE8; }

// 快捷入口
.shortcuts-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  padding-top: 14px; border-top: 0.5px solid rgba(91, 159, 232, 0.14);
}
.shortcut-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.shortcut-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.shortcut-text { font-size: 11px; color: #445876; }

// 菜单卡片
.menu-card {
  margin: 0 16px 16px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgba(91, 159, 232, 0.14);
  overflow: hidden;
}
.menu-row {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px;
  position: relative;
  &:active { background: rgba(91, 159, 232, 0.08); }
  & + .menu-row::before {
    content: '';
    position: absolute; top: 0; left: 16px; right: 16px;
    height: 0.5px; background: rgba(91, 159, 232, 0.14);
  }
}
.menu-icon { font-size: 22px; width: 22px; text-align: center; flex-shrink: 0; }
.menu-text { flex: 1; font-size: 15px; color: #0E1F3A; }
.menu-badge {
  min-width: 18px; height: 18px; padding: 0 5px;
  background: #FFA8B8; color: #fff; font-size: 10px; font-weight: 700;
  border-radius: 999px; display: flex; align-items: center; justify-content: center;
}
.menu-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #FFA8B8;
}
.menu-arrow { color: #8497B5; font-size: 18px; }
</style>
