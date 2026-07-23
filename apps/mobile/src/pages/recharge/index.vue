<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, reactive, ref } from "vue";
import { onReady, onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { currentCredits, earnRecords, rechargeTiers, spendRecords, type PointRecord, type RechargeTier } from "../points/pointsData";
import { createRechargeOrder, fetchCreditRecordPage, fetchCreditsBalance, fetchRechargeTiers, reconcilePendingPayments, requestOrderPayment } from "../points/pointsService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

type RecordTab = "earn" | "spend";
const RECORD_PAGE_SIZE = 20;

const { isLoggedIn, login: commitLogin, requireLogin, updateCurrentUser } = useAuth();
const { useMockData } = useDataMode();

const balance = ref(0);
const tiers = ref<RechargeTier[]>([]);
const selectedTierIdx = ref(3);
const activeTab = ref<RecordTab>("earn");
const earnList = ref<PointRecord[]>([]);
const spendList = ref<PointRecord[]>([]);
const customOpen = ref(false);
const customAmount = ref("");
const isLoading = ref(false);
const isLoadingMoreRecords = ref(false);
const isPaying = ref(false);
const showLoginSheet = ref(false);
const loginRequired = ref(false);
const loadFailed = ref(false);
const isInitialContentReady = ref(false);
const recordState = reactive({
  earn: { page: 1, hasMore: false },
  spend: { page: 1, hasMore: false }
});
let lastMockMode: boolean | null = null;
let initialContentTimer: ReturnType<typeof setTimeout> | undefined;

const records = computed(() => (activeTab.value === "earn" ? earnList.value : spendList.value));
const activeRecordState = computed(() => recordState[activeTab.value]);
const selectedTier = computed(() => tiers.value[selectedTierIdx.value]);
const customValue = computed(() => Number.parseFloat(customAmount.value));
const customCredits = computed(() => (Number.isNaN(customValue.value) || customValue.value < 0.1 ? 0 : Math.floor(customValue.value * 10)));
const customBonus = computed(() => Math.floor(customCredits.value * 0.05));

function clampTierIndex() {
  selectedTierIdx.value = tiers.value.length ? Math.max(0, Math.min(selectedTierIdx.value, tiers.value.length - 1)) : 0;
}

onShow(() => {
  if (lastMockMode !== useMockData.value) {
    lastMockMode = useMockData.value;
    selectedTierIdx.value = 3;
  }
  void loadPageData();
});

onReady(() => {
  initialContentTimer = setTimeout(() => {
    isInitialContentReady.value = true;
    initialContentTimer = undefined;
  }, 16);
});

async function loadPageData() {
  if (useMockData.value) {
    customOpen.value = false;
    balance.value = currentCredits;
    tiers.value = rechargeTiers;
    earnList.value = earnRecords;
    spendList.value = spendRecords;
    recordState.earn = { page: 1, hasMore: false };
    recordState.spend = { page: 1, hasMore: false };
    loginRequired.value = false;
    loadFailed.value = false;
    return;
  }
  if (!isLoggedIn.value) {
    customOpen.value = false;
    balance.value = 0;
    tiers.value = [];
    earnList.value = [];
    spendList.value = [];
    recordState.earn = { page: 1, hasMore: false };
    recordState.spend = { page: 1, hasMore: false };
    loginRequired.value = true;
    loadFailed.value = false;
    return;
  }
  loginRequired.value = false;
  loadFailed.value = false;
  customOpen.value = false;
  balance.value = 0;
  tiers.value = [];
  earnList.value = [];
  spendList.value = [];
  recordState.earn = { page: 1, hasMore: false };
  recordState.spend = { page: 1, hasMore: false };

  isLoading.value = true;
  try {
    await reconcilePendingPayments().catch(() => undefined);
    const [nextBalance, nextTiers, nextEarn, nextSpend] = await Promise.all([
      fetchCreditsBalance(),
      fetchRechargeTiers(),
      fetchCreditRecordPage("earn", 1, RECORD_PAGE_SIZE),
      fetchCreditRecordPage("spend", 1, RECORD_PAGE_SIZE)
    ]);
    balance.value = nextBalance;
    updateCurrentUser({ credits: nextBalance });
    tiers.value = nextTiers;
    earnList.value = nextEarn.items;
    spendList.value = nextSpend.items;
    recordState.earn = { page: nextEarn.page, hasMore: nextEarn.hasMore };
    recordState.spend = { page: nextSpend.page, hasMore: nextSpend.hasMore };
    clampTierIndex();
  } catch {
    loadFailed.value = true;
    uni.showToast({ title: "积分数据加载失败", icon: "none" });
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
    await loadPageData();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function selectTier(index: number) {
  selectedTierIdx.value = index;
}

function switchTab(tab: RecordTab) {
  activeTab.value = tab;
}

async function loadMoreRecords() {
  if (useMockData.value || isLoading.value || isLoadingMoreRecords.value || !activeRecordState.value.hasMore) return;

  isLoadingMoreRecords.value = true;
  const tab = activeTab.value;
  try {
    const next = await fetchCreditRecordPage(tab, recordState[tab].page + 1, RECORD_PAGE_SIZE);
    if (tab === "earn") earnList.value = [...earnList.value, ...next.items];
    else spendList.value = [...spendList.value, ...next.items];
    recordState[tab] = { page: next.page, hasMore: next.hasMore };
  } catch {
    uni.showToast({ title: "积分记录加载失败", icon: "none" });
  } finally {
    isLoadingMoreRecords.value = false;
  }
}

function openCustomRecharge() {
  customAmount.value = "";
  customOpen.value = true;
}

function closeCustomRecharge() {
  customOpen.value = false;
}

async function startRecharge(amount?: number) {
  if (!ensureLogin()) return;
  if (isPaying.value) return;

  const tier = tiers.value[selectedTierIdx.value];
  if (!amount && !tier) {
    uni.showToast({ title: "充值档位未同步，请刷新后重试", icon: "none" });
    return;
  }
  isPaying.value = true;
  try {
    if (useMockData.value) {
      const added = amount ? customCredits.value + customBonus.value : (tier?.credits || 0) + (tier?.bonus || 0);
      balance.value += added;
      updateCurrentUser({ credits: balance.value });
      uni.showToast({ title: "模拟支付成功", icon: "none" });
      return;
    }

    const order = amount ? await createRechargeOrder({ amount }) : await createRechargeOrder({ tierId: tier?.id });
    const paid = await requestOrderPayment(order);
    if (paid.status === "paid") {
      uni.showToast({ title: "充值成功", icon: "none" });
      await loadPageData();
    } else {
      uni.showToast({ title: "支付已提交，请稍后刷新查看", icon: "none" });
    }
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "支付失败，请稍后重试", icon: "none" });
  } finally {
    isPaying.value = false;
  }
}

function confirmCustomRecharge() {
  if (Number.isNaN(customValue.value) || customValue.value < 0.1) {
    uni.showToast({ title: "请输入至少 0.1 元", icon: "none" });
    return;
  }
  closeCustomRecharge();
  void startRecharge(customValue.value);
}
</script>

<template>
  <view class="recharge-page" :class="themeClass">
    <LumiPageHeader title="积分充值" />
    <view v-if="!isInitialContentReady" class="page-first-frame" />
    <scroll-view v-else class="page-scroll" scroll-y :lower-threshold="80" @scrolltolower="loadMoreRecords">
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        title="登录后查看积分账户"
        subtitle="登录后可以查看真实余额、交易记录并进行充值。"
        @login="showLoginSheet = true"
      />

      <view v-else class="page-content">
        <view class="balance-card">
          <view class="balance-copy">
            <view class="balance-label">当前积分余额</view>
            <view class="balance-num"><LumiIcon class="credits-symbol" name="sparkles-filled" :size="22" />{{ balance }}</view>
            <view class="balance-sub">积分可用于图片生成与增值功能</view>
          </view>
          <view class="balance-mark"><LumiIcon name="gem" :size="28" /></view>
        </view>

        <view class="section-head">
          <view class="section-title">选择充值金额</view>
          <view v-if="isLoading" class="section-state">同步中...</view>
        </view>
        <view v-if="!useMockData && loadFailed" class="empty-config">
          <view class="empty-title">充值配置加载失败</view>
          <view class="empty-sub">请稍后重试，当前不会显示模拟档位。</view>
          <button class="empty-btn" @click="loadPageData">重新加载</button>
        </view>

        <view v-else-if="!isLoading && !tiers.length" class="empty-config">
          <view class="empty-title">暂无充值档位</view>
          <view class="empty-sub">可使用自定义充值，或等待后台配置充值方案。</view>
          <button class="empty-btn" @click="openCustomRecharge">自定义充值</button>
        </view>

        <view v-else class="tier-grid">
          <view
            v-for="(tier, index) in tiers"
            :key="`${tier.price}-${tier.credits}`"
            class="tier-card"
            :class="{ selected: selectedTierIdx === index }"
            @click="selectTier(index)"
          >
            <view v-if="tier.popular" class="recommend-tag">推荐</view>
            <view v-if="selectedTierIdx === index" class="selected-check"><LumiIcon name="check" :size="11" /></view>
            <view class="tier-credits-row">
              <LumiIcon name="sparkles-filled" :size="14" />
              <view class="tier-credits">{{ tier.credits }}</view>
            </view>
            <view class="tier-bonus">{{ tier.bonus > 0 ? `送${tier.bonus}积分` : "" }}</view>
            <view class="tier-price">¥{{ tier.price }}</view>
          </view>

          <view class="tier-card custom-card" @click="openCustomRecharge">
            <view class="custom-plus"><LumiIcon name="plus" :size="18" /></view>
            <view class="custom-title">自定义</view>
            <view class="custom-sub">任意金额</view>
          </view>
        </view>

        <view v-if="tiers.length && selectedTier" class="checkout-bar">
          <view class="checkout-copy">
            <view class="checkout-price">¥{{ selectedTier.price }}</view>
            <view class="checkout-desc">到账 {{ selectedTier.credits + selectedTier.bonus }} 积分</view>
          </view>
          <button class="pay-btn" :disabled="isPaying" @click="() => startRecharge()">
            <LumiIcon name="credit-card" :size="16" />
            <text>{{ isPaying ? "处理中..." : "立即充值" }}</text>
          </button>
        </view>

        <view class="sub-tabs">
          <view class="sub-tab" :class="{ active: activeTab === 'earn' }" @click="switchTab('earn')">积分获得</view>
          <view class="sub-tab" :class="{ active: activeTab === 'spend' }" @click="switchTab('spend')">积分消费</view>
        </view>

        <view class="record-card">
          <view v-if="!records.length" class="empty-row">暂无积分记录</view>
          <view v-for="record in records" :key="`${record.title}-${record.time}-${record.amount}`" class="record-row">
            <view class="record-icon" :class="activeTab">
              <LumiIcon :name="activeTab === 'earn' ? 'circle-plus' : 'sparkles-filled'" :size="16" />
            </view>
            <view class="record-main">
              <view class="record-title">{{ record.title }}</view>
              <view class="record-sub">{{ activeTab === "earn" ? record.source : record.model }} · {{ record.time }}</view>
            </view>
            <view class="record-amount" :class="activeTab">{{ record.amount }}</view>
          </view>
          <view v-if="records.length && !useMockData" class="load-more-row">
            {{ isLoadingMoreRecords ? "正在加载更多记录..." : activeRecordState.hasMore ? "继续下滑查看更多记录" : "没有更多积分记录了" }}
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
        <input v-model="customAmount" class="amount-input" type="digit" placeholder="最低 0.1 元" />
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
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.recharge-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  flex: 1;
  height: 0;
}

.page-first-frame {
  flex: 1;
  background: var(--page-bg);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 112px;
  padding: 20px 18px 18px 20px;
  margin-bottom: 16px;
  background: var(--gradient-dream);
}

.balance-label,
.balance-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.balance-num {
  display: flex;
  gap: 5px;
  align-items: center;
}

.credits-symbol {
  color: #fff;
}

.balance-num {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
}

.balance-sub {
  margin-top: 9px;
  font-size: 11px;
}

.balance-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.tier-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.empty-config {
  padding: 28px 18px;
  margin-bottom: 12px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.empty-title {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 800;
}

.empty-sub {
  margin-bottom: 16px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--fg-secondary);
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 116px;
  height: 38px;
  padding: 0 18px;
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 999px;
}

.empty-btn::after {
  border: none;
}

.tier-card {
  position: relative;
  box-sizing: border-box;
  min-height: 86px;
  padding: 12px 8px 6px;
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
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
}

.tier-unit,
.custom-sub {
  font-size: 11px;
  color: var(--fg-muted);
}

.tier-credits-row {
  display: flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.selected-check {
  position: absolute;
  top: 7px;
  left: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  color: #fff;
  background: var(--accent);
  border-radius: 50%;
}

.section-state {
  font-size: 12px;
  color: var(--fg-muted);
}

.tier-unit {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
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

.checkout-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 8px 8px 8px 14px;
  margin-bottom: 16px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.checkout-price {
  font-size: 20px;
  font-weight: 800;
  color: var(--fg-primary);
}

.checkout-desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
}

.pay-btn {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 44px;
  margin: 0;
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
  color: var(--fg-secondary);
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

.load-more-row {
  padding: 12px;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: center;
}

.record-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
}

.recharge-page.theme-dark .sub-tab:not(.active) {
  color: rgba(255, 255, 255, 0.72);
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
  pointer-events: none;
  transform: translateY(110%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-sheet.show {
  pointer-events: auto;
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

/* Lumi custom page header layout */
.recharge-page {
  display: flex;
  flex-direction: column;
}

.recharge-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
