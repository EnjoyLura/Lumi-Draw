<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">作品详情</text>
      <view style="width:40px;" />
    </view>

    <!-- 可滚动内容 -->
    <scroll-view scroll-y class="detail-scroll">
      <!-- 作品图片 -->
      <image :src="work.img" mode="aspectFill" class="detail-img" :class="{ loaded: imgLoaded }" @load="imgLoaded = true" />

      <view class="detail-body">
        <!-- 作者行 -->
        <view class="author-row" @click="goUserProfile">
          <view class="author-avatar" :style="{ background: author.color }">
            <text class="author-avatar-text">{{ author.avatar }}</text>
          </view>
          <view class="author-info">
            <text class="author-name">{{ author.name }}</text>
            <text class="author-sub">{{ author.works }}作品 · {{ author.likes }}获赞</text>
          </view>
          <view :class="['follow-btn', { followed: followed }]" @click.stop="toggleFollow">{{ followed ? '已关注' : '+ 关注' }}</view>
        </view>

        <!-- 标题 -->
        <text class="detail-title">{{ work.title }}</text>

        <!-- 描述 -->
        <text class="detail-desc">{{ work.desc }}</text>

        <!-- 标签 -->
        <view class="detail-tags">
          <text class="detail-tag tag-accent">{{ work.model }}</text>
          <text class="detail-tag tag-mint">{{ work.ratio }}</text>
          <text class="detail-tag tag-lavender">{{ work.style }}</text>
          <text v-for="t in work.tags" :key="t" class="detail-tag tag-peach">{{ t }}</text>
        </view>

        <!-- 提示词 -->
        <view class="prompt-box">
          <view class="prompt-header">
            <text class="prompt-label">提示词</text>
            <view class="prompt-copy" @click="copyPrompt">
              <text class="prompt-copy-text">复制</text>
            </view>
          </view>
          <text class="prompt-text">{{ work.prompt }}</text>
        </view>

        <!-- 时间 -->
        <text class="detail-time">生成于 {{ work.time }}</text>

        <!-- 数据统计 -->
        <view class="stats-row">
          <view class="stat-col">
            <text class="stat-num stat-rose">{{ work.likes }}</text>
            <text class="stat-label">点赞</text>
          </view>
          <view class="stat-col">
            <text class="stat-num stat-accent">{{ work.favorites }}</text>
            <text class="stat-label">收藏</text>
          </view>
          <view class="stat-col">
            <text class="stat-num stat-lavender">{{ work.remakes }}</text>
            <text class="stat-label">同款</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bar-action" @click="toggleLike">
        <text class="bar-icon" :style="{ color: liked ? '#FFA8B8' : '#8497B5' }">{{ liked ? '♥' : '♡' }}</text>
        <text class="bar-num" :style="{ color: liked ? '#FFA8B8' : '#8497B5' }">{{ work.likes }}</text>
      </view>
      <view class="bar-action" @click="toggleFav">
        <text class="bar-icon" :style="{ color: faved ? '#FFE08A' : '#8497B5' }">{{ faved ? '★' : '☆' }}</text>
        <text class="bar-num" :style="{ color: faved ? '#FFE08A' : '#8497B5' }">{{ work.favorites }}</text>
      </view>
      <view class="bar-btn-main" @click="remake">
        <text class="bar-btn-text">✦ 一键同款</text>
      </view>
    </view>

    <!-- 取消关注确认弹窗 -->
    <view v-if="showUnfollowDialog" class="dialog-overlay" @click="showUnfollowDialog = false">
      <view class="dialog-box" @click.stop>
        <view class="dialog-icon-wrap">
          <text class="dialog-icon">♡</text>
        </view>
        <text class="dialog-title">取消关注</text>
        <text class="dialog-msg">确定要取消关注该用户吗？</text>
        <view class="dialog-actions">
          <view class="dialog-btn dialog-cancel" @click="showUnfollowDialog = false">再想想</view>
          <view class="dialog-btn dialog-confirm" @click="confirmUnfollow">取消关注</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const imgLoaded = ref(false);
const liked = ref(false);
const faved = ref(false);
const followed = ref(false);
const showUnfollowDialog = ref(false);

const author = ref({
  name: '星辰大海',
  avatar: '星',
  color: '#6FD4B0',
  works: 36,
  likes: '890',
});

const work = ref({
  img: 'https://picsum.photos/seed/w1/600/840',
  title: '霓虹都市',
  desc: '赛博朋克风格的夜晚城市，霓虹灯光映照在雨后的街道上，充满未来感的建筑与飞行汽车穿梭其中。',
  model: 'GPT Image 2',
  ratio: '3:4',
  style: '赛博朋克',
  tags: ['夜景', '城市'],
  prompt: 'cyberpunk city at night, neon lights, rain, reflective streets, flying cars, ultra detailed, cinematic lighting',
  time: '2025-06-28 14:30',
  likes: 328,
  favorites: 92,
  remakes: 45,
});

const toggleLike = () => {
  liked.value = !liked.value;
  work.value.likes += liked.value ? 1 : -1;
};
const toggleFav = () => {
  faved.value = !faved.value;
  work.value.favorites += faved.value ? 1 : -1;
};
const toggleFollow = () => {
  if (followed.value) {
    // 已关注 → 弹出确认弹窗
    showUnfollowDialog.value = true;
  } else {
    followed.value = true;
    uni.showToast({ title: '关注成功', icon: 'none' });
  }
};
const confirmUnfollow = () => {
  followed.value = false;
  showUnfollowDialog.value = false;
  uni.showToast({ title: '已取消关注', icon: 'none' });
};
const copyPrompt = () => {
  uni.setClipboardData({ data: work.value.prompt });
  uni.showToast({ title: '提示词已复制', icon: 'none' });
};
const remake = () => {
  uni.switchTab({ url: '/pages/create/index' });
  uni.showToast({ title: '已带入提示词和参数', icon: 'none' });
};
const goBack = () => uni.navigateBack();
const goUserProfile = () => uni.navigateTo({ url: '/pages/user-profile/index' });
</script>

<style lang="scss" scoped>
.sub-page {
  min-height: 100vh; background: #EEF4FC;
  display: flex; flex-direction: column;
  position: relative;
}
.glass-header {
  position: fixed; top: 0; left: 0; right: 0; height: 74px;
  background: rgba(255,255,255,0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14);
}
.sub-nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 50px; padding: 0 12px; padding-top: 24px;
  position: fixed; top: 0; left: 0; right: 0; z-index: 120;
}
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }

// 滚动区
.detail-scroll {
  flex: 1; padding-top: 74px; overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 80px;
}

// 图片
.detail-img {
  width: 100%; height: 400px;
  display: block;
  opacity: 0; transition: opacity 0.35s ease;
  &.loaded { opacity: 1; }
}

// 内容区
.detail-body { padding: 16px; }

// 作者行
.author-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.author-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.author-avatar-text { font-size: 16px; color: #fff; font-weight: 700; }
.author-info { flex: 1; min-width: 0; }
.author-name { font-size: 15px; font-weight: 700; color: #0E1F3A; display: block; }
.author-sub { font-size: 11px; color: #8497B5; }
.follow-btn {
  padding: 6px 16px; border-radius: 999px;
  font-size: 13px; font-weight: 600;
  background: #5B9FE8; color: #fff;
  flex-shrink: 0; transition: all 0.3s;
  &.followed {
    background: #E1EBF8; color: #8497B5;
  }
}

// 标题
.detail-title {
  font-size: 18px; font-weight: 700; color: #0E1F3A;
  display: block; margin-bottom: 8px;
}

// 描述
.detail-desc {
  font-size: 14px; color: #445876; line-height: 1.5;
  display: block; margin-bottom: 14px;
}

// 标签
.detail-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.detail-tag {
  padding: 3px 10px; font-size: 11px; font-weight: 600; border-radius: 999px;
}
.tag-accent { background: rgba(91,159,232,0.12); color: #3B7FC8; }
.tag-mint { background: rgba(111,212,176,0.16); color: #6FD4B0; }
.tag-lavender { background: rgba(184,165,227,0.2); color: #8470C7; }
.tag-peach { background: rgba(255,181,154,0.2); color: #E07A5A; }

// 提示词
.prompt-box {
  background: #fff; border-radius: 20px; padding: 12px;
  margin-bottom: 14px; border: 1px solid rgba(91,159,232,0.14);
}
.prompt-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.prompt-label { font-size: 13px; font-weight: 600; color: #8497B5; }
.prompt-copy {
  padding: 2px 8px; cursor: pointer;
}
.prompt-copy-text { font-size: 12px; font-weight: 600; color: #5B9FE8; }
.prompt-text { font-size: 13px; color: #0E1F3A; line-height: 1.6; }

// 时间
.detail-time {
  font-size: 12px; color: #8497B5; display: block; margin-bottom: 14px;
}

// 数据统计
.stats-row {
  display: flex; gap: 16px; padding: 12px 0;
  border-top: 0.5px solid rgba(91,159,232,0.14);
  border-bottom: 0.5px solid rgba(91,159,232,0.14);
}
.stat-col { text-align: center; flex: 1; }
.stat-num { font-size: 18px; font-weight: 700; display: block; }
.stat-rose { color: #FFA8B8; }
.stat-accent { color: #5B9FE8; }
.stat-lavender { color: #B8A5E3; }
.stat-label { font-size: 11px; color: #8497B5; margin-top: 2px; }

// 底部操作栏
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; gap: 16px;
  padding: 14px 16px 30px 16px;
  background: rgba(255,255,255,0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 0.5px solid rgba(91,159,232,0.14);
  box-shadow: 0 -4px 20px rgba(60,120,200,0.06);
  z-index: 80;
}
.bar-action {
  display: flex; align-items: center; gap: 4px; cursor: pointer;
}
.bar-icon {
  font-size: 28px; transition: all 0.3s;
}
.bar-num { font-size: 14px; font-weight: 600; }
.bar-btn-main {
  flex: 1; margin-left: auto;
  background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%);
  color: #fff; border-radius: 14px;
  padding: 12px 0; text-align: center;
  box-shadow: 0 4px 14px rgba(91,159,232,0.35);
  &:active { transform: scale(0.96); }
}
.bar-btn-text { font-size: 14px; font-weight: 700; }

// 确认弹窗
.dialog-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.dialog-box {
  width: 280px; background: #fff; border-radius: 20px;
  padding: 24px 20px 16px; text-align: center;
  box-shadow: 0 24px 56px rgba(60, 120, 200, 0.16), 0 8px 16px rgba(60, 120, 200, 0.08);
  animation: dialogIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dialogIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.dialog-icon-wrap {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(255, 181, 154, 0.2);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
}
.dialog-icon { font-size: 24px; color: #FFB59A; }
.dialog-title { font-size: 17px; font-weight: 700; color: #0E1F3A; display: block; margin-bottom: 8px; }
.dialog-msg { font-size: 14px; color: #445876; display: block; margin-bottom: 20px; }
.dialog-actions { display: flex; gap: 10px; }
.dialog-btn {
  flex: 1; padding: 10px 0; border-radius: 12px;
  font-size: 14px; font-weight: 600; text-align: center;
}
.dialog-cancel { background: #E1EBF8; color: #445876; }
.dialog-confirm { background: #FFA8B8; color: #fff; }
</style>
