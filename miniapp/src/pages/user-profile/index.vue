<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">用户主页</text>
      <view style="width:40px;" />
    </view>
    <scroll-view scroll-y class="profile-scroll" :style="{ height: scrollH + 'px' }">
      <view class="profile-header">
        <view class="user-row">
          <view class="user-avatar"><text class="user-avatar-text">星</text></view>
          <view class="user-info">
            <text class="user-name">星辰大海</text>
            <text class="user-id">ID: LUMI0002</text>
          </view>
          <view class="follow-btn" @click="toggleFollow">{{ following ? '已关注' : '+ 关注' }}</view>
        </view>
        <text class="user-bio">探索AI的无限可能</text>
        <view class="stats-row">
          <view class="stat-item"><text class="stat-num">36</text><text class="stat-label">作品</text></view>
          <view class="stat-item"><text class="stat-num" style="color:#5B9FE8">215</text><text class="stat-label">粉丝</text></view>
          <view class="stat-item"><text class="stat-num" style="color:#B8A5E3">890</text><text class="stat-label">获赞</text></view>
        </view>
      </view>
      <view class="waterfall-wrap">
        <view class="waterfall">
          <view v-for="w in works.filter((_,i)=>i%2===0)" :key="w.id" class="wf-item">
            <view class="wf-card"><image :src="w.img" mode="widthFix" class="wf-img" /><view class="wf-info"><text class="wf-title">{{ w.title }}</text></view></view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in works.filter((_,i)=>i%2===1)" :key="w.id" class="wf-item">
            <view class="wf-card"><image :src="w.img" mode="widthFix" class="wf-img" /><view class="wf-info"><text class="wf-title">{{ w.title }}</text></view></view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const following = ref(false);
const toggleFollow = () => { following.value = !following.value; uni.showToast({ title: following.value ? '已关注' : '已取消关注', icon: 'none' }); };
const goBack = () => uni.navigateBack();
const works = [
  { id: 1, img: 'https://picsum.photos/seed/w1/300/420', title: '霓虹都市' },
  { id: 6, img: 'https://picsum.photos/seed/w6/300/225', title: '赛博精灵' },
  { id: 9, img: 'https://picsum.photos/seed/w9/300/530', title: '暗黑天使' },
  { id: 10, img: 'https://picsum.photos/seed/w10/300/225', title: '蒸汽城市' },
];
onMounted(() => { scrollH.value = uni.getSystemInfoSync().windowHeight - 80; });
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.profile-scroll { padding-top: 74px; }
.profile-header { padding: 16px; }
.user-row { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
.user-avatar { width: 64px; height: 64px; border-radius: 50%; background: #6FD4B0; display: flex; align-items: center; justify-content: center; }
.user-avatar-text { font-size: 24px; color: #fff; font-weight: 700; }
.user-info { flex: 1; }
.user-name { font-size: 18px; font-weight: 700; color: #0E1F3A; display: block; }
.user-id { font-size: 13px; color: #8497B5; }
.follow-btn { padding: 6px 18px; background: #5B9FE8; color: #fff; font-size: 13px; font-weight: 600; border-radius: 999px; }
.user-bio { font-size: 14px; color: #445876; margin-bottom: 14px; display: block; }
.stats-row { display: flex; gap: 28px; }
.stat-item { text-align: center; }
.stat-num { font-size: 18px; font-weight: 700; color: #FFA8B8; }
.stat-label { font-size: 13px; color: #8497B5; margin-left: 4px; }
.waterfall-wrap { padding: 0 12px; display: flex; gap: 8px; }
.waterfall { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.wf-card { background: #fff; border: 1px solid rgba(91,159,232,0.14); border-radius: 16px; overflow: hidden; }
.wf-img { width: 100%; display: block; }
.wf-info { padding: 6px 8px; }
.wf-title { font-size: 12px; font-weight: 600; color: #0E1F3A; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
