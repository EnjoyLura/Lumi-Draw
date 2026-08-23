<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { ref } from "vue";
import { onShareAppMessage, onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { inviteCode as mockInviteCode, invitedUsers as mockInvitedUsers, type InvitedUser } from "../points/pointsData";
import { fetchInviteSummary } from "../points/pointsService";
import { useTheme } from "../../services/theme";
import { inviteRewardsEnabled } from "../../services/featureFlags";
import { clipboardFailureMessage, copyToClipboard } from "../../services/clipboard";

interface WechatShortLinkApi {
  canIUse?: (schema: string) => boolean;
  generateShortLink: (options: {
    pageUrl: string;
    pageTitle: string;
    success: (result: { shortLink: string }) => void;
    fail: (error: unknown) => void;
  }) => void;
}

declare const wx: WechatShortLinkApi;

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
  if (!inviteRewardsEnabled) {
    uni.reLaunch({ url: "/pages/home/index" });
    return;
  }
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

function invitePagePath() {
  return `/pages/home/index?inviteCode=${encodeURIComponent(inviteCode.value)}`;
}

function generateInviteShortLink() {
  return new Promise<string>((resolve, reject) => {
    if (typeof wx === "undefined" || !wx.generateShortLink || (wx.canIUse && !wx.canIUse("generateShortLink"))) {
      reject(new Error("当前微信版本暂不支持生成小程序链接"));
      return;
    }
    wx.generateShortLink({
      pageUrl: invitePagePath(),
      pageTitle: "露米绘画AI",
      success: ({ shortLink }) => shortLink ? resolve(shortLink) : reject(new Error("未获取到邀请链接")),
      fail: reject
    });
  });
}

async function copyInviteLink() {
  if (!ensureLogin()) return;
  if (!inviteCode.value) {
    uni.showToast({ title: "邀请链接正在准备，请稍后重试", icon: "none" });
    return;
  }
  uni.showLoading({ title: "生成链接中", mask: true });
  try {
    const link = await generateInviteShortLink();
    await copyToClipboard(link);
    uni.showToast({ title: "邀请链接已复制", icon: "none" });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("链接")
      ? error.message
      : clipboardFailureMessage(error);
    uni.showToast({ title: message, icon: "none" });
  } finally {
    uni.hideLoading();
  }
}

onShareAppMessage(() => ({
  title: "来露米绘画AI一起创作，注册可领取新人积分",
  path: invitePagePath()
}));
</script>

<template>
  <view class="invite-page" :class="themeClass">
    <LumiPageHeader title="邀请好友" />
    <scroll-view class="page-scroll" scroll-y>
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        title="登录后查看邀请"
        subtitle="登录后可以分享专属邀请链接，并查看邀请奖励到账记录。"
        @login="showLoginSheet = true"
      />

      <view v-else class="page-content">
        <view class="hero-card">
          <view class="hero-top">
            <view class="hero-icon"><LumiIcon name="gift" :size="22" /></view>
          </view>
          <view class="hero-title">与好友一起开启灵感</view>
          <view class="hero-desc">好友通过你的邀请链接注册，双方获得 10 积分</view>
        </view>

        <view class="share-actions">
          <button class="btn gradient" open-type="share" :disabled="isLoading || !inviteCode">
            <LumiIcon name="share-2" :size="18" /><text>分享给好友</text>
          </button>
          <button class="btn secondary" :disabled="isLoading || !inviteCode" @click="copyInviteLink">
            <LumiIcon name="copy" :size="18" /><text>复制链接</text>
          </button>
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

      </view>
    </scroll-view>
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
  flex: 1;
  min-height: 0;
  height: 0;
}

.page-content {
  padding: 16px 16px calc(16px + var(--lumi-safe-bottom, 0px));
}

.hero-card,
.invite-list,
.summary-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.hero-card {
  position: relative;
  padding: 18px;
  margin-bottom: 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at 5% 5%, rgba(111, 212, 176, 0.2), transparent 34%),
    radial-gradient(circle at 100% 10%, rgba(184, 168, 224, 0.18), transparent 34%),
    linear-gradient(145deg, rgba(247, 252, 255, 0.98), rgba(255, 255, 255, 0.94));
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(63, 99, 139, 0.07);
}

.hero-top {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.hero-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--accent);
  background: rgba(91, 159, 232, 0.12);
  border: 1px solid rgba(91, 159, 232, 0.12);
  border-radius: 14px;
}

.hero-title {
  margin-bottom: 7px;
  font-size: 21px;
  font-weight: 700;
  color: var(--fg-primary);
}

.hero-desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--fg-muted);
}

.invite-page.theme-dark .hero-card,
:root[data-theme="dark"] .hero-card {
  background:
    radial-gradient(circle at 5% 5%, rgba(111, 212, 176, 0.12), transparent 34%),
    radial-gradient(circle at 100% 10%, rgba(184, 168, 224, 0.12), transparent 34%),
    linear-gradient(145deg, rgba(38, 38, 42, 0.98), rgba(28, 28, 31, 0.96));
  border-color: var(--border);
  box-shadow: none;
}

.invite-page.theme-dark .hero-icon,
:root[data-theme="dark"] .hero-icon {
  background: rgba(91, 159, 232, 0.16);
  border-color: rgba(91, 159, 232, 0.18);
}

.share-actions,
.summary-row {
  display: flex;
  gap: 10px;
}

.share-actions {
  margin-bottom: 12px;
}

.btn {
  display: inline-flex;
  flex: 1;
  gap: 7px;
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

.btn[disabled] {
  opacity: 0.55;
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

</style>
