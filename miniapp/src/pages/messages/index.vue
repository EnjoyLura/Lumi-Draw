<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">消息</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view v-for="cat in categories" :key="cat.key" class="msg-card" @click="goDetail(cat.key)">
        <view class="msg-icon" :style="{ background: cat.gradient }">
          <text class="msg-icon-text">{{ cat.icon }}</text>
        </view>
        <view class="msg-content">
          <view class="msg-top-row">
            <text class="msg-title">{{ cat.title }}</text>
            <text class="msg-time">{{ cat.time }}</text>
          </view>
          <view class="msg-bottom-row">
            <text class="msg-preview">{{ cat.preview }}</text>
            <view v-if="cat.unread > 0" class="msg-badge">{{ cat.unread }}</view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const categories = [
  { key: 'like', title: '点赞', icon: '❤', gradient: 'linear-gradient(135deg,#FFB3C1,#FF8FA3)', preview: '月光如水 赞了你的作品「霓虹都市」', time: '2分钟前', unread: 3 },
  { key: 'favorite', title: '收藏', icon: '⭐', gradient: 'linear-gradient(135deg,#A8D8F0,#7CC4E8)', preview: '风之绘师 收藏了你的作品「古风少女」', time: '30分钟前', unread: 2 },
  { key: 'remake', title: '同款生成', icon: '✦', gradient: 'linear-gradient(135deg,#A3E4CC,#7DD4B0)', preview: '月光如水 使用了你的提示词', time: '3小时前', unread: 1 },
  { key: 'follow', title: '新粉丝', icon: '👤', gradient: 'linear-gradient(135deg,#FFD4A8,#FFC088)', preview: '星辰大海 关注了你', time: '5小时前', unread: 1 },
  { key: 'system', title: '系统通知', icon: '🔔', gradient: 'linear-gradient(135deg,#B4C8F5,#96B0E8)', preview: '每日签到 +10 积分已到账', time: '昨天', unread: 0 },
  { key: 'service', title: '官方客服', icon: '💬', gradient: 'linear-gradient(135deg,#C8B5E8,#B09DD8)', preview: '感谢使用Lumi-Draw', time: '3天前', unread: 0 },
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
.page-scroll { padding-top: 90px; padding-left: 16px; padding-right: 16px; }

.msg-card {
  background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14);
  padding: 14px 16px; margin-bottom: 10px;
  display: flex; align-items: center; gap: 14px;
  transition: transform 0.2s;
  &:active { transform: scale(0.98); }
}
.msg-icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.msg-icon-text { font-size: 22px; }
.msg-content { flex: 1; min-width: 0; }
.msg-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
.msg-title { font-size: 15px; font-weight: 700; color: #0E1F3A; }
.msg-time { font-size: 12px; color: #8497B5; flex-shrink: 0; }
.msg-bottom-row { display: flex; align-items: center; gap: 8px; }
.msg-preview { flex: 1; font-size: 13px; color: #445876; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-badge {
  min-width: 18px; height: 18px; border-radius: 9px;
  background: #FF4D6D; color: #fff; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px; flex-shrink: 0;
}
</style>
