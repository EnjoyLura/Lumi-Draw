<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">全部玩法</text>
      <view style="width:40px;" />
    </view>
    <view class="grid-body">
      <view v-for="g in gameplays" :key="g.name" class="gp-card" @click="selectGameplay(g)">
        <image :src="g.img" mode="aspectFill" class="gp-img" />
        <view class="gp-overlay" />
        <view v-if="g.hot" class="gp-hot">HOT</view>
        <view class="gp-info">
          <text class="gp-name">{{ g.name }}</text>
          <text class="gp-uses">🔥 {{ g.uses }}人用过</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const gameplays = [
  { name: '人物美颜', img: 'https://picsum.photos/seed/gp1/300/300', uses: '12.6w', hot: true },
  { name: '证件照', img: 'https://picsum.photos/seed/gp2/300/300', uses: '8.3w', hot: true },
  { name: '宠物头像', img: 'https://picsum.photos/seed/gp3/300/300', uses: '5.1w', hot: false },
  { name: '古风国潮', img: 'https://picsum.photos/seed/gp4/300/300', uses: '4.8w', hot: false },
  { name: 'Q版头像', img: 'https://picsum.photos/seed/gp5/300/300', uses: '6.2w', hot: true },
  { name: 'Logo设计', img: 'https://picsum.photos/seed/gp6/300/300', uses: '3.9w', hot: false },
  { name: '壁纸', img: 'https://picsum.photos/seed/gp7/300/300', uses: '7.5w', hot: false },
  { name: '表情包', img: 'https://picsum.photos/seed/gp8/300/300', uses: '9.0w', hot: true },
];
const selectGameplay = (g: any) => {
  uni.showToast({ title: `已套用「${g.name}」模板`, icon: 'none' });
  setTimeout(() => { uni.switchTab({ url: '/pages/create/index' }); }, 800);
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
.gp-card { position: relative; border-radius: 14px; overflow: hidden; background: #fff; border: 1px solid rgba(91,159,232,0.14); &:active { transform: scale(0.97); } }
.gp-img { width: 100%; aspect-ratio: 1; }
.gp-overlay { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 60%); pointer-events: none; }
.gp-hot { position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 6px; box-shadow: 0 2px 8px rgba(238,90,36,0.35); }
.gp-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; }
.gp-name { font-size: 14px; font-weight: 700; color: #fff; display: block; margin-bottom: 2px; }
.gp-uses { font-size: 11px; color: rgba(255,255,255,0.75); }
</style>
