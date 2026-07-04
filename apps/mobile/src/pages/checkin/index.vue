<script setup lang="ts">
import { computed, ref } from "vue";
import { initialSignedDays, milestones, today, type Milestone } from "../points/pointsData";

const checkinDone = ref(false);
const checkinStreak = ref(7);
const signedDays = ref<number[]>([...initialSignedDays]);
const milestoneStates = ref<Record<number, Milestone["state"]>>(
  milestones.reduce<Record<number, Milestone["state"]>>((next, item) => {
    next[item.days] = item.state;
    return next;
  }, {})
);
const streakPulse = ref(false);
const todayPulse = ref(false);

const calendarDays = computed(() => {
  return Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    return {
      day,
      signed: signedDays.value.includes(day),
      today: day === today,
      milestone: milestones.some((item) => item.days === day)
    };
  });
});

function stateText(state: Milestone["state"]) {
  if (state === "claimed") return "已领";
  if (state === "available") return "可领";
  return "未达";
}

function doCheckin() {
  if (checkinDone.value) return;

  checkinDone.value = true;
  checkinStreak.value += 1;
  signedDays.value = [...signedDays.value, today];
  streakPulse.value = true;
  todayPulse.value = true;

  setTimeout(() => {
    streakPulse.value = false;
    todayPulse.value = false;
  }, 360);

  uni.showToast({ title: `签到成功！+10积分，连续${checkinStreak.value}天`, icon: "none" });
}

function claimMilestone(item: Milestone) {
  if (milestoneStates.value[item.days] !== "available") return;

  milestoneStates.value = {
    ...milestoneStates.value,
    [item.days]: "claimed"
  };
  uni.showToast({ title: `领取成功！+${item.reward}积分`, icon: "none" });
}
</script>

<template>
  <view class="checkin-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="streak-card">
          <view class="streak-label">已连续签到</view>
          <view class="streak-num" :class="{ pulse: streakPulse }">
            <text>{{ checkinStreak }}</text>
            <text class="streak-unit">天</text>
          </view>
          <button class="checkin-btn" :class="{ done: checkinDone }" :disabled="checkinDone" @click="doCheckin">
            <text v-if="checkinDone" class="check-icon">✓</text>
            <text>{{ checkinDone ? "今日已签到" : "今日签到 +10积分" }}</text>
          </button>
        </view>

        <view class="section-title">
          <text class="gift-icon">□</text>
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
            <text>2026年7月</text>
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
                pulse: todayPulse && item.day === today
              }"
            >
              <text>{{ item.day }}</text>
              <text v-if="item.milestone" class="cal-gift">□</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.checkin-page {
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

.streak-card,
.milestone-card,
.calendar-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.streak-card {
  padding: 24px;
  margin-bottom: 16px;
  text-align: center;
  background: linear-gradient(135deg, rgba(232, 244, 255, 0.95), rgba(255, 255, 255, 0.86));
}

.streak-label {
  font-size: 13px;
  color: var(--fg-muted);
}

.streak-num {
  font-family: Georgia, serif;
  font-size: 56px;
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
  font-size: 20px;
  color: var(--fg-muted);
}

.checkin-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 46px;
  margin-top: 16px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 12px;
  transition:
    background 0.3s ease,
    color 0.3s ease;
}

.checkin-btn::after {
  border: none;
}

.checkin-btn.done {
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
}

.check-icon {
  font-size: 17px;
}

.section-title {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 12px;
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
  gap: 8px;
  margin-bottom: 16px;
}

.milestone-card {
  min-height: 78px;
  padding: 12px 8px;
  text-align: center;
  box-sizing: border-box;
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    opacity 0.22s ease;
}

.milestone-card.available {
  cursor: pointer;
  border: 1.5px solid var(--accent);
}

.milestone-card.available:active {
  transform: scale(1.08);
}

.milestone-card.claimed {
  border-color: var(--border);
}

.milestone-card.locked {
  opacity: 0.5;
}

.milestone-days {
  font-size: 11px;
  color: var(--fg-muted);
}

.milestone-reward {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 700;
}

.milestone-card.claimed .milestone-reward {
  color: var(--mint);
}

.milestone-card.available .milestone-reward {
  color: var(--accent);
}

.milestone-card.locked:nth-child(3) .milestone-reward {
  color: var(--lavender);
}

.milestone-card.locked:nth-child(4) .milestone-reward {
  color: var(--peach);
}

.state-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 16px;
  padding: 0 6px;
  margin-top: 4px;
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
  padding: 16px;
}

.month-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--fg-muted);
}

.week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
  font-size: 11px;
  color: var(--fg-muted);
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  justify-items: center;
}

.cal-day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 12px;
  color: var(--fg-secondary);
  border-radius: 50%;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.cal-day.signed {
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
}

.cal-day.today {
  color: var(--accent);
  border: 1.5px solid var(--accent);
}

.cal-day.milestone:not(.signed) {
  background: var(--mint-soft, rgba(111, 212, 176, 0.16));
}

.cal-day.pulse {
  transform: scale(1.3);
}

.cal-gift {
  position: absolute;
  top: -3px;
  right: -3px;
  z-index: 2;
  font-size: 10px;
  color: var(--mint);
}

.cal-day.signed .cal-gift {
  color: rgba(255, 255, 255, 0.85);
}
</style>
