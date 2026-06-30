<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">邀请好友</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="invite-header">
        <text class="invite-icon">🎁</text>
        <text class="invite-title">邀请好友，双方得积分</text>
        <text class="invite-desc">好友填你的邀请码注册，你+50积分，好友+30积分</text>
      </view>
      <view class="code-card">
        <text class="code-label">我的邀请码</text>
        <text class="code-value">{{ inviteCode }}</text>
        <view class="code-actions">
          <view class="code-btn secondary" @click="copyCode">复制邀请码</view>
          <view class="code-btn gradient" @click="shareInvite">分享邀请</view>
        </view>
      </view>
      <view class="section-title">已邀请 3 人</view>
      <view class="invite-list">
        <view v-for="u in invited" :key="u.name" class="invite-row">
          <view class="invite-avatar" :style="{ background: u.color }"><text class="invite-avatar-text">{{ u.avatar }}</text></view>
          <view class="invite-info"><text class="invite-name">{{ u.name }}</text><text class="invite-time">{{ u.time }} 注册</text></view>
          <text class="invite-reward">+50</text>
        </view>
      </view>
      <view class="rules-box">
        <text class="rules-title">活动规则</text>
        <text class="rules-text">1. 好友首次注册时填写你的邀请码，双方各获得积分奖励&#10;2. 每人最多可邀请50位好友&#10;3. 邀请奖励积分实时到账&#10;4. 禁止刷邀请，违规者将扣除积分并封号</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { inviteApi, getUserDisplay } from '@/utils/api';

const scrollH = ref(700);
const inviteCode = ref('');
const invited = ref<any[]>([]);

const copyCode = () => {
  uni.setClipboardData({ data: inviteCode.value });
  uni.showToast({ title: '已复制到剪贴板', icon: 'none' });
};
const shareInvite = () => uni.showToast({ title: '分享给微信好友', icon: 'none' });
const goBack = () => uni.navigateBack();

onMounted(async () => {
  scrollH.value = uni.getSystemInfoSync().windowHeight - 80;
  try {
    const res = await inviteApi.getInfo();
    const info = res.data || res;
    inviteCode.value = info.invite_code || '';
    invited.value = (info.records || []).map((r: any) => {
      const display = getUserDisplay(r.user_id);
      return {
        name: r.nickname || '',
        avatar: display.avatar,
        color: display.color,
        time: r.created_at ? r.created_at.substring(5, 10) : '',
      };
    });
  } catch {}
});
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.page-scroll { padding-top: 90px; padding-left: 16px; padding-right: 16px; }

.invite-header { padding: 24px; text-align: center; background: linear-gradient(135deg, #B8A5E3 0%, #5B9FE8 50%, #6FD4B0 100%); border-radius: 20px; margin-bottom: 16px; }
.invite-icon { font-size: 40px; display: block; margin-bottom: 8px; }
.invite-title { font-size: 20px; font-weight: 700; color: #fff; display: block; margin-bottom: 6px; }
.invite-desc { font-size: 13px; color: rgba(255,255,255,0.85); }

.code-card { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); padding: 20px; text-align: center; margin-bottom: 16px; }
.code-label { font-size: 13px; color: #8497B5; display: block; margin-bottom: 8px; }
.code-value { font-size: 32px; font-weight: 700; color: #5B9FE8; letter-spacing: 4px; display: block; margin-bottom: 12px; }
.code-actions { display: flex; gap: 10px; }
.code-btn { flex: 1; padding: 10px 0; text-align: center; border-radius: 12px; font-size: 14px; font-weight: 600; &.secondary { border: 1px solid rgba(91,159,232,0.32); color: #0E1F3A; } &.gradient { background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; } }

.section-title { font-size: 16px; font-weight: 700; color: #0E1F3A; margin-bottom: 10px; }
.invite-list { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); overflow: hidden; margin-bottom: 16px; }
.invite-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; position: relative; & + .invite-row::before { content: ''; position: absolute; top: 0; left: 16px; right: 16px; height: 0.5px; background: rgba(91,159,232,0.14); } }
.invite-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.invite-avatar-text { font-size: 14px; color: #fff; font-weight: 700; }
.invite-info { flex: 1; }
.invite-name { font-size: 15px; color: #0E1F3A; display: block; }
.invite-time { font-size: 11px; color: #8497B5; }
.invite-reward { font-size: 11px; font-weight: 600; padding: 2px 8px; background: rgba(111,212,176,0.16); color: #6FD4B0; border-radius: 999px; }

.rules-box { padding: 14px; background: rgba(91,159,232,0.12); border-radius: 12px; margin-bottom: 20px; }
.rules-title { font-size: 13px; font-weight: 600; color: #3B7FC8; display: block; margin-bottom: 6px; }
.rules-text { font-size: 12px; color: #445876; line-height: 1.8; }
</style>
