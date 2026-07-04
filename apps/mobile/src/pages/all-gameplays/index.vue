<script setup lang="ts">
import { gameplays, type Gameplay } from "../home/homeData";

function applyGameplay(gameplay: Gameplay) {
  uni.navigateTo({
    url: `/pages/create/index?gameplay=${encodeURIComponent(gameplay.name)}`
  });
}
</script>

<template>
  <view class="all-gameplays-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="grid">
        <view v-for="gameplay in gameplays" :key="gameplay.name" class="gameplay-card" @click="applyGameplay(gameplay)">
          <image class="gameplay-img" :src="gameplay.image" mode="aspectFill" />
          <view class="gameplay-overlay" />
          <view v-if="gameplay.hot" class="hot-badge">HOT</view>
          <view class="gameplay-info">
            <view class="gameplay-name">{{ gameplay.name }}</view>
            <view class="gameplay-meta">
              <text>♨ {{ gameplay.uses }}人用过</text>
              <text>›</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.all-gameplays-page {
  --bg-base: #eef4fc;
  --bg-soft: #e1ebf8;
  --fg-primary: #0e1f3a;
  --fg-muted: #8497b5;
  --accent: #5b9fe8;
  --peach: #ffb59a;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
  box-sizing: border-box;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar,
.page-scroll .uni-scroll-view::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 12px 16px 18px;
}

.gameplay-card {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(60, 120, 200, 0.08);
}

.gameplay-img {
  width: 100%;
  height: 100%;
}

.gameplay-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.58) 0%, transparent 62%);
}

.hot-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff7a59, var(--peach));
  border-radius: 999px;
}

.gameplay-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 10px;
}

.gameplay-name {
  margin-bottom: 3px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.gameplay-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.78);
}
</style>
