<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, ref } from "vue";
import { onReady, onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { milestones, type Milestone } from "../points/pointsData";
import { fetchCheckinStatus, submitCheckin } from "../points/pointsService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const { isLoggedIn, login: commitLogin, requireLogin, updateCurrentUser } = useAuth();
const { useMockData } = useDataMode();
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;
const currentDay = currentDate.getDate();
const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
const monthTitle = `${currentYear}年${currentMonth}月`;

const checkinDone = ref(false);
const checkinStreak = ref(0);
const nextCredits = ref(0);
const signedDays = ref<number[]>([]);
const milestoneStates = ref<Record<number, Milestone["state"]>>({});
const streakPulse = ref(false);
const todayPulse = ref(false);
const isLoading = ref(false);
const isSubmitting = ref(false);
const showLoginSheet = ref(false);
const loginRequired = ref(false);
const isInitialContentReady = ref(false);
let lastMockMode: boolean | null = null;
let initialContentTimer: ReturnType<typeof setTimeout> | undefined;

function buildMilestoneStates(streak: number) {
  return milestones.reduce<Record<number, Milestone["state"]>>((next, item) => {
    next[item.days] = streak >= item.days ? "claimed" : streak + 1 >= item.days ? "available" : "locked";
    return next;
  }, {});
}

milestoneStates.value = buildMilestoneStates(0);

function buildVisibleSignedDays(streak: number, checkedToday: boolean) {
  const endDay = checkedToday ? currentDay : currentDay - 1;
  if (endDay < 1 || streak < 1) return [];
  const startDay = Math.max(1, endDay - streak + 1);
  return Array.from({ length: endDay - startDay + 1 }, (_, index) => startDay + index);
}

const calendarDays = computed(() => {
  const endDay = checkinDone.value ? currentDay : currentDay - 1;
  const startDay = checkinStreak.value > 0 ? Math.max(1, endDay - checkinStreak.value + 1) : 0;
  const milestoneDays = new Set(
    milestones
      .map((item) => startDay + item.days - 1)
      .filter((day) => startDay > 0 && day >= startDay && day <= endDay && day <= daysInCurrentMonth)
  );

  return Array.from({ length: daysInCurrentMonth }, (_, index) => {
    const day = index + 1;
    return {
      day,
      signed: signedDays.value.includes(day),
      today: day === currentDay,
      milestone: milestoneDays.has(day)
    };
  });
});

onShow(() => {
  if (lastMockMode !== useMockData.value) {
    lastMockMode = useMockData.value;
  }
  void loadStatus();
});

onReady(() => {
  initialContentTimer = setTimeout(() => {
    isInitialContentReady.value = true;
    initialContentTimer = undefined;
  }, 16);
});

async function loadStatus() {
  if (useMockData.value) {
    checkinDone.value = false;
    checkinStreak.value = 7;
    nextCredits.value = 10;
    signedDays.value = buildVisibleSignedDays(checkinStreak.value, false);
    milestoneStates.value = buildMilestoneStates(checkinStreak.value);
    loginRequired.value = false;
    return;
  }
  if (!isLoggedIn.value) {
    checkinDone.value = false;
    checkinStreak.value = 0;
    nextCredits.value = 0;
    signedDays.value = [];
    milestoneStates.value = buildMilestoneStates(0);
    loginRequired.value = true;
    return;
  }
  loginRequired.value = false;
  checkinDone.value = false;
  checkinStreak.value = 0;
  signedDays.value = [];
  milestoneStates.value = buildMilestoneStates(0);

  isLoading.value = true;
  try {
    const status = await fetchCheckinStatus();
    checkinDone.value = status.checkedToday;
    checkinStreak.value = status.continuousDays;
    nextCredits.value = status.nextCredits;
    signedDays.value = buildVisibleSignedDays(status.continuousDays, status.checkedToday);
    milestoneStates.value = buildMilestoneStates(status.continuousDays);
  } catch {
    uni.showToast({ title: "签到状态加载失败", icon: "none" });
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
    await loadStatus();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function stateText(state: Milestone["state"]) {
  if (state === "claimed") return "已领";
  if (state === "available") return "可领";
  return "未达";
}

function pulseToday() {
  streakPulse.value = true;
  todayPulse.value = true;
  setTimeout(() => {
    streakPulse.value = false;
    todayPulse.value = false;
  }, 360);
}

async function doCheckin() {
  if (checkinDone.value || isSubmitting.value) return;

  if (useMockData.value) {
    checkinDone.value = true;
    checkinStreak.value += 1;
    signedDays.value = buildVisibleSignedDays(checkinStreak.value, true);
    milestoneStates.value = buildMilestoneStates(checkinStreak.value);
    pulseToday();
    uni.showToast({ title: `签到成功，+${nextCredits.value}积分`, icon: "none" });
    return;
  }
  if (!ensureLogin()) return;

  isSubmitting.value = true;
  try {
    const result = await submitCheckin();
    checkinDone.value = true;
    checkinStreak.value = result.continuousDays;
    signedDays.value = buildVisibleSignedDays(result.continuousDays, true);
    milestoneStates.value = buildMilestoneStates(result.continuousDays);
    updateCurrentUser({ credits: result.balance });
    pulseToday();
    uni.showToast({ title: result.checked ? `签到成功，+${result.credits}积分` : "今日已签到", icon: "none" });
  } catch {
    uni.showToast({ title: "签到失败，请稍后重试", icon: "none" });
  } finally {
    isSubmitting.value = false;
  }
}

function claimMilestone(item: Milestone) {
  if (milestoneStates.value[item.days] !== "available") return;
  uni.showToast({ title: "里程碑奖励已由每日签到自动发放", icon: "none" });
}
</script>

<template>
  <view class="checkin-page" :class="themeClass">
    <LumiPageHeader title="每日签到" />
    <view v-if="!isInitialContentReady" class="page-first-frame" />
    <scroll-view v-else class="page-scroll" scroll-y>
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        title="登录后参与每日签到"
        subtitle="登录后可以同步连续签到天数，并领取真实积分奖励。"
        @login="showLoginSheet = true"
      />

      <view v-else class="page-content">
        <view class="streak-card">
          <view class="streak-label">{{ isLoading ? "同步签到状态中" : "已连续签到" }}</view>
          <view class="streak-num" :class="{ pulse: streakPulse }">
            <text>{{ checkinStreak }}</text>
            <text class="streak-unit">天</text>
          </view>
          <button class="checkin-btn" :class="{ done: checkinDone }" :disabled="checkinDone || isSubmitting" @click="doCheckin">
            <text v-if="checkinDone" class="check-icon">✓</text>
            <text>{{ checkinDone ? "今日已签到" : `今日签到 +${nextCredits}积分` }}</text>
          </button>
        </view>

        <view class="section-title">
          <text class="gift-icon">◆</text>
          <text>里程碑奖励</text>
        </view>
        <view class="milestone-grid">
          <view
            v-for="item in milestones"
            :key="item.days"
            class="milestone-card"
            :class="milestoneStates[item.days]"
            @click="claimMilestone(item)"
          >
            <view class="milestone-days">{{ item.days }}天</view>
            <view class="milestone-reward">+{{ item.reward }}</view>
            <view class="state-tag" :class="milestoneStates[item.days]">{{ stateText(milestoneStates[item.days]) }}</view>
          </view>
        </view>

        <view class="section-title plain">本月签到</view>
        <view class="calendar-card">
          <view class="month-row">
            <text>{{ monthTitle }}</text>
          </view>
          <view class="week-row">
            <text>日</text>
            <text>一</text>
            <text>二</text>
            <text>三</text>
            <text>四</text>
            <text>五</text>
            <text>六</text>
          </view>
          <view class="calendar-grid">
            <view
              v-for="item in calendarDays"
              :key="item.day"
              class="cal-day"
              :class="{
                signed: item.signed,
                today: item.today && !item.signed,
                milestone: item.milestone,
                pulse: todayPulse && item.day === currentDay
              }"
            >
              <text>{{ item.day }}</text>
              <text v-if="item.milestone" class="cal-gift">🎁</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.checkin-page {
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
  padding: 16px 16px 24px;
}

.streak-card,
.milestone-card,
.calendar-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.streak-card {
  position: relative;
  padding: 24px 22px 26px;
  margin-bottom: 18px;
  overflow: hidden;
  text-align: center;
  background:
    radial-gradient(circle at 18% 10%, rgba(111, 212, 176, 0.22), transparent 34%),
    linear-gradient(135deg, rgba(232, 244, 255, 0.98), rgba(255, 255, 255, 0.88));
}

.checkin-page.theme-dark .streak-card,
:root[data-theme="dark"] .streak-card {
  background:
    radial-gradient(circle at 18% 10%, rgba(111, 212, 176, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(38, 38, 40, 0.98), rgba(28, 28, 30, 0.92));
  border-color: var(--border);
}

.streak-label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--fg-muted);
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(91, 159, 232, 0.12);
  border-radius: 999px;
}

.streak-num {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  font-size: 62px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--accent);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.streak-num.pulse {
  transform: scale(1.2);
}

.streak-unit {
  margin-left: 2px;
  font-size: 22px;
  color: var(--fg-muted);
}

.checkin-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  margin-top: 18px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: 0;
  border-radius: 12px;
}

.checkin-btn::after {
  border: none;
}

.checkin-btn.done {
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
}

.section-title {
  display: flex;
  gap: 4px;
  align-items: center;
  margin: 18px 2px 12px;
  font-size: 18px;
  font-weight: 700;
}

.section-title.plain {
  display: block;
}

.gift-icon {
  font-size: 16px;
  color: var(--mint);
}

.milestone-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}

.milestone-card {
  position: relative;
  min-height: 86px;
  padding: 13px 8px 12px;
  overflow: hidden;
  text-align: center;
  border-radius: 12px;
}

.milestone-card.available {
  border: 1.5px solid var(--accent);
}

.milestone-card.claimed {
  background: linear-gradient(180deg, rgba(111, 212, 176, 0.14), var(--bg-card));
}

.milestone-card.locked {
  opacity: 0.62;
}

.milestone-days {
  font-size: 11px;
  color: var(--fg-muted);
}

.milestone-reward {
  margin-top: 5px;
  font-size: 18px;
  font-weight: 700;
}

.milestone-card.claimed .milestone-reward {
  color: var(--mint);
}

.milestone-card.available .milestone-reward {
  color: var(--accent);
}

.state-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 16px;
  padding: 0 6px;
  margin-top: 6px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 999px;
}

.state-tag.claimed {
  color: var(--mint);
  background: rgba(111, 212, 176, 0.14);
}

.state-tag.available {
  color: var(--accent);
  background: var(--accent-soft);
}

.state-tag.locked {
  color: var(--peach);
  background: rgba(255, 181, 154, 0.14);
}

.calendar-card {
  padding: 18px 16px 20px;
  border-radius: 14px;
}

.month-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 400;
  color: var(--fg-secondary);
}

.week-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 7px 4px;
  text-align: center;
}

.week-row {
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--fg-muted);
}

.cal-day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin: 0 auto;
  font-size: 12px;
  color: var(--fg-secondary);
  border-radius: 50%;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.cal-day.signed {
  font-weight: 700;
  color: var(--accent-deep);
  background: var(--accent-soft);
}

.cal-day.today {
  color: var(--accent);
  background: var(--bg-card);
  border: 1.5px solid var(--accent);
}

.cal-day.pulse {
  transform: scale(1.3);
}

.cal-gift {
  position: absolute;
  top: -5px;
  right: -5px;
  z-index: 1;
  font-size: 11px;
  line-height: 1;
  pointer-events: none;
}

/* Lumi custom page header layout */
.checkin-page {
  display: flex;
  flex-direction: column;
}

.checkin-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
