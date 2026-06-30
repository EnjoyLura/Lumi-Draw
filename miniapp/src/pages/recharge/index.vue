<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">积分充值</text>
      <view style="width:40px;" />
    </view>
    <scroll-view scroll-y class="recharge-scroll" :style="{ height: scrollH + 'px' }">
      <!-- 余额卡 -->
      <view class="balance-card">
        <view class="balance-circle" />
        <text class="balance-label">当前积分余额</text>
        <text class="balance-num">2860</text>
      </view>

      <text class="section-label">充值档位</text>
      <view class="tiers-grid">
        <view v-for="t in tiers" :key="t.price" :class="['tier-card', { popular: t.popular, selected: selectedTier === t.price }]" @click="selectedTier = t.price">
          <view v-if="t.popular" class="tier-hot">热门</view>
          <text class="tier-price">¥{{ t.price }}</text>
          <text class="tier-credits">{{ t.credits }}积分</text>
          <text v-if="t.bonus > 0" class="tier-bonus">+{{ t.bonus }}</text>
        </view>
      </view>

      <view class="custom-btn" @click="showCustom = true">自定义充值</view>

      <view class="sub-tabs">
        <view :class="['sub-tab', { active: recordTab === 'earn' }]" @click="recordTab = 'earn'">积分获得</view>
        <view :class="['sub-tab', { active: recordTab === 'spend' }]" @click="recordTab = 'spend'">积分消耗</view>
      </view>

      <view class="records">
        <view v-for="r in records" :key="r.id" class="record-row">
          <view class="record-info">
            <text class="record-title">{{ r.title }}</text>
            <text class="record-time">{{ r.time }}</text>
          </view>
          <text :class="['record-amount', r.amount > 0 ? 'income' : 'expense']">{{ r.amount > 0 ? '+' : '' }}{{ r.amount }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 自定义充值弹窗 -->
    <view v-if="showCustom" class="overlay" @click="showCustom = false" />
    <view :class="['bottom-sheet', { show: showCustom }]">
      <view class="sheet-handle" />
      <text class="sheet-title">自定义充值</text>
      <view class="amount-row">
        <text class="amount-symbol">¥</text>
        <input class="amount-input" v-model="customAmount" type="digit" placeholder="最低1元" />
      </view>
      <view class="preview-box">
        <view class="preview-row"><text class="preview-label">可获得积分</text><text class="preview-value">{{ customCredits }}</text></view>
        <view class="preview-row"><text class="preview-label">额外赠送</text><text class="preview-bonus">+{{ customBonus }}</text></view>
      </view>
      <view class="sheet-actions">
        <view class="sheet-cancel" @click="showCustom = false">取消</view>
        <view class="sheet-confirm" @click="confirmCustom">确认充值</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { paymentApi } from '@/utils/api';
const scrollH = ref(700);
const selectedTier = ref('');
const recordTab = ref('earn');
const showCustom = ref(false);
const customAmount = ref('');
const tiers = ref<any[]>([]);
const records = ref<any[]>([]);

const customCredits = computed(() => { const v = parseFloat(customAmount.value) || 0; return Math.floor(v * 10); });
const customBonus = computed(() => { const c = customCredits.value; return c >= 500 ? Math.floor(c * 0.15) : 0; });
const confirmCustom = () => { showCustom.value = false; uni.showToast({ title: `充值 ¥${customAmount.value}`, icon: 'none' }); };
const goBack = () => uni.navigateBack();

onMounted(async () => {
  scrollH.value = uni.getSystemInfoSync().windowHeight - 80;
  try {
    const [tierRes, txRes] = await Promise.all([paymentApi.getRechargeTiers(), paymentApi.getTransactions('all')]);
    const tList = (tierRes as any).data || tierRes || [];
    tiers.value = tList.map((t: any) => ({ price: t.price, credits: t.credits, bonus: t.bonus, popular: t.is_popular }));
    const popular = tiers.value.find((t: any) => t.popular);
    if (popular) selectedTier.value = popular.price;
    else if (tiers.value.length) selectedTier.value = tiers.value[0].price;
    const txList = (txRes as any).data || txRes || [];
    records.value = txList.map((t: any) => ({ id: t.id, title: t.remark, time: t.created_at?.substring(0, 16).replace('T', ' '), amount: t.credits_change }));
  } catch {
    tiers.value = [
      { price: 6, credits: 60, bonus: 0, popular: false },
      { price: 18, credits: 180, bonus: 10, popular: false },
      { price: 30, credits: 300, bonus: 30, popular: false },
      { price: 68, credits: 680, bonus: 100, popular: true },
      { price: 128, credits: 1280, bonus: 280, popular: false },
    ];
    selectedTier.value = 68;
  }
});
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.recharge-scroll { padding-top: 90px; padding-left: 16px; padding-right: 16px; }

.balance-card { padding: 20px; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); border-radius: 20px; margin-bottom: 16px; position: relative; overflow: hidden; }
.balance-circle { position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.08); }
.balance-label { font-size: 13px; color: rgba(255,255,255,0.75); margin-bottom: 8px; display: block; }
.balance-num { font-size: 32px; font-weight: 700; color: #fff; }

.section-label { font-size: 16px; font-weight: 700; color: #0E1F3A; margin-bottom: 10px; display: block; }
.tiers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
.tier-card { background: #fff; border-radius: 16px; border: 2px solid rgba(91,159,232,0.14); padding: 14px 8px; text-align: center; position: relative; overflow: hidden; &.popular { border-color: #5B9FE8; } &.selected { border-color: #5B9FE8; background: rgba(91,159,232,0.06); } }
.tier-hot { position: absolute; top: 0; right: 0; background: #5B9FE8; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 0 0 0 8px; }
.tier-price { font-size: 18px; font-weight: 700; color: #0E1F3A; display: block; }
.tier-credits { font-size: 12px; color: #8497B5; display: block; margin-top: 4px; }
.tier-bonus { font-size: 11px; font-weight: 600; color: #6FD4B0; display: block; margin-top: 2px; }

.custom-btn { text-align: center; padding: 10px; background: rgba(91,159,232,0.12); color: #3B7FC8; font-size: 13px; font-weight: 600; border-radius: 12px; margin-bottom: 16px; }

.sub-tabs { display: flex; gap: 4px; padding: 4px; background: #E1EBF8; border-radius: 12px; margin-bottom: 12px; }
.sub-tab { flex: 1; padding: 7px 0; font-size: 13px; font-weight: 600; color: #445876; text-align: center; border-radius: 9px; &.active { background: #fff; color: #5B9FE8; box-shadow: 0 2px 8px rgba(60,120,200,0.06); } }

.records { margin-bottom: 20px; }
.record-row { display: flex; align-items: center; padding: 12px 0; border-bottom: 0.5px solid rgba(91,159,232,0.08); }
.record-info { flex: 1; }
.record-title { font-size: 14px; color: #0E1F3A; display: block; }
.record-time { font-size: 11px; color: #8497B5; margin-top: 2px; }
.record-amount { font-size: 16px; font-weight: 700; &.income { color: #6FD4B0; } &.expense { color: #8497B5; } }

// Bottom sheet
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 150; }
.bottom-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 24px 24px 0 0; z-index: 200; transform: translateY(100%); visibility: hidden; transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), visibility 0.4s; padding: 8px 20px 30px; &.show { transform: translateY(0); visibility: visible; } }
.sheet-handle { width: 36px; height: 4px; background: rgba(91,159,232,0.3); border-radius: 2px; margin: 10px auto 4px; }
.sheet-title { font-size: 18px; font-weight: 700; text-align: center; margin: 8px 0 20px; display: block; }
.amount-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.amount-symbol { font-size: 24px; font-weight: 700; color: #5B9FE8; }
.amount-input { flex: 1; font-size: 18px; font-weight: 600; padding: 12px; border-radius: 12px; border: 1.5px solid rgba(91,159,232,0.14); background: #FBFDFF; color: #0E1F3A; }
.preview-box { padding: 14px; background: rgba(91,159,232,0.12); border-radius: 12px; margin-bottom: 16px; }
.preview-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; &:last-child { margin-bottom: 0; } }
.preview-label { font-size: 13px; color: #445876; }
.preview-value { font-size: 18px; font-weight: 700; color: #5B9FE8; }
.preview-bonus { font-size: 14px; font-weight: 600; color: #6FD4B0; }
.sheet-actions { display: flex; gap: 10px; }
.sheet-cancel { flex: 1; padding: 12px 0; text-align: center; border-radius: 12px; font-size: 14px; font-weight: 600; border: 1px solid rgba(91,159,232,0.32); color: #0E1F3A; }
.sheet-confirm { flex: 1; padding: 12px 0; text-align: center; border-radius: 12px; font-size: 14px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); }
</style>
