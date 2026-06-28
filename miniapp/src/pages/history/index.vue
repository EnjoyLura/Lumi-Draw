<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">浏览记录</text><view class="nav-right"><text class="clear-btn" @click="clearAll">清空记录</text></view></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view v-for="item in history" :key="item.id" class="history-item" @click="goDetail(item)">
        <image :src="item.img" mode="aspectFill" class="history-img" />
        <view class="history-info">
          <text class="history-title">{{ item.title }}</text>
          <text class="history-meta">{{ item.author }} · {{ item.time }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const history = [
  { id: 1, img: 'https://picsum.photos/seed/w1/100/100', title: '霓虹都市', author: '星辰大海', time: '2小时前' },
  { id: 2, img: 'https://picsum.photos/seed/w5/100/100', title: '古风少女', author: '云端造梦师', time: '5小时前' },
  { id: 3, img: 'https://picsum.photos/seed/w7/100/100', title: '水彩猫咪', author: '风之绘师', time: '昨天' },
  { id: 4, img: 'https://picsum.photos/seed/w9/100/100', title: '暗黑天使', author: '星辰大海', time: '2天前' },
  { id: 5, img: 'https://picsum.photos/seed/w3/100/100', title: '少女与猫', author: '云端造梦师', time: '3天前' },
];
const clearAll = () => { history.splice(0); uni.showToast({ title: '已清空', icon: 'none' }); };
const goDetail = (item: any) => uni.navigateTo({ url: '/pages/work-detail/index' });
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
.nav-right { width: 80px; text-align: right; }
.clear-btn { font-size: 13px; color: #8497B5; }
.page-scroll { padding-top: 90px; }
.history-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
.history-item:active { background: rgba(91,159,232,0.05); }
.history-img { width: 60px; height: 60px; border-radius: 12px; flex-shrink: 0; }
.history-info { flex: 1; }
.history-title { font-size: 14px; font-weight: 600; color: #0E1F3A; display: block; }
.history-meta { font-size: 12px; color: #8497B5; margin-top: 4px; }
</style>
