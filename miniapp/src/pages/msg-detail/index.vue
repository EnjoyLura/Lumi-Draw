<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">消息详情</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view v-for="msg in messages" :key="msg.id" class="msg-item">
        <view class="msg-avatar" :style="{ background: msg.color }"><text class="msg-avatar-text">{{ msg.avatar }}</text></view>
        <view class="msg-body">
          <view class="msg-header"><text class="msg-name">{{ msg.name }}</text><text class="msg-time">{{ msg.time }}</text></view>
          <text class="msg-content">{{ msg.content }}</text>
        </view>
        <view v-if="msg.unread" class="msg-unread-dot" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const messages = [
  { id: 1, name: '月光如水', avatar: '月', color: '#FFB59A', content: '赞了你的作品「霓虹都市」', time: '2分钟前', unread: true },
  { id: 2, name: '风之绘师', avatar: '风', color: '#B8A5E3', content: '赞了你的作品「山水之间」', time: '1小时前', unread: true },
  { id: 3, name: '光影魔术', avatar: '光', color: '#FFE08A', content: '赞了你的作品「少女与猫」', time: '3小时前', unread: false },
  { id: 4, name: '星辰大海', avatar: '星', color: '#6FD4B0', content: '赞了你的作品「古风少女」', time: '昨天', unread: false },
  { id: 5, name: '月光如水', avatar: '月', color: '#FFB59A', content: '赞了你的作品「油画风景」', time: '2天前', unread: false },
];
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
.msg-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; position: relative; &:active { background: rgba(91,159,232,0.05); } }
.msg-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.msg-avatar-text { font-size: 16px; color: #fff; font-weight: 700; }
.msg-body { flex: 1; min-width: 0; }
.msg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.msg-name { font-size: 14px; font-weight: 600; color: #0E1F3A; }
.msg-time { font-size: 11px; color: #8497B5; }
.msg-content { font-size: 13px; color: #445876; }
.msg-unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #FFA8B8; flex-shrink: 0; margin-top: 6px; }
</style>
