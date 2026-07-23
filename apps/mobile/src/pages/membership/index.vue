<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, onBeforeUnmount, ref } from "vue";
import { onReady, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { memberBenefits, memberPlans, type MemberBenefit, type MemberPlan } from "../points/pointsData";
import { createMembershipOrder, fetchCreditsBalance, fetchMemberPlans, fetchMemberStatus, reconcilePendingPayments, requestOrderPayment } from "../points/pointsService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const { isLoggedIn, login: commitLogin, requireLogin, updateCurrentUser } = useAuth();
const { useMockData } = useDataMode();

const selectedPlanIdx = ref(1);
const plans = ref<MemberPlan[]>([]);
const isMember = ref(false);
const memberPlanName = ref("");
const memberExpireAt = ref("");
const isLoading = ref(false);
const isPaying = ref(false);
const showLoginSheet = ref(false);
const loadFailed = ref(false);
const isInitialContentReady = ref(false);
let lastMockMode: boolean | null = null;
let initialContentTimer: ReturnType<typeof setTimeout> | undefined;

function resetMemberStatus() {
  isMember.value = false;
  memberPlanName.value = "";
  memberExpireAt.value = "";
}

const selectedPlan = computed<MemberPlan | null>(() => plans.value[selectedPlanIdx.value] ?? (useMockData.value ? memberPlans[0] : null));
const memberStats = computed(() => {
  const plan = selectedPlan.value;
  if (!plan) {
    return [
      { value: "0", label: "开通赠送", className: "gold" },
      { value: "标准", label: "签到加成", className: "lavender" },
      { value: "待配置", label: "会员权益", className: "mint" }
    ];
  }
  return [
    { value: String(plan.totalCredits || 0), label: "开通赠送", className: "gold" },
    { value: plan.checkinBonus ? `+${plan.checkinBonus}` : "标准", label: "每日签到", className: "lavender" },
    { value: plan.publishBonus ? `+${plan.publishBonus}` : "标准", label: "发布加成", className: "mint" }
  ];
});
const activeBenefits = computed<MemberBenefit[]>(() => {
  const plan = selectedPlan.value;
  if (!plan) return [];
  if (!plan.checkinBonus && !plan.milestoneBonus && !plan.publishBonus && !plan.totalCredits) return memberBenefits;

  const benefits: MemberBenefit[] = [
    { title: "开通赠送", desc: `立即获得 ${plan.totalCredits || 0} 积分`, icon: "gem", tone: "mint" },
    { title: "每日签到加成", desc: plan.checkinBonus ? `每日签到额外 +${plan.checkinBonus} 积分` : "按基础签到规则获得积分", icon: "sun", tone: "accent" },
    { title: "签到里程碑加成", desc: plan.milestoneBonus ? `达成里程碑额外 +${plan.milestoneBonus} 积分` : "按基础里程碑奖励发放", icon: "gift", tone: "lavender" },
    { title: "发布作品加成", desc: plan.publishBonus ? `每次发布额外 +${plan.publishBonus} 积分` : "按基础发布奖励发放", icon: "sparkles", tone: "peach" }
  ];

  return benefits;
});
const memberStatusText = computed(() => {
  if (!isMember.value) return "未开通会员";
  if (!memberExpireAt.value) return `${memberPlanName.value || "会员"} 生效中`;
  return `有效期至 ${memberExpireAt.value.slice(0, 10)}`;
});

function clampPlanIndex() {
  selectedPlanIdx.value = plans.value.length ? Math.max(0, Math.min(selectedPlanIdx.value, plans.value.length - 1)) : 0;
}

onShow(() => {
  if (lastMockMode !== useMockData.value) {
    lastMockMode = useMockData.value;
    selectedPlanIdx.value = 1;
  }
  void loadMembership();
});

onReady(() => {
  initialContentTimer = setTimeout(() => {
    isInitialContentReady.value = true;
    initialContentTimer = undefined;
  }, 16);
});

onBeforeUnmount(() => {
  if (initialContentTimer) clearTimeout(initialContentTimer);
});

async function loadMembership() {
  if (useMockData.value) {
    plans.value = memberPlans;
    resetMemberStatus();
    loadFailed.value = false;
    return;
  }

  isLoading.value = true;
  loadFailed.value = false;
  try {
    const nextPlans = await fetchMemberPlans();
    plans.value = nextPlans;
    clampPlanIndex();

    resetMemberStatus();
    if (!isLoggedIn.value) return;
    await reconcilePendingPayments().catch(() => undefined);
    const status = await fetchMemberStatus();
    isMember.value = status.isMember;
    memberPlanName.value = status.memberPlan;
    memberExpireAt.value = status.memberExpireAt || "";
  } catch {
    resetMemberStatus();
    plans.value = [];
    loadFailed.value = true;
    uni.showToast({ title: "会员数据加载失败", icon: "none" });
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
    await loadMembership();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function selectPlan(index: number) {
  selectedPlanIdx.value = index;
}

async function openMember() {
  if (!ensureLogin()) return;
  if (isPaying.value) return;

  const plan = selectedPlan.value;
  if (!plan) {
    uni.showToast({ title: "会员方案未同步，请刷新后重试", icon: "none" });
    return;
  }
  if (!plan?.id && !useMockData.value) {
    uni.showToast({ title: "会员方案未同步，请刷新后重试", icon: "none" });
    return;
  }
  isPaying.value = true;
  try {
    if (useMockData.value) {
      isMember.value = true;
      memberPlanName.value = plan.name;
      const expire = new Date();
      expire.setDate(expire.getDate() + 30);
      memberExpireAt.value = expire.toISOString();
      uni.showToast({ title: "模拟开通成功", icon: "none" });
      return;
    }

    if (!plan.id) throw new Error("会员方案未同步，请刷新后重试");
    const order = await createMembershipOrder(plan.id);
    const paid = await requestOrderPayment(order);
    if (paid.status === "paid") {
      uni.showToast({ title: "会员开通成功", icon: "none" });
      const [nextBalance] = await Promise.all([fetchCreditsBalance(), loadMembership()]);
      updateCurrentUser({ credits: nextBalance });
    } else {
      uni.showToast({ title: "支付已提交，请稍后刷新查看", icon: "none" });
    }
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "支付失败，请稍后重试", icon: "none" });
  } finally {
    isPaying.value = false;
  }
}

function showAgreement() {
  uni.navigateTo({ url: "/pages/agreement/index?type=membership" });
}
</script>

<template>
  <view class="membership-page" :class="themeClass">
    <LumiPageHeader title="会员中心" />
    <view v-if="!isInitialContentReady" class="page-first-frame" />
    <scroll-view v-else class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="member-card">
          <view class="member-head">
            <view class="crown"><LumiIcon name="crown" :size="26" /></view>
            <view>
              <view class="member-title">Lumi 会员</view>
              <view class="member-sub">{{ isLoading ? "同步会员状态中" : memberStatusText }}</view>
            </view>
          </view>
          <view class="member-stats">
            <view v-for="stat in memberStats" :key="stat.label" class="stat-item">
              <view class="stat-value" :class="stat.className">{{ stat.value }}</view>
              <view class="stat-label">{{ stat.label }}</view>
            </view>
          </view>
        </view>

        <view class="section-title">选择套餐</view>
        <view v-if="!useMockData && loadFailed" class="empty-config">
          <view class="empty-title">会员方案加载失败</view>
          <view class="empty-sub">请稍后重试，当前不会显示模拟套餐。</view>
          <button class="empty-btn" @click="loadMembership">重新加载</button>
        </view>

        <view v-else-if="!isLoading && !plans.length" class="empty-config">
          <view class="empty-title">暂无会员方案</view>
          <view class="empty-sub">后台配置会员方案后会显示在这里。</view>
        </view>

        <view v-else class="plan-list">
          <view
            v-for="(plan, index) in plans"
            :key="`${plan.name}-${plan.price}`"
            class="plan-card"
            :class="{ selected: selectedPlanIdx === index }"
            @click="selectPlan(index)"
          >
            <view v-if="plan.recommended" class="recommend">推荐</view>
            <view class="plan-left">
              <view class="plan-icon" :class="plan.accent"><LumiIcon :name="plan.icon" :size="22" /></view>
              <view class="plan-info">
                <view class="plan-title-row">
                  <text class="plan-name">{{ plan.name }}</text>
                  <text v-if="plan.badge" class="save-tag">{{ plan.badge }}</text>
                </view>
                <view class="plan-desc"><text>赠送 {{ plan.totalCredits }}</text><LumiIcon name="sparkles-filled" :size="12" /><text>· {{ plan.unitPrice }}</text></view>
              </view>
            </view>
            <view class="plan-price">
              <view class="price">¥{{ plan.price }}</view>
            </view>
          </view>
        </view>

        <button v-if="plans.length" class="open-btn" :disabled="isPaying" @click="openMember">
          <LumiIcon class="open-icon" name="crown" :size="18" />
          <text>{{ isPaying ? "支付处理中..." : `立即开通 · ¥${selectedPlan?.price || 0}` }}</text>
        </button>

        <view v-if="activeBenefits.length" class="section-title">会员权益</view>
        <view v-if="activeBenefits.length" class="benefit-grid">
          <view v-for="benefit in activeBenefits" :key="`${benefit.title}-${benefit.desc}`" class="benefit-card">
            <view class="benefit-icon" :class="benefit.tone"><LumiIcon :name="benefit.icon" :size="20" /></view>
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
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.membership-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}

.page-first-frame {
  flex: 1;
  background: var(--page-bg);
}

.page-content {
  padding: 16px;
}

.member-card,
.plan-card,
.benefit-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.member-card {
  padding: 28px 20px;
  margin-bottom: 16px;
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

.empty-config {
  padding: 28px 18px;
  margin-bottom: 16px;
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

.plan-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 74px;
  padding: 16px;
  border: 2px solid var(--border);
  border-radius: 10px;
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

.plan-name,
.benefit-title {
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

.plan-desc,
.benefit-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
}

.plan-desc {
  display: flex;
  gap: 3px;
  align-items: center;
}

.plan-desc .lumi-icon {
  color: var(--accent);
}

.price {
  font-size: 20px;
  font-weight: 700;
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

.agreement {
  padding: 8px 0;
  font-size: 11px;
  color: var(--fg-muted);
  text-align: center;
}

.agreement text {
  color: var(--accent);
}

/* Lumi custom page header layout */
.membership-page {
  display: flex;
  flex-direction: column;
}

.membership-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
