<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">每日签到</text>
      <view style="width:40px;" />
    </view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="checkin-card">
        <text class="checkin-label">已连续签到</text>
        <view class="checkin-streak">
          <text class="streak-num">{{ streak }}</text>
          <text class="streak-unit">天</text>
        </view>
        <view v-if="!checkedToday" class="checkin-btn" @click="doCheckin">今日签到 +10积分</view>
        <view v-else class="checkin-btn done">✓ 今日已签到</view>
      </view>

      <view class="section-header"><text class="section-title">🎁 里程碑奖励</text></view>
      <view class="milestone-grid">
        <view v-for="m in milestones" :key="m.days" :class="['milestone-card', { claimed: m.status === 'claimed', available: m.status === 'available', locked: m.status === 'locked' }]">
          <text class="ms-days">{{ m.days }}天</text>
          <text class="ms-reward" :style="{ color: m.color }">+{{ m.reward }}</text>
          <text :class="['ms-status', m.status]">{{ m.label }}</text>
        </view>
      </view>

      <view class="section-header"><text class="section-title">本月签到</text></view>
      <view class="calendar-card">
        <text class="cal-month">2026年6月</text>
        <view class="cal-weekdays">
          <text v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="cal-weekday">{{ d }}</text>
        </view>
        <view class="cal-grid">
          <view v-for="(d, i) in calendarDays" :key="i" :class="['cal-day', { signed: d.signed, today: d.today, empty: d.empty }]">
            {{ d.empty ? '' : d.day }}
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const streak = ref(7);
const checkedToday = ref(false);

const milestones = [
  { days: 3, reward: 20, color: '#6FD4B0', status: 'claimed', label: '已领' },
  { days: 7, reward: 50, color: '#5B9FE8', status: 'available', label: '可领' },
  { days: 14, reward: 100, color: '#B8A5E3', status: 'locked', label: '未达' },
  { days: 30, reward: 300, color: '#FFB59A', status: 'locked', label: '未达' },
];

const signedDays = [1, 2, 3, 4, 5, 6, 7];
// June 2026 starts on Monday (index 1 in the grid)
const calendarDays = Array.from({ length: 35 }, (_, i) => {
  const dayNum = i; // 0=empty(Sun), 1-30=days, 31-34=empty
  if (dayNum < 1 || dayNum > 30) return { day: '', empty: true, signed: false, today: false };
  return { day: dayNum, empty: false, signed: signedDays.includes(dayNum), today: dayNum === 28 };
});

const doCheckin = () => {
  checkedToday.value = true;
  streak.value++;
  uni.showToast({ title: '签到成功 +10积分', icon: 'none' });
};
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

.checkin-card { padding: 24px; text-align: center; background: linear-gradient(180deg, #E1EBF8 0%, #F5F9FE 100%); border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); margin-bottom: 16px; }
.checkin-label { font-size: 13px; color: #8497B5; }
.checkin-streak { margin: 4px 0; }
.streak-num { font-size: 56px; font-weight: 700; color: #5B9FE8; font-family: Georgia, serif; }
.streak-unit { font-size: 20px; color: #8497B5; }
.checkin-btn { width: 100%; padding: 14px 0; margin-top: 16px; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; font-size: 15px; font-weight: 600; border-radius: 14px; text-align: center; box-shadow: 0 4px 14px rgba(91,159,232,0.35); &:active { transform: scale(0.97); } &.done { background: #E1EBF8; color: #6FD4B0; box-shadow: none; } }

.section-header { margin-bottom: 10px; }
.section-title { font-size: 16px; font-weight: 700; color: #0E1F3A; }

.milestone-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.milestone-card { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); padding: 12px 8px; text-align: center; }
.milestone-card.available { border-color: #5B9FE8; border-width: 1.5px; }
.milestone-card.locked { opacity: 0.5; }
.ms-days { font-size: 11px; color: #8497B5; display: block; }
.ms-reward { font-size: 16px; font-weight: 700; display: block; }
.ms-status { font-size: 9px; padding: 1px 6px; border-radius: 999px; display: inline-block; margin-top: 4px; background: rgba(184,165,227,0.2); color: #B8A5E3; }
.ms-status.claimed { background: rgba(111,212,176,0.16); color: #6FD4B0; }
.ms-status.available { background: rgba(91,159,232,0.12); color: #5B9FE8; }
.ms-status.locked { background: rgba(184,165,227,0.2); color: #B8A5E3; }

.calendar-card { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); padding: 16px; margin-bottom: 20px; }
.cal-month { font-size: 12px; color: #8497B5; display: block; margin-bottom: 10px; }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; margin-bottom: 6px; }
.cal-weekday { font-size: 11px; color: #8497B5; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; justify-items: center; }
.cal-day { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 13px; border-radius: 50%; color: #445876; }
.cal-day.signed { background: #5B9FE8; color: #fff; font-weight: 600; }
.cal-day.today { border: 2px solid #5B9FE8; color: #5B9FE8; font-weight: 700; background: rgba(91,159,232,0.12); }
.cal-day.empty { visibility: hidden; }
</style>
