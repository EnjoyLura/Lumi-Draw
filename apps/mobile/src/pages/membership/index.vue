<script setup lang="ts">
import { computed, ref } from "vue";
import { memberBenefits, memberPlans } from "../points/pointsData";

const selectedPlanIdx = ref(1);
const selectedPlan = computed(() => memberPlans[selectedPlanIdx.value]);

function selectPlan(index: number) {
  selectedPlanIdx.value = index;
}

function openMember() {
  uni.showToast({ title: `开通${selectedPlan.value.name}会员成功！`, icon: "none" });
}

function showAgreement() {
  uni.showToast({ title: "查看服务协议", icon: "none" });
}
</script>

<template>
  <view class="membership-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="member-card">
          <view class="member-head">
            <view class="crown">♛</view>
            <view>
              <view class="member-title">Lumi 会员</view>
              <view class="member-sub">每天自动领取积分，畅享AI创作</view>
            </view>
          </view>
          <view class="member-stats">
            <view class="stat-item">
              <view class="stat-value gold">50</view>
              <view class="stat-label">每日积分</view>
            </view>
            <view class="stat-item">
              <view class="stat-value lavender">×2</view>
              <view class="stat-label">签到加成</view>
            </view>
            <view class="stat-item">
              <view class="stat-value mint">优先</view>
              <view class="stat-label">生成队列</view>
            </view>
          </view>
        </view>

        <view class="section-title">选择套餐</view>
        <view class="plan-list">
          <view
            v-for="(plan, index) in memberPlans"
            :key="plan.name"
            class="plan-card"
            :class="{ selected: selectedPlanIdx === index }"
            @click="selectPlan(index)"
          >
            <view v-if="plan.recommended" class="recommend">推荐</view>
            <view class="plan-left">
              <view class="plan-icon" :class="plan.accent">{{ plan.icon }}</view>
              <view class="plan-info">
                <view class="plan-title-row">
                  <text class="plan-name">{{ plan.name }}</text>
                  <text v-if="plan.badge" class="save-tag">{{ plan.badge }}</text>
                </view>
                <view class="plan-desc">每日领取50积分 · 共{{ plan.totalCredits }}积分</view>
              </view>
            </view>
            <view class="plan-price">
              <view class="price">¥{{ plan.price }}</view>
              <view class="unit">{{ plan.unitPrice }}</view>
            </view>
          </view>
        </view>

        <button class="open-btn" @click="openMember">
          <text class="open-icon">♛</text>
          <text>立即开通 · ¥{{ selectedPlan.price }}</text>
        </button>

        <view class="section-title">会员权益</view>
        <view class="benefit-grid">
          <view v-for="benefit in memberBenefits" :key="benefit.title" class="benefit-card">
            <view class="benefit-icon" :class="benefit.tone">{{ benefit.icon }}</view>
            <view>
              <view class="benefit-title">{{ benefit.title }}</view>
              <view class="benefit-desc">{{ benefit.desc }}</view>
            </view>
          </view>
        </view>

        <view class="agreement">
          开通即表示同意 <text @click="showAgreement">《会员服务协议》</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.membership-page {
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

.member-card,
.plan-card,
.benefit-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.member-card {
  position: relative;
  padding: 28px 20px;
  margin-bottom: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
}

.member-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.crown {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 22px;
  color: #1a1a2e;
  background: linear-gradient(135deg, #b8a5e3, #ffd700);
  border-radius: 50%;
}

.member-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.member-sub {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.member-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-value.gold {
  color: #ffd700;
}

.stat-value.lavender {
  color: var(--lavender);
}

.stat-value.mint {
  color: var(--mint);
}

.stat-label {
  margin-top: 2px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.section-title {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 700;
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.plan-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 74px;
  padding: 16px;
  overflow: hidden;
  box-sizing: border-box;
  border: 2px solid var(--border);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.plan-card:active {
  transform: scale(0.98);
}

.plan-card.selected {
  background: linear-gradient(180deg, rgba(91, 159, 232, 0.06) 0%, transparent 100%);
  border-color: var(--accent);
}

.recommend {
  position: absolute;
  top: 0;
  right: 0;
  padding: 3px 10px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
  border-radius: 0 0 0 10px;
}

.plan-left {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.plan-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  border-radius: 12px;
}

.plan-icon.accent {
  color: var(--accent);
  background: rgba(91, 159, 232, 0.12);
}

.plan-icon.lavender {
  color: var(--lavender);
  background: rgba(184, 165, 227, 0.15);
}

.plan-icon.gold {
  color: #e8a830;
  background: rgba(255, 210, 76, 0.15);
}

.plan-info {
  flex: 1;
  min-width: 0;
}

.plan-title-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.plan-name {
  font-size: 15px;
  font-weight: 700;
}

.save-tag {
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 700;
  color: var(--mint);
  background: rgba(111, 212, 176, 0.14);
  border-radius: 999px;
}

.plan-desc {
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-price {
  flex: 0 0 auto;
  text-align: right;
}

.price {
  font-size: 20px;
  font-weight: 700;
}

.unit {
  font-size: 10px;
  color: var(--fg-muted);
}

.open-btn {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.open-btn::after {
  border: none;
}

.open-icon {
  font-size: 18px;
}

.benefit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.benefit-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-height: 70px;
  padding: 14px;
  box-sizing: border-box;
}

.benefit-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  border-radius: 10px;
}

.benefit-icon.mint {
  color: var(--mint);
  background: rgba(111, 212, 176, 0.15);
}

.benefit-icon.accent {
  color: var(--accent);
  background: rgba(91, 159, 232, 0.15);
}

.benefit-icon.lavender {
  color: var(--lavender);
  background: rgba(184, 165, 227, 0.15);
}

.benefit-icon.peach {
  color: var(--peach);
  background: rgba(255, 181, 154, 0.15);
}

.benefit-title {
  font-size: 13px;
  font-weight: 700;
}

.benefit-desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
}

.agreement {
  padding: 8px 0;
  font-size: 11px;
  color: var(--fg-muted);
  text-align: center;
}

.agreement text {
  color: var(--accent);
}
</style>
