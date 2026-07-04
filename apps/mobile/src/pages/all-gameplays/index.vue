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
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  border: 1px solid rgba(91, 159, 232, 0.14);
  border-radius: 7px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.gameplay-card:active {
  transform: scale(0.97);
}

.gameplay-img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
}

.gameplay-overlay {
  display: none;
}

.hot-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(238, 90, 36, 0.35);
  z-index: 2;
}

.gameplay-info {
  padding: 10px;
}

.gameplay-name {
  margin-bottom: 4px;
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gameplay-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--fg-muted);
}
</style>
