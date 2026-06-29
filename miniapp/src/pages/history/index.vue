<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">浏览记录</text>
      <view style="width:40px;" />
    </view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="clear-row">
        <view class="clear-btn" @click="clearAll">清空记录</view>
      </view>

      <view v-if="!cleared" class="history-content">
        <text class="section-title">今天</text>
        <view class="history-grid">
          <view v-for="w in todayWorks" :key="w.id" class="history-card" @click="goDetail(w)">
            <view class="history-img-wrap">
              <image :src="w.img" mode="aspectFill" class="history-img" />
            </view>
          </view>
        </view>

        <text class="section-title">昨天</text>
        <view class="history-grid">
          <view v-for="w in yesterdayWorks" :key="w.id" class="history-card" @click="goDetail(w)">
            <view class="history-img-wrap">
              <image :src="w.img" mode="aspectFill" class="history-img" />
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <view class="empty-icon">🕐</view>
        <text class="empty-text">暂无浏览记录</text>
        <text class="empty-sub">去广场逛逛，发现更多精彩作品</text>
        <view class="empty-btn" @click="goPlaza">去逛逛</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const cleared = ref(false);

const todayWorks = [
  { id: 1, img: 'https://picsum.photos/seed/w1/300/300' },
  { id: 2, img: 'https://picsum.photos/seed/w2/300/300' },
  { id: 3, img: 'https://picsum.photos/seed/w3/300/300' },
  { id: 4, img: 'https://picsum.photos/seed/w4/300/300' },
  { id: 5, img: 'https://picsum.photos/seed/w5/300/300' },
  { id: 6, img: 'https://picsum.photos/seed/w6/300/300' },
];
const yesterdayWorks = [
  { id: 7, img: 'https://picsum.photos/seed/w7/300/300' },
  { id: 8, img: 'https://picsum.photos/seed/w8/300/300' },
  { id: 9, img: 'https://picsum.photos/seed/w9/300/300' },
];

const clearAll = () => {
  cleared.value = true;
  uni.showToast({ title: '已清空浏览记录', icon: 'none' });
};
const goDetail = (w: any) => uni.navigateTo({ url: '/pages/work-detail/index' });
const goPlaza = () => uni.switchTab({ url: '/pages/home/index' });
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
.page-scroll { padding-top: 90px; }

.clear-row { display: flex; justify-content: flex-end; padding: 0 16px 8px; }
.clear-btn { font-size: 12px; font-weight: 600; color: #8497B5; padding: 6px 14px; border-radius: 10px; }

.history-content { padding: 0 16px; }
.section-title { font-size: 18px; font-weight: 700; color: #0E1F3A; display: block; margin-bottom: 12px; }
.history-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.history-card {
  background: #fff; border-radius: 14px; border: 1px solid rgba(91,159,232,0.14);
  overflow: hidden; cursor: pointer;
  &:active { transform: scale(0.97); }
}
.history-img-wrap {
  width: 100%; padding-bottom: 100%; position: relative; overflow: hidden;
}
.history-img {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
}

// 空状态
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; gap: 8px; }
.empty-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(91,159,232,0.12); display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 4px; }
.empty-text { font-size: 14px; color: #8497B5; }
.empty-sub { font-size: 12px; color: #8497B5; }
.empty-btn { margin-top: 8px; padding: 6px 14px; background: rgba(91,159,232,0.12); color: #3B7FC8; font-size: 12px; font-weight: 600; border-radius: 10px; }
</style>
