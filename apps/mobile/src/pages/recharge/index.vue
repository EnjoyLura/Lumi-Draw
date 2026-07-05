<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { currentCredits, earnRecords, rechargeTiers, spendRecords, type PointRecord, type RechargeTier } from "../points/pointsData";
import { fetchCreditRecords, fetchCreditsBalance, fetchRechargeTiers } from "../points/pointsService";

type RecordTab = "earn" | "spend";

const { requireLogin } = useAuth();
const { useMockData } = useDataMode();

const balance = ref(currentCredits);
const tiers = ref<RechargeTier[]>(rechargeTiers);
const selectedTierIdx = ref(3);
const activeTab = ref<RecordTab>("earn");
const earnList = ref<PointRecord[]>(earnRecords);
const spendList = ref<PointRecord[]>(spendRecords);
const customOpen = ref(false);
const customAmount = ref("");
const isLoading = ref(false);
let lastMockMode: boolean | null = null;

const records = computed(() => (activeTab.value === "earn" ? earnList.value : spendList.value));
const customValue = computed(() => Number.parseFloat(customAmount.value));
const customCredits = computed(() => (Number.isNaN(customValue.value) || customValue.value < 1 ? 0 : Math.floor(customValue.value * 10)));
const customBonus = computed(() => Math.floor(customCredits.value * 0.05));

onShow(() => {
  if (lastMockMode !== useMockData.value) {
    lastMockMode = useMockData.value;
    selectedTierIdx.value = 3;
  }
  void loadPageData();
});

async function loadPageData() {
  if (useMockData.value) {
    balance.value = currentCredits;
    tiers.value = rechargeTiers;
    earnList.value = earnRecords;
    spendList.value = spendRecords;
    return;
  }
  if (!requireLogin()) return;

  isLoading.value = true;
  try {
    const [nextBalance, nextTiers, nextEarn, nextSpend] = await Promise.all([
      fetchCreditsBalance(),
      fetchRechargeTiers(),
      fetchCreditRecords("earn"),
      fetchCreditRecords("spend")
    ]);
    balance.value = nextBalance;
    tiers.value = nextTiers.length ? nextTiers : rechargeTiers;
    earnList.value = nextEarn;
    spendList.value = nextSpend;
    selectedTierIdx.value = Math.min(selectedTierIdx.value, tiers.value.length - 1);
  } catch {
    uni.showToast({ title: "积分数据加载失败", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}

function selectTier(index: number) {
  selectedTierIdx.value = index;
}

function switchTab(tab: RecordTab) {
  activeTab.value = tab;
}

function openCustomRecharge() {
  customAmount.value = "";
  customOpen.value = true;
}

function closeCustomRecharge() {
  customOpen.value = false;
}

function startRecharge() {
  if (!requireLogin()) return;
  uni.showToast({ title: "微信支付待接入", icon: "none" });
}

function confirmCustomRecharge() {
  if (Number.isNaN(customValue.value) || customValue.value < 1) {
    uni.showToast({ title: "请输入至少 1 元", icon: "none" });
    return;
  }
  closeCustomRecharge();
  startRecharge();
}
</script>

<template>
  <view class="recharge-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="balance-card">
          <view class="balance-label">当前积分余额</view>
          <view class="balance-num">{{ balance }}</view>
          <view v-if="isLoading" class="balance-sub">同步中...</view>
        </view>

        <view class="section-title">充值档位</view>
        <view class="tier-grid">
          <view
            v-for="(tier, index) in tiers"
            :key="`${tier.price}-${tier.credits}`"
            class="tier-card"
            :class="{ selected: selectedTierIdx === index }"
            @click="selectTier(index)"
          >
            <view v-if="tier.popular" class="recommend-tag">推荐</view>
            <view class="tier-credits">{{ tier.credits }}</view>
            <view class="tier-unit">积分</view>
            <view class="tier-bonus">{{ tier.bonus > 0 ? `送${tier.bonus}积分` : "" }}</view>
            <view class="tier-price">¥{{ tier.price }}</view>
          </view>

          <view class="tier-card custom-card" @click="openCustomRecharge">
            <view class="custom-plus">+</view>
            <view class="custom-title">自定义</view>
            <view class="custom-sub">任意金额</view>
          </view>
        </view>

        <button class="pay-btn" @click="startRecharge">微信支付充值</button>

        <view class="sub-tabs">
          <view class="sub-tab" :class="{ active: activeTab === 'earn' }" @click="switchTab('earn')">积分获得</view>
          <view class="sub-tab" :class="{ active: activeTab === 'spend' }" @click="switchTab('spend')">积分消费</view>
        </view>

        <view class="record-card">
          <view v-if="!records.length" class="empty-row">暂无积分记录</view>
          <view v-for="record in records" :key="`${record.title}-${record.time}-${record.amount}`" class="record-row">
            <view class="record-icon" :class="activeTab">{{ activeTab === "earn" ? "+" : "-" }}</view>
            <view class="record-main">
              <view class="record-title">{{ record.title }}</view>
              <view class="record-sub">{{ activeTab === "earn" ? record.source : record.model }} · {{ record.time }}</view>
            </view>
            <view class="record-amount" :class="activeTab">{{ record.amount }}</view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="sheet-overlay" :class="{ show: customOpen }" @click="closeCustomRecharge" />
    <view class="custom-sheet" :class="{ show: customOpen }">
      <view class="sheet-handle" />
      <view class="sheet-title">自定义充值</view>
      <view class="field-label">输入充值金额（元）</view>
      <view class="amount-row">
        <text class="money-symbol">¥</text>
        <input v-model="customAmount" class="amount-input" type="digit" placeholder="最低 1 元" />
      </view>
      <view class="preview-card">
        <view class="preview-row">
          <text>可获得积分</text>
          <text class="preview-credits">{{ customCredits }}</text>
        </view>
        <view class="preview-row">
          <text>额外赠送</text>
          <text class="preview-bonus">+{{ customBonus }}</text>
        </view>
      </view>
      <view class="sheet-actions">
        <button class="btn secondary" @click="closeCustomRecharge">取消</button>
        <button class="btn gradient" @click="confirmCustomRecharge">确认充值</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.recharge-page {
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

.balance-card,
.tier-card,
.record-card,
.preview-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.balance-card {
  padding: 20px;
  margin-bottom: 16px;
  background: var(--gradient-dream);
}

.balance-label,
.balance-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.balance-num {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
}

.section-title {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 700;
}

.tier-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.tier-card {
  position: relative;
  min-height: 104px;
  padding: 14px 8px 12px;
  text-align: center;
  border: 2px solid var(--border);
  border-radius: 10px;
}

.tier-card.selected {
  background: linear-gradient(180deg, rgba(91, 159, 232, 0.06) 0%, transparent 100%);
  border-color: var(--accent);
}

.recommend-tag {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 1px 6px;
  font-size: 8px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
}

.tier-credits,
.custom-plus {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.tier-unit,
.custom-sub {
  font-size: 11px;
  color: var(--fg-muted);
}

.tier-bonus {
  height: 16px;
  margin-top: 3px;
  font-size: 10px;
  font-weight: 600;
  color: var(--mint);
}

.tier-price,
.custom-title {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
}

.custom-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-style: dashed;
}

.pay-btn {
  width: 100%;
  height: 46px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 12px;
}

.pay-btn::after,
.btn::after {
  border: none;
}

.sub-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.sub-tab {
  flex: 1;
  height: 34px;
  font-size: 13px;
  font-weight: 600;
  line-height: 34px;
  color: var(--fg-muted);
  text-align: center;
  border-radius: 9px;
}

.sub-tab.active {
  color: var(--accent);
  background: var(--bg-card);
  box-shadow: 0 2px 10px rgba(91, 159, 232, 0.12);
}

.record-card {
  overflow: hidden;
}

.record-row,
.empty-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 58px;
  padding: 0 14px;
  border-bottom: 0.5px solid var(--border);
}

.empty-row {
  justify-content: center;
  color: var(--fg-muted);
}

.record-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 10px;
}

.record-icon.earn,
.record-amount.earn {
  color: var(--mint);
}

.record-icon.spend,
.record-amount.spend {
  color: var(--rose);
}

.record-icon.earn {
  background: var(--mint-soft);
}

.record-icon.spend {
  background: var(--rose-soft);
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
}

.record-amount {
  font-size: 14px;
  font-weight: 700;
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  pointer-events: none;
  background: rgba(0, 0, 0, 0);
  transition: background 0.24s ease;
}

.sheet-overlay.show {
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.36);
}

.custom-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 310;
  padding: 20px 16px 30px;
  background: var(--bg-card);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 30px rgba(14, 31, 58, 0.12);
  transform: translateY(110%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-sheet.show {
  transform: translateY(0);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto 20px;
  background: var(--border-strong);
  border-radius: 999px;
}

.sheet-title {
  margin: 8px 0 20px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.field-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--fg-muted);
}

.amount-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.money-symbol {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}

.amount-input {
  flex: 1;
  height: 46px;
  padding: 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg-primary);
  background: var(--bg-soft);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.preview-card {
  padding: 14px;
  margin-bottom: 16px;
  background: var(--accent-soft);
}

.preview-row,
.sheet-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-row + .preview-row {
  margin-top: 6px;
}

.preview-credits {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
}

.preview-bonus {
  font-size: 14px;
  font-weight: 600;
  color: var(--mint);
}

.sheet-actions {
  gap: 10px;
}

.btn {
  flex: 1;
  height: 44px;
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
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
</style>
