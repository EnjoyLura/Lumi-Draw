<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { inviteCode as mockInviteCode, invitedUsers as mockInvitedUsers, type InvitedUser } from "../points/pointsData";
import { fetchInviteSummary } from "../points/pointsService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();

const inviteCode = ref("");
const invitedUsers = ref<InvitedUser[]>([]);
const rewardPerInvite = ref(0);
const totalReward = ref(0);
const isLoading = ref(false);
const showLoginSheet = ref(false);
const loginRequired = ref(false);

onShow(() => {
  void loadInvite();
});

async function loadInvite() {
  if (useMockData.value) {
    inviteCode.value = mockInviteCode;
    invitedUsers.value = mockInvitedUsers;
    rewardPerInvite.value = 50;
    totalReward.value = mockInvitedUsers.reduce((sum, item) => sum + item.reward, 0);
    loginRequired.value = false;
    return;
  }
  if (!isLoggedIn.value) {
    inviteCode.value = "";
    invitedUsers.value = [];
    rewardPerInvite.value = 0;
    totalReward.value = 0;
    loginRequired.value = true;
    return;
  }
  loginRequired.value = false;
  inviteCode.value = "";
  invitedUsers.value = [];
  rewardPerInvite.value = 0;
  totalReward.value = 0;

  isLoading.value = true;
  try {
    const summary = await fetchInviteSummary();
    inviteCode.value = summary.inviteCode;
    invitedUsers.value = summary.invitedUsers;
    rewardPerInvite.value = summary.rewardPerInvite;
    totalReward.value = summary.totalReward;
  } catch {
    uni.showToast({ title: "邀请数据加载失败", icon: "none" });
  } finally {
    isLoading.value = false;
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
    await loadInvite();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function copyInviteCode() {
  if (!ensureLogin()) return;
  uni.setClipboardData({ data: inviteCode.value });
}

function shareInvite() {
  if (!ensureLogin()) return;
  const path = `/pages/home/index?inviteCode=${encodeURIComponent(inviteCode.value)}`;
  const link = typeof window !== "undefined" && window.location?.origin ? `${window.location.origin}/#${path}` : path;
  uni.setClipboardData({
    data: `我在露米绘画AI创作图片，邀请码 ${inviteCode.value}，一起领积分：${link}`,
    success() {
      uni.showToast({ title: "邀请文案已复制", icon: "none" });
    },
    fail() {
      uni.showToast({ title: "分享失败，请稍后重试", icon: "none" });
    }
  });
}
</script>

<template>
  <view class="invite-page" :class="themeClass">
    <LumiPageHeader title="邀请好友" />
    <LumiDeferredPageContent>
    <scroll-view class="page-scroll" scroll-y>
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        title="登录后查看邀请"
        subtitle="登录后可以获取专属邀请码，并查看邀请奖励到账记录。"
        @login="showLoginSheet = true"
      />

      <view v-else class="page-content">
        <view class="hero-card">
          <view class="hero-icon"><LumiIcon name="gift" :size="40" /></view>
          <view class="hero-title">邀请好友，双方得积分</view>
          <view class="hero-desc">好友填写你的邀请码注册，你得 {{ rewardPerInvite }} 积分，好友也可获得新人奖励</view>
        </view>

        <view class="code-card">
          <view class="code-label">{{ isLoading ? "邀请码同步中" : "我的邀请码" }}</view>
          <view class="invite-code">{{ inviteCode }}</view>
          <view class="code-actions">
            <button class="btn secondary" @click="copyInviteCode">复制邀请码</button>
            <button class="btn gradient" @click="shareInvite">分享邀请</button>
          </view>
        </view>

        <view class="summary-row">
          <view class="summary-card">
            <view class="summary-num">{{ invitedUsers.length }}</view>
            <view class="summary-label">已邀请</view>
          </view>
          <view class="summary-card">
            <view class="summary-num">{{ totalReward }}</view>
            <view class="summary-label credits-label"><LumiIcon name="sparkles-filled" :size="13" /><text>累计</text></view>
          </view>
        </view>

        <view class="section-title">已邀请 {{ invitedUsers.length }} 人</view>
        <view class="invite-list">
          <view v-if="!invitedUsers.length" class="empty-row">暂无邀请记录</view>
          <view v-for="user in invitedUsers" :key="`${user.name}-${user.date}`" class="invite-row">
            <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
            <view class="invite-main">
              <view class="invite-name">{{ user.name }}</view>
              <view class="invite-date">{{ user.date || "已注册" }}</view>
            </view>
            <view class="reward-tag">+{{ user.reward }}</view>
          </view>
        </view>

        <view class="rules-card">
          <view class="rules-title">活动规则</view>
          <view class="rule-line">1. 好友首次注册时填写你的邀请码，双方获得积分奖励</view>
          <view class="rule-line">2. 邀请奖励积分实时到账</view>
          <view class="rule-line">3. 禁止刷邀请，违规将扣除积分并限制账号</view>
        </view>
      </view>
    </scroll-view>
    </LumiDeferredPageContent>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.invite-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.page-content {
  padding: 16px;
}

.hero-card,
.code-card,
.invite-list,
.summary-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.hero-card {
  padding: 24px;
  margin-bottom: 16px;
  text-align: center;
  background: var(--gradient-aurora);
}

.hero-icon {
  margin-bottom: 8px;
  font-size: 40px;
  color: var(--accent);
}

.hero-title {
  margin-bottom: 6px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.hero-desc {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
}

.code-card {
  padding: 20px;
  margin-bottom: 12px;
  text-align: center;
}

.code-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--fg-muted);
}

.invite-code {
  margin-bottom: 12px;
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 4px;
}

.code-actions,
.summary-row {
  display: flex;
  gap: 10px;
}

.btn {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 42px;
  font-size: 14px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
}

.btn::after {
  border: none;
}

.btn.secondary {
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
}

.btn.gradient {
  color: #fff;
  background: var(--gradient-dream);
}

.summary-row {
  margin-bottom: 16px;
}

.summary-card {
  flex: 1;
  padding: 14px 0;
  text-align: center;
}

.summary-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}

.summary-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
}

.section-title {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 700;
}

.invite-list {
  overflow: hidden;
}

.invite-row,
.empty-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 60px;
  padding: 0 14px;
  border-bottom: 0.5px solid var(--border);
}

.empty-row {
  justify-content: center;
  color: var(--fg-muted);
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.invite-main {
  flex: 1;
  min-width: 0;
}

.invite-name {
  font-size: 14px;
  font-weight: 600;
}

.invite-date {
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
}

.reward-tag {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--mint);
  background: rgba(111, 212, 176, 0.14);
  border-radius: 999px;
}

.rules-card {
  padding: 14px;
  margin-top: 16px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--fg-secondary);
  background: var(--accent-soft);
  border-radius: 12px;
}

.rules-title {
  margin-bottom: 6px;
  font-weight: 700;
  color: var(--accent-deep);
}

/* Lumi custom page header layout */
.invite-page {
  display: flex;
  flex-direction: column;
}

.credits-label {
  display: flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.invite-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
