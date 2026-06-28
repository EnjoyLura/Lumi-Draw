<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">举报</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <text class="section-label">请选择举报原因</text>
      <view class="reasons-list">
        <view v-for="r in reasons" :key="r" :class="['reason-item', { active: selectedReason === r }]" @click="selectedReason = r">
          <text class="reason-text">{{ r }}</text>
          <view :class="['reason-radio', { active: selectedReason === r }]" />
        </view>
      </view>
      <text class="section-label" style="margin-top:8px;">补充描述（选填）</text>
      <textarea class="form-textarea" v-model="desc" placeholder="请描述具体问题..." />
      <view class="submit-btn" @click="submit">提交举报</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const selectedReason = ref('');
const desc = ref('');
const reasons = ['垃圾广告', '色情低俗', '违法违规', '侵权盗版', '煽动仇恨', '虚假信息', '其他原因'];
const submit = () => {
  if (!selectedReason.value) { uni.showToast({ title: '请选择举报原因', icon: 'none' }); return; }
  uni.showToast({ title: '举报已提交', icon: 'success' });
  setTimeout(() => uni.navigateBack(), 1000);
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
.section-label { font-size: 15px; font-weight: 600; color: #0E1F3A; margin-bottom: 12px; display: block; }
.reasons-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.reason-item { display: flex; align-items: center; padding: 12px 14px; background: #fff; border-radius: 12px; border: 1.5px solid rgba(91,159,232,0.14); }
.reason-item.active { border-color: #5B9FE8; background: rgba(91,159,232,0.06); }
.reason-text { flex: 1; font-size: 14px; color: #0E1F3A; }
.reason-radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(91,159,232,0.32); flex-shrink: 0; }
.reason-radio.active { border-color: #5B9FE8; background: #5B9FE8; box-shadow: inset 0 0 0 3px #fff; }
.form-textarea { width: 100%; min-height: 80px; padding: 12px 14px; border-radius: 12px; background: #fff; font-size: 14px; color: #0E1F3A; resize: none; line-height: 1.6; box-sizing: border-box; border: 1px solid rgba(91,159,232,0.14); margin-bottom: 20px; }
.submit-btn { width: 100%; padding: 14px 0; text-align: center; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; font-size: 16px; font-weight: 700; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(91,159,232,0.35); }
.submit-btn:active { transform: scale(0.97); }
</style>
