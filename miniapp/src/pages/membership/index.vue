<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">会员中心</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="vip-card">
        <view class="vip-circle1" /><view class="vip-circle2" />
        <view class="vip-header">
          <view class="vip-icon">👑</view>
          <view class="vip-info"><text class="vip-name">Lumi 会员</text><text class="vip-desc">每天自动领取积分，畅享AI创作</text></view>
        </view>
        <view class="vip-stats">
          <view class="vip-stat"><text class="vip-stat-num" style="color:#FFD700">50</text><text class="vip-stat-label">每日积分</text></view>
          <view class="vip-stat"><text class="vip-stat-num" style="color:#B8A5E3">×2</text><text class="vip-stat-label">签到加成</text></view>
          <view class="vip-stat"><text class="vip-stat-num" style="color:#6FD4B0">优先</text><text class="vip-stat-label">生成队列</text></view>
        </view>
      </view>

      <text class="section-label">选择套餐</text>
      <view class="plans-list">
        <view v-for="(p, i) in plans" :key="i" :class="['plan-card', { selected: selectedPlan === i, recommended: p.recommended }]" @click="selectedPlan = i">
          <view v-if="p.recommended" class="plan-badge">推荐</view>
          <view class="plan-left">
            <view class="plan-icon" :style="{ background: p.iconBg }"><text style="font-size:20px;color:#fff;">{{ p.icon }}</text></view>
            <view class="plan-info">
              <view class="plan-name-row"><text class="plan-name">{{ p.name }}</text><text v-if="p.save" class="plan-save">省{{ p.save }}</text></view>
              <text class="plan-desc">{{ p.desc }}</text>
            </view>
          </view>
          <view class="plan-right"><text class="plan-price">¥{{ p.price }}</text><text class="plan-daily">{{ p.daily }}</text></view>
        </view>
      </view>

      <view class="open-btn" @click="openMember">👑 立即开通 · ¥{{ plans[selectedPlan].price }}</view>

      <text class="section-label">会员权益</text>
      <view class="benefits-grid">
        <view v-for="b in benefits" :key="b.name" class="benefit-card">
          <view class="benefit-icon" :style="{ background: b.iconBg }"><text style="font-size:16px;">{{ b.icon }}</text></view>
          <view class="benefit-info"><text class="benefit-name">{{ b.name }}</text><text class="benefit-desc">{{ b.desc }}</text></view>
        </view>
      </view>
      <text class="agreement">开通即表示同意 <text class="agreement-link">《会员服务协议》</text></text>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const selectedPlan = ref(1);
const plans = [
  { name: '月卡', price: 18, daily: '¥0.6/天', desc: '每日领取50积分 · 共1500积分', icon: '📅', iconBg: 'linear-gradient(135deg,rgba(91,159,232,0.12),rgba(91,159,232,0.04))', recommended: false, save: '' },
  { name: '季卡', price: 48, daily: '¥0.53/天', desc: '每日领取50积分 · 共4500积分', icon: '📅', iconBg: 'linear-gradient(135deg,rgba(184,165,227,0.15),rgba(184,165,227,0.05))', recommended: true, save: '省¥6' },
  { name: '年卡', price: 168, daily: '¥0.46/天', desc: '每日领取50积分 · 共18000积分', icon: '👑', iconBg: 'linear-gradient(135deg,rgba(255,210,76,0.15),rgba(255,210,76,0.05))', recommended: false, save: '省¥48' },
];
const benefits = [
  { name: '每日积分', desc: '每天领取50积分', icon: '🪙', iconBg: 'rgba(111,212,176,0.15)' },
  { name: '签到加成', desc: '签到积分翻倍', icon: '⭐', iconBg: 'rgba(91,159,232,0.15)' },
  { name: '专属徽章', desc: 'VIP身份标识', icon: '👑', iconBg: 'rgba(184,165,227,0.15)' },
  { name: '优先生成', desc: '高峰期免排队', icon: '⚡', iconBg: 'rgba(255,181,154,0.15)' },
];
const openMember = () => uni.showToast({ title: `开通${plans[selectedPlan.value].name}成功！`, icon: 'none' });
const goBack = () => uni.navigateBack();
onMounted(() => { scrollH.value = uni.getSystemInfoSync().windowHeight - 80; });
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.page-scroll { padding-top: 90px; padding-left: 16px; padding-right: 16px; }

.vip-card { padding: 28px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%); border-radius: 20px; margin-bottom: 16px; position: relative; overflow: hidden; }
.vip-circle1 { position: absolute; top: -30px; right: -30px; width: 120px; height: 120px; border-radius: 50%; background: rgba(184,165,227,0.12); }
.vip-circle2 { position: absolute; bottom: -20px; left: -20px; width: 80px; height: 80px; border-radius: 50%; background: rgba(91,159,232,0.1); }
.vip-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.vip-icon { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #B8A5E3, #FFD700); display: flex; align-items: center; justify-content: center; font-size: 22px; }
.vip-name { font-size: 20px; font-weight: 700; color: #fff; display: block; }
.vip-desc { font-size: 12px; color: rgba(255,255,255,0.6); }
.vip-stats { display: flex; gap: 16px; }
.vip-stat { flex: 1; text-align: center; padding: 10px 0; background: rgba(255,255,255,0.06); border-radius: 10px; }
.vip-stat-num { font-size: 20px; font-weight: 700; display: block; }
.vip-stat-label { font-size: 10px; color: rgba(255,255,255,0.5); }

.section-label { font-size: 16px; font-weight: 700; color: #0E1F3A; margin-bottom: 10px; display: block; }
.plans-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.plan-card { background: #fff; border-radius: 20px; border: 2px solid rgba(91,159,232,0.14); padding: 16px; display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; &.selected { border-color: #5B9FE8; background: linear-gradient(180deg, rgba(91,159,232,0.06) 0%, transparent 100%); } }
.plan-badge { position: absolute; top: 0; right: 0; background: #5B9FE8; color: #fff; font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 0 0 0 10px; }
.plan-left { display: flex; align-items: center; gap: 12px; }
.plan-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.plan-name { font-size: 15px; font-weight: 700; color: #0E1F3A; }
.plan-save { font-size: 9px; padding: 1px 6px; background: rgba(111,212,176,0.16); color: #6FD4B0; border-radius: 999px; margin-left: 6px; }
.plan-desc { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; }
.plan-right { text-align: right; }
.plan-price { font-size: 20px; font-weight: 700; color: #0E1F3A; display: block; }
.plan-daily { font-size: 10px; color: #8497B5; }

.open-btn { width: 100%; padding: 14px 0; text-align: center; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; font-size: 16px; font-weight: 700; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(91,159,232,0.35); &:active { transform: scale(0.97); } }

.benefits-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
.benefit-card { background: #fff; border-radius: 16px; border: 1px solid rgba(91,159,232,0.14); padding: 14px; display: flex; align-items: flex-start; gap: 10px; }
.benefit-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.benefit-name { font-size: 13px; font-weight: 700; color: #0E1F3A; display: block; }
.benefit-desc { font-size: 11px; color: #8497B5; margin-top: 2px; }
.agreement { text-align: center; font-size: 11px; color: #8497B5; padding: 8px 0 20px; display: block; }
.agreement-link { color: #5B9FE8; }
</style>
