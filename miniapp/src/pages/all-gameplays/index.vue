<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">全部玩法</text>
      <view style="width:40px;" />
    </view>
    <view class="grid-body">
      <view v-for="g in gameplays" :key="g.name" class="gp-grid-card" @click="selectGameplay(g)">
        <view class="gp-img-wrap">
          <image :src="g.img" mode="aspectFill" class="gp-img" :class="{ loaded: g.imgLoaded }" @load="g.imgLoaded = true" />
        </view>
        <view v-if="g.hot" class="gp-hot">HOT</view>
        <view class="gp-grid-info">
          <text class="gp-grid-name">{{ g.name }}</text>
          <view class="gp-grid-meta">
            <text class="gp-grid-uses">🔥 {{ g.uses }}人用过</text>
            <text class="gp-grid-arrow">›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const gameplays = reactive([
  { name: '人物美颜', img: 'https://picsum.photos/seed/gp1/300/300', uses: '12.6w', hot: true, imgLoaded: false },
  { name: '证件照', img: 'https://picsum.photos/seed/gp2/300/300', uses: '8.3w', hot: true, imgLoaded: false },
  { name: '宠物头像', img: 'https://picsum.photos/seed/gp3/300/300', uses: '5.1w', hot: false, imgLoaded: false },
  { name: '古风国潮', img: 'https://picsum.photos/seed/gp4/300/300', uses: '4.8w', hot: false, imgLoaded: false },
  { name: 'Q版头像', img: 'https://picsum.photos/seed/gp5/300/300', uses: '6.2w', hot: true, imgLoaded: false },
  { name: 'Logo设计', img: 'https://picsum.photos/seed/gp6/300/300', uses: '3.9w', hot: false, imgLoaded: false },
  { name: '壁纸', img: 'https://picsum.photos/seed/gp7/300/300', uses: '7.5w', hot: false, imgLoaded: false },
  { name: '表情包', img: 'https://picsum.photos/seed/gp8/300/300', uses: '9.0w', hot: true, imgLoaded: false },
]);
const selectGameplay = (g: any) => {
  const idx = gameplays.findIndex(gp => gp.name === g.name);
  uni.$emit('applyGameplay', idx);
  uni.switchTab({ url: '/pages/create/index' });
  uni.showToast({ title: `已套用「${g.name}」模板`, icon: 'none' });
};
const goBack = () => uni.navigateBack();
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.grid-body { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 86px 16px 20px; }

// 网格卡片样式（白底，信息在图片下方）
.gp-grid-card {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(91, 159, 232, 0.14);
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  &:active { transform: scale(0.97); }
}
.gp-img-wrap { width: 100%; overflow: hidden; }
.gp-img {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  opacity: 0;
  transition: opacity 0.35s ease;
  &.loaded { opacity: 1; }
}
.gp-hot {
  position: absolute;
  top: 10px; right: 10px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: #fff;
  font-size: 9px; font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(238, 90, 36, 0.35);
  z-index: 2;
}
.gp-grid-info { padding: 10px; }
.gp-grid-name {
  font-size: 14px; font-weight: 700; color: #0E1F3A;
  display: block; margin-bottom: 4px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gp-grid-meta {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px; color: #8497B5;
}
.gp-grid-uses { font-size: 11px; color: #8497B5; }
.gp-grid-arrow { font-size: 14px; color: #8497B5; }
</style>
