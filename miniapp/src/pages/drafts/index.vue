<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">草稿箱</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="waterfall-wrap">
        <view class="waterfall">
          <view v-for="w in drafts.filter((_,i)=>i%2===0)" :key="w.id" class="wf-item" @click="goEdit(w)">
            <view class="wf-card">
              <image :src="w.img" mode="widthFix" class="wf-img" />
              <view class="wf-info"><text class="wf-title">{{ w.prompt }}</text></view>
              <view class="wf-draft-badge">草稿</view>
            </view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in drafts.filter((_,i)=>i%2===1)" :key="w.id" class="wf-item" @click="goEdit(w)">
            <view class="wf-card">
              <image :src="w.img" mode="widthFix" class="wf-img" />
              <view class="wf-info"><text class="wf-title">{{ w.prompt }}</text></view>
              <view class="wf-draft-badge">草稿</view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const drafts = [
  { id: 13, img: 'https://picsum.photos/seed/w13/300/400', prompt: '花园里的可爱机器人' },
  { id: 14, img: 'https://picsum.photos/seed/w14/300/300', prompt: '发光蘑菇的魔法森林' },
  { id: 15, img: 'https://picsum.photos/seed/w15/300/530', prompt: '星空下的灯塔' },
  { id: 16, img: 'https://picsum.photos/seed/w16/300/225', prompt: '竹林深处的古寺' },
  { id: 17, img: 'https://picsum.photos/seed/w17/300/400', prompt: '赛博朋克风格的猫咪' },
  { id: 18, img: 'https://picsum.photos/seed/w18/300/300', prompt: '水墨风格的鲤鱼跃龙门' },
  { id: 19, img: 'https://picsum.photos/seed/w19/300/400', prompt: '午后阳光下的咖啡馆' },
  { id: 20, img: 'https://picsum.photos/seed/w20/300/530', prompt: '二次元少女骑在巨龙上' },
];
const goEdit = (w: any) => uni.navigateTo({ url: '/pages/publish/index' });
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
.page-scroll { padding-top: 74px; }
.waterfall-wrap { padding: 0 12px; display: flex; gap: 8px; }
.waterfall { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.wf-card { background: #fff; border: 1px solid rgba(91,159,232,0.14); border-radius: 20px; overflow: hidden; position: relative; transition: transform 0.2s cubic-bezier(0.16,1,0.3,1); &:active { transform: scale(0.97); } }
.wf-img { width: 100%; display: block; }
.wf-info { padding: 6px 8px; }
.wf-title { font-size: 12px; font-weight: 600; color: #0E1F3A; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wf-draft-badge { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.85); color: #5B9FE8; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 8px; }
</style>
