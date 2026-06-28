<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">消息</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view v-for="cat in categories" :key="cat.key" class="msg-category" @click="goDetail(cat.key)">
        <view class="msg-cat-icon" :style="{ background: cat.bgColor }"><text style="font-size:20px;">{{ cat.icon }}</text></view>
        <view class="msg-cat-info">
          <text class="msg-cat-name">{{ cat.name }}</text>
          <text class="msg-cat-preview">{{ cat.preview }}</text>
        </view>
        <view class="msg-cat-right">
          <text class="msg-cat-time">{{ cat.time }}</text>
          <view v-if="cat.unread > 0" class="msg-cat-badge">{{ cat.unread }}</view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const categories = [
  { key: 'like', name: '点赞通知', icon: '❤', bgColor: 'rgba(255,168,184,0.2)', preview: '月光如水 赞了你的作品「霓虹都市」', time: '2分钟前', unread: 3 },
  { key: 'favorite', name: '收藏通知', icon: '⭐', bgColor: 'rgba(255,224,138,0.24)', preview: '风之绘师 收藏了你的作品「古风少女」', time: '30分钟前', unread: 2 },
  { key: 'follow', name: '新增关注', icon: '👤', bgColor: 'rgba(255,181,154,0.2)', preview: '星辰大海 关注了你', time: '5小时前', unread: 1 },
  { key: 'remake', name: '同款创作', icon: '↻', bgColor: 'rgba(111,212,176,0.16)', preview: '月光如水 使用了你的提示词', time: '3小时前', unread: 1 },
  { key: 'system', name: '系统通知', icon: '🔔', bgColor: 'rgba(91,159,232,0.12)', preview: '每日签到 +10 积分已到账', time: '昨天', unread: 0 },
  { key: 'service', name: '客服消息', icon: '💬', bgColor: 'rgba(184,165,227,0.2)', preview: '感谢使用Lumi-Draw', time: '3天前', unread: 0 },
];
const goDetail = (key: string) => uni.navigateTo({ url: `/pages/msg-detail/index?type=${key}` });
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
.msg-category { display: flex; align-items: center; gap: 12px; padding: 14px 16px; position: relative; &:active { background: rgba(91,159,232,0.05); } & + .msg-category::before { content: ''; position: absolute; top: 0; left: 60px; right: 16px; height: 0.5px; background: rgba(91,159,232,0.08); } }
.msg-cat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.msg-cat-info { flex: 1; min-width: 0; }
.msg-cat-name { font-size: 15px; font-weight: 600; color: #0E1F3A; display: block; }
.msg-cat-preview { font-size: 12px; color: #8497B5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; margin-top: 2px; }
.msg-cat-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.msg-cat-time { font-size: 11px; color: #8497B5; }
.msg-cat-badge { min-width: 18px; height: 18px; padding: 0 5px; background: #FFA8B8; color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
</style>
