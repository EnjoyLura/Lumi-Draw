<script setup lang="ts">
import { inviteCode, invitedUsers } from "../points/pointsData";

function copyInviteCode() {
  uni.setClipboardData({ data: inviteCode });
}

function shareInvite() {
  uni.showToast({ title: "分享给微信好友", icon: "none" });
}
</script>

<template>
  <view class="invite-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="hero-card">
          <view class="hero-icon">□</view>
          <view class="hero-title">邀请好友，双方得积分</view>
          <view class="hero-desc">好友填你的邀请码注册，你+50积分，好友+30积分</view>
        </view>

        <view class="code-card">
          <view class="code-label">我的邀请码</view>
          <view class="invite-code">{{ inviteCode }}</view>
          <view class="code-actions">
            <button class="btn secondary" @click="copyInviteCode">复制邀请码</button>
            <button class="btn gradient" @click="shareInvite">分享邀请</button>
          </view>
        </view>

        <view class="section-title">已邀请 {{ invitedUsers.length }} 人</view>
        <view class="invite-list">
          <view v-for="user in invitedUsers" :key="user.name" class="invite-row">
            <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
            <view class="invite-main">
              <view class="invite-name">{{ user.name }}</view>
              <view class="invite-date">{{ user.date }} 注册</view>
            </view>
            <view class="reward-tag">+{{ user.reward }}</view>
          </view>
        </view>

        <view class="rules-card">
          <view class="rules-title">活动规则</view>
          <view class="rule-line">1. 好友首次注册时填写你的邀请码，双方各获得积分奖励</view>
          <view class="rule-line">2. 每人最多可邀请50位好友</view>
          <view class="rule-line">3. 邀请奖励积分实时到账</view>
          <view class="rule-line">4. 禁止刷邀请，违规者将扣除积分并封号</view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.invite-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
}

.page-content {
  padding: 16px;
}

.hero-card,
.code-card,
.invite-list {
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
  line-height: 1;
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
  margin-bottom: 16px;
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

.code-actions {
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

.section-title {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 700;
}

.invite-list {
  overflow: hidden;
}

.invite-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 60px;
  padding: 0 14px;
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
</style>
