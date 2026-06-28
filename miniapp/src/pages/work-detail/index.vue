<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">作品详情</text>
      <view style="width:40px;" />
    </view>
    <scroll-view scroll-y class="detail-scroll" :style="{ height: scrollH + 'px' }">
      <image :src="work.img" mode="widthFix" class="detail-img" />
      <view class="detail-body">
        <text class="detail-title">{{ work.title }}</text>
        <view class="author-row" @click="goUserProfile">
          <view class="author-avatar"><text class="author-avatar-text">星</text></view>
          <view class="author-info">
            <text class="author-name">星辰大海</text>
            <text class="author-time">2小时前</text>
          </view>
          <view class="follow-btn">+ 关注</view>
        </view>
        <text class="detail-desc">赛博朋克风格的夜晚城市，霓虹灯光映照在雨后的街道上，充满未来感的建筑与飞行汽车穿梭其中。</text>
        <view class="detail-tags">
          <text class="detail-tag">赛博朋克</text>
          <text class="detail-tag">GPT Image 2</text>
          <text class="detail-tag">3:4</text>
        </view>
        <view class="prompt-box">
          <text class="prompt-label">提示词</text>
          <text class="prompt-text">cyberpunk city at night, neon lights, rain, reflective streets, ultra detailed</text>
        </view>
        <view class="action-row">
          <view class="action-btn" @click="toggleLike">
            <text class="action-icon" :style="{ color: liked ? '#FFA8B8' : '#8497B5' }">{{ liked ? '♥' : '♡' }}</text>
            <text class="action-num" :style="{ color: liked ? '#FFA8B8' : '#8497B5' }">{{ work.likes }}</text>
          </view>
          <view class="action-btn">
            <text class="action-icon" style="color:#FFE08A">★</text>
            <text class="action-num">{{ work.favorites }}</text>
          </view>
          <view class="action-btn">
            <text class="action-icon" style="color:#6FD4B0">↻</text>
            <text class="action-num">{{ work.remakes }}</text>
          </view>
          <view style="flex:1" />
          <view class="action-btn share-btn" @click="share">
            <text class="action-icon" style="color:#5B9FE8">↗</text>
            <text class="action-num" style="color:#5B9FE8">分享</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const liked = ref(false);
const work = ref({ img: 'https://picsum.photos/seed/w1/600/840', title: '霓虹都市', likes: 328, favorites: 92, remakes: 45 });
const toggleLike = () => { liked.value = !liked.value; work.value.likes += liked.value ? 1 : -1; };
const goBack = () => uni.navigateBack();
const goUserProfile = () => uni.showToast({ title: '用户主页开发中', icon: 'none' });
const share = () => uni.showToast({ title: '分享功能开发中', icon: 'none' });
onMounted(() => { scrollH.value = uni.getSystemInfoSync().windowHeight; });
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.detail-scroll { padding-top: 74px; }
.detail-img { width: 100%; display: block; }
.detail-body { padding: 16px; }
.detail-title { font-size: 20px; font-weight: 700; color: #0E1F3A; display: block; margin-bottom: 12px; }
.author-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.author-avatar { width: 40px; height: 40px; border-radius: 50%; background: #6FD4B0; display: flex; align-items: center; justify-content: center; }
.author-avatar-text { font-size: 16px; color: #fff; font-weight: 700; }
.author-info { flex: 1; }
.author-name { font-size: 14px; font-weight: 600; color: #0E1F3A; display: block; }
.author-time { font-size: 12px; color: #8497B5; }
.follow-btn { padding: 5px 14px; background: #5B9FE8; color: #fff; font-size: 12px; font-weight: 600; border-radius: 999px; }
.detail-desc { font-size: 14px; color: #445876; line-height: 1.6; display: block; margin-bottom: 12px; }
.detail-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.detail-tag { padding: 4px 10px; background: rgba(91,159,232,0.12); color: #3B7PC8; font-size: 11px; border-radius: 999px; }
.prompt-box { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 14px; border: 1px solid rgba(91,159,232,0.14); }
.prompt-label { font-size: 12px; font-weight: 600; color: #8497B5; display: block; margin-bottom: 6px; }
.prompt-text { font-size: 13px; color: #445876; line-height: 1.5; }
.action-row { display: flex; align-items: center; gap: 16px; padding-top: 14px; border-top: 0.5px solid rgba(91,159,232,0.14); }
.action-btn { display: flex; align-items: center; gap: 4px; }
.action-icon { font-size: 22px; }
.action-num { font-size: 14px; font-weight: 600; color: #8497B5; }
.share-btn { padding: 6px 14px; background: rgba(91,159,232,0.12); border-radius: 999px; }
</style>
