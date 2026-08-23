<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, ref } from "vue";
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
const rewardedCount = computed(() => invitedUsers.value.filter((user) => user.reward > 0).length);

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
        <view class="rules-card">
          <view class="rules-title">邀请获积分规则</view>
          <view class="rule-list">
            <view class="rule-row">
              <view class="rule-icon"><LumiIcon name="gift" :size="23" /></view>
              <view class="rule-copy">每邀请 1 位好友注册，你得 <text>{{ rewardPerInvite }}</text> 积分</view>
            </view>
            <view class="rule-row">
              <view class="rule-icon"><LumiIcon name="user" :size="23" /></view>
              <view class="rule-copy">好友注册后也可领取新人积分</view>
            </view>
            <view class="rule-row">
              <view class="rule-icon"><LumiIcon name="info" :size="23" /></view>
              <view class="rule-copy">奖励实时到账 · 已奖励 {{ rewardedCount }} 人</view>
            </view>
          </view>
        </view>

        <view class="summary-card">
          <view class="summary-item">
            <view class="summary-num">{{ invitedUsers.length }}</view>
            <view class="summary-label">已邀请</view>
          </view>
          <view class="summary-divider" />
          <view class="summary-item">
            <view class="summary-num">{{ rewardedCount }}</view>
            <view class="summary-label">已发奖</view>
          </view>
          <view class="summary-divider" />
          <view class="summary-item">
            <view class="summary-num">{{ totalReward }}</view>
            <view class="summary-label">累计积分</view>
          </view>
        </view>

        <view class="share-actions">
          <button class="btn" open-type="share" :disabled="isLoading || !inviteCode">
            <LumiIcon name="share-2" :size="21" /><text>分享给好友</text>
          </button>
          <button class="btn" :disabled="isLoading || !inviteCode" @click="copyInviteLink">
            <LumiIcon name="copy" :size="21" /><text>复制链接</text>
          </button>
        </view>

        <view class="section-title">邀请记录</view>
        <view v-if="!invitedUsers.length" class="empty-state">
          <view class="empty-icon"><LumiIcon name="users" :size="28" /></view>
          <view class="empty-title">还没有邀请记录</view>
          <view class="empty-desc">把邀请链接分享给好友，TA 注册后会出现在这里。</view>
        </view>
        <view v-else class="invite-list">
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
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background:
    radial-gradient(circle at 0 0, rgba(255, 197, 214, 0.18), transparent 34%),
    radial-gradient(circle at 100% 0, rgba(184, 168, 224, 0.2), transparent 38%),
    var(--page-bg);
}

.page-scroll {
  flex: 1;
  min-height: 0;
  height: 0;
}

.page-content {
  padding: 18px 16px calc(28px + var(--lumi-safe-bottom, 0px));
}

.rules-card,
.invite-list,
.summary-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  box-shadow: 0 14px 38px rgba(84, 91, 128, 0.08);
}

.rules-card {
  padding: 20px 18px;
  margin-bottom: 14px;
}

.rules-title {
  margin-bottom: 18px;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.rule-row {
  display: flex;
  gap: 13px;
  align-items: center;
}

.rule-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--fg-secondary);
  background: rgba(91, 159, 232, 0.06);
  border-radius: 13px;
}

.rule-copy {
  min-width: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--fg-secondary);
}

.rule-copy text {
  font-weight: 700;
  color: var(--fg-primary);
}

.summary-card {
  display: flex;
  align-items: center;
  padding: 18px 8px;
  margin-bottom: 14px;
}

.summary-item {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.summary-divider {
  width: 1px;
  height: 46px;
  background: var(--border);
}

.summary-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: var(--fg-primary);
}

.summary-label {
  margin-top: 9px;
  font-size: 12px;
  color: var(--fg-muted);
}

.share-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  display: inline-flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  justify-content: center;
  height: 54px;
  padding: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 54px;
  color: var(--fg-primary);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--card-border);
  border-radius: 27px;
  box-shadow: 0 12px 30px rgba(84, 91, 128, 0.08);
}

.btn::after {
  border: none;
}

.btn[disabled] {
  opacity: 0.55;
}

.btn:active {
  transform: scale(0.98);
}

.section-title {
  margin: 0 0 14px 2px;
  font-size: 20px;
  font-weight: 700;
}

.invite-list {
  overflow: hidden;
}

.invite-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 68px;
  padding: 0 16px;
  border-bottom: 0.5px solid var(--border);
}

.invite-row:last-child {
  border-bottom: none;
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
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
  color: var(--mint);
  background: rgba(111, 212, 176, 0.14);
  border-radius: 999px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 28px 18px 54px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  margin-bottom: 14px;
  color: var(--fg-muted);
  background: rgba(91, 159, 232, 0.06);
  border-radius: 20px;
}

.empty-title {
  font-size: 17px;
  font-weight: 700;
}

.empty-desc {
  max-width: 290px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--fg-muted);
}

.invite-page.theme-dark .rules-card,
.invite-page.theme-dark .summary-card,
.invite-page.theme-dark .invite-list,
.invite-page.theme-dark .btn,
:root[data-theme="dark"] .rules-card,
:root[data-theme="dark"] .summary-card,
:root[data-theme="dark"] .invite-list,
:root[data-theme="dark"] .btn {
  background: rgba(34, 34, 38, 0.92);
  border-color: var(--border);
  box-shadow: none;
}

.invite-page.theme-dark .rule-icon,
.invite-page.theme-dark .empty-icon,
:root[data-theme="dark"] .rule-icon,
:root[data-theme="dark"] .empty-icon {
  background: rgba(255, 255, 255, 0.06);
}

</style>
