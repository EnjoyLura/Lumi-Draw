<template>
  <view class="page-home">
    <!-- 毛玻璃刘海层 -->
    <view class="glass-header" />
    <!-- 状态栏 + 导航刘海 -->
    <view class="status-bar">
      <text class="sb-time">9:41</text>
      <view class="sb-right">
        <text class="sb-icon">●●●●</text>
        <text class="sb-icon">▲</text>
        <text class="sb-battery">▮</text>
      </view>
    </view>
    <view class="nav-header">
      <text class="nav-title">绘光</text>
    </view>
    <!-- 微信胶囊 -->
    <view class="capsule">
      <view class="cap-btn">⋯</view>
      <view class="cap-divider" />
      <view class="cap-btn">✕</view>
    </view>

    <!-- 可滚动内容区 -->
    <scroll-view
      scroll-y
      class="content-scroll"
      :style="{ height: scrollHeight + 'px' }"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- Banner 轮播 -->
      <view class="banner-wrap">
        <view class="banner-box" @click="nextBanner" @touchstart="onBannerTouchStart" @touchend="onBannerTouchEnd">
          <view class="banner-track" :style="{ transform: `translateX(-${bannerIdx * 100}%)` }">
            <view v-for="(b, i) in banners" :key="i" class="banner-slide">
              <image :src="b.img" mode="aspectFill" class="banner-img" />
              <view class="banner-overlay">
                <text class="banner-title">{{ b.title }}</text>
              </view>
              <view class="banner-btn" @click.stop="goCreate">前往</view>
            </view>
          </view>
          <view class="banner-dots">
            <view v-for="(b, i) in banners" :key="i" class="banner-dot" :class="{ active: i === bannerIdx }" />
          </view>
        </view>
      </view>

      <!-- 热门玩法 -->
      <view class="section-header">
        <text class="section-title">热门玩法</text>
        <view class="section-more" @click="goAllGameplays">
          <text class="more-text">全部</text>
          <text class="more-arrow">›</text>
        </view>
      </view>
      <scroll-view scroll-x class="gameplay-scroll" :show-scrollbar="false">
        <view class="gameplay-list">
          <view v-for="(g, i) in gameplays" :key="i" class="gp-card" @click="selectGameplay(g)">
            <image :src="g.img" mode="aspectFill" class="gp-img" />
            <view class="gp-overlay" />
            <view v-if="g.hot" class="gp-hot">HOT</view>
            <view class="gp-info">
              <text class="gp-name">{{ g.name }}</text>
              <view class="gp-uses">
                <text class="gp-fire-icon">🔥</text>
                <text class="gp-uses-text">{{ g.uses }}人用过</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 精选作品 -->
      <view class="section-header">
        <text class="section-title">精选作品</text>
        <view class="home-tabs">
          <text :class="['home-tab', { active: homeTab === 'recommend' }]" @click="switchTab('recommend')">推荐</text>
          <text :class="['home-tab', { active: homeTab === 'new' }]" @click="switchTab('new')">最新</text>
        </view>
      </view>

      <!-- 瀑布流 (带动画) -->
      <!-- Tab切换loading -->
      <view v-if="tabLoading" class="tab-loading">
        <view class="tab-spinner" />
      </view>
      <view v-else class="waterfall-wrap" :class="{ 'wf-anim-left': animDir === 'left', 'wf-anim-right': animDir === 'right' }" :key="animKey">
        <view class="waterfall">
          <view v-for="w in leftColumn" :key="w.id" class="wf-item">
            <view class="wf-card">
              <view class="wf-img-wrap" @click="goWorkDetail(w)">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title || w.prompt?.substring(0, 20) || '未命名' }}</text>
                <view class="wf-meta">
                  <view class="wf-author" @click.stop="goUserProfile(w.userId)">
                    <view class="wf-avatar" :style="{ background: getUserColor(w.userId) }">
                      <text class="wf-avatar-text">{{ getUserAvatar(w.userId) }}</text>
                    </view>
                    <text class="wf-author-name">{{ getUserName(w.userId) }}</text>
                  </view>
                  <view class="wf-like" @click.stop="toggleLike(w)">
                    <text class="wf-like-icon" :class="{ 'like-bounce': w.bouncing }" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.liked ? '♥' : '♡' }}</text>
                    <text class="wf-like-num" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.likes }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in rightColumn" :key="w.id" class="wf-item">
            <view class="wf-card">
              <view class="wf-img-wrap" @click="goWorkDetail(w)">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title || w.prompt?.substring(0, 20) || '未命名' }}</text>
                <view class="wf-meta">
                  <view class="wf-author" @click.stop="goUserProfile(w.userId)">
                    <view class="wf-avatar" :style="{ background: getUserColor(w.userId) }">
                      <text class="wf-avatar-text">{{ getUserAvatar(w.userId) }}</text>
                    </view>
                    <text class="wf-author-name">{{ getUserName(w.userId) }}</text>
                  </view>
                  <view class="wf-like" @click.stop="toggleLike(w)">
                    <text class="wf-like-icon" :class="{ 'like-bounce': w.bouncing }" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.liked ? '♥' : '♡' }}</text>
                    <text class="wf-like-num" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.likes }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more">
        <view v-if="loading" class="load-spinner" />
        <text v-else class="load-text">{{ noMore ? '没有更多了' : '上拉加载更多' }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';

// Mock 数据
const banners = ref([
  { img: 'https://picsum.photos/seed/b1/700/300', title: '夏日创作季' },
  { img: 'https://picsum.photos/seed/b2/700/300', title: '新模型上线' },
  { img: 'https://picsum.photos/seed/b3/700/300', title: '会员特惠' },
  { img: 'https://picsum.photos/seed/b4/700/300', title: '社区精选' },
]);

const gameplays = ref([
  { name: '人物美颜', img: 'https://picsum.photos/seed/gp1/180/240', uses: '12.6w', hot: true },
  { name: '证件照', img: 'https://picsum.photos/seed/gp2/180/240', uses: '8.3w', hot: true },
  { name: '宠物头像', img: 'https://picsum.photos/seed/gp3/180/240', uses: '5.1w', hot: false },
  { name: '古风国潮', img: 'https://picsum.photos/seed/gp4/180/240', uses: '4.8w', hot: false },
  { name: 'Q版头像', img: 'https://picsum.photos/seed/gp5/180/240', uses: '6.2w', hot: true },
  { name: 'Logo设计', img: 'https://picsum.photos/seed/gp6/180/240', uses: '3.9w', hot: false },
  { name: '壁纸', img: 'https://picsum.photos/seed/gp7/180/240', uses: '7.5w', hot: false },
  { name: '表情包', img: 'https://picsum.photos/seed/gp8/180/240', uses: '9.0w', hot: true },
]);

interface Work {
  id: number;
  img: string;
  userId: number;
  title: string;
  prompt: string;
  likes: number;
  liked: boolean;
  bouncing: boolean;
}

const users = [
  { id: 1, name: '云端造梦师', avatar: '梦', color: '#5B9FE8' },
  { id: 2, name: '星辰大海', avatar: '星', color: '#6FD4B0' },
  { id: 3, name: '月光如水', avatar: '月', color: '#FFB59A' },
  { id: 4, name: '风之绘师', avatar: '风', color: '#B8A5E3' },
  { id: 5, name: '光影魔术', avatar: '光', color: '#FFE08A' },
];

const allWorks: Work[] = [
  { id: 1, img: 'https://picsum.photos/seed/w1/300/420', userId: 2, title: '霓虹都市', prompt: '', likes: 328, liked: false, bouncing: false },
  { id: 2, img: 'https://picsum.photos/seed/w2/300/225', userId: 3, title: '山水之间', prompt: '', likes: 512, liked: false, bouncing: false },
  { id: 3, img: 'https://picsum.photos/seed/w3/300/450', userId: 1, title: '少女与猫', prompt: '', likes: 680, liked: false, bouncing: false },
  { id: 4, img: 'https://picsum.photos/seed/w4/300/300', userId: 5, title: '抽象梦境', prompt: '', likes: 234, liked: false, bouncing: false },
  { id: 5, img: 'https://picsum.photos/seed/w5/300/530', userId: 1, title: '古风少女', prompt: '', likes: 892, liked: false, bouncing: false },
  { id: 6, img: 'https://picsum.photos/seed/w6/300/225', userId: 3, title: '赛博精灵', prompt: '', likes: 445, liked: false, bouncing: false },
  { id: 7, img: 'https://picsum.photos/seed/w7/300/400', userId: 4, title: '水彩猫咪', prompt: '', likes: 567, liked: false, bouncing: false },
  { id: 8, img: 'https://picsum.photos/seed/w8/300/300', userId: 5, title: '极简几何', prompt: '', likes: 189, liked: false, bouncing: false },
  { id: 9, img: 'https://picsum.photos/seed/w9/300/530', userId: 2, title: '暗黑天使', prompt: '', likes: 723, liked: false, bouncing: false },
  { id: 10, img: 'https://picsum.photos/seed/w10/300/225', userId: 3, title: '蒸汽城市', prompt: '', likes: 356, liked: false, bouncing: false },
  { id: 11, img: 'https://picsum.photos/seed/w11/300/400', userId: 1, title: '油画风景', prompt: '', likes: 489, liked: false, bouncing: false },
  { id: 12, img: 'https://picsum.photos/seed/w12/300/300', userId: 5, title: '像素冒险', prompt: '', likes: 278, liked: false, bouncing: false },
];

const works = ref<Work[]>([...allWorks.slice(0, 8)]);
const recommendWorks = [...allWorks.slice(0, 8)];
const newWorks = [...allWorks.slice(0, 8)].reverse();

const homeTab = ref('recommend');
const bannerIdx = ref(0);
const isRefreshing = ref(false);
const loading = ref(false);
const noMore = ref(false);
const animDir = ref('');
const animKey = ref(0);
const scrollHeight = ref(700);
let bannerTimer: any = null;

// 瀑布流分左右列
const leftColumn = computed(() => works.value.filter((_, i) => i % 2 === 0));
const rightColumn = computed(() => works.value.filter((_, i) => i % 2 === 1));

const getUserName = (id: number) => users.find(u => u.id === id)?.name || '';
const getUserAvatar = (id: number) => users.find(u => u.id === id)?.avatar || '';
const getUserColor = (id: number) => users.find(u => u.id === id)?.color || '#5B9FE8';

// Banner 轮播
const startBannerTimer = () => {
  bannerTimer = setInterval(() => {
    bannerIdx.value = (bannerIdx.value + 1) % banners.value.length;
  }, 4000);
};
const nextBanner = () => {
  clearInterval(bannerTimer);
  bannerIdx.value = (bannerIdx.value + 1) % banners.value.length;
  startBannerTimer();
};
const onBannerTouchStart = () => clearInterval(bannerTimer);
const onBannerTouchEnd = () => startBannerTimer();

const tabLoading = ref(false);

// Tab 切换 (带loading动画)
const switchTab = (tab: string) => {
  if (homeTab.value === tab) return;
  const oldTab = homeTab.value;
  homeTab.value = tab;
  // 判断滑动方向
  animDir.value = (tab === 'new' && oldTab === 'recommend') ? 'left' : 'right';
  // 显示loading
  tabLoading.value = true;
  setTimeout(() => {
    tabLoading.value = false;
    animKey.value++;
    if (tab === 'new') {
      works.value = [...newWorks];
    } else {
      works.value = [...recommendWorks];
    }
    setTimeout(() => { animDir.value = ''; }, 400);
  }, 300);
};

// 点赞 (带弹跳动效)
const toggleLike = (w: Work) => {
  w.liked = !w.liked;
  w.likes += w.liked ? 1 : -1;
  if (w.liked) {
    w.bouncing = true;
    setTimeout(() => { w.bouncing = false; }, 400);
  }
};

// 下拉刷新
const onRefresh = () => {
  isRefreshing.value = true;
  setTimeout(() => {
    works.value = homeTab.value === 'new' ? [...newWorks] : [...recommendWorks];
    noMore.value = false;
    isRefreshing.value = false;
    uni.showToast({ title: '已刷新', icon: 'none' });
  }, 800);
};

// 上拉加载更多
const onLoadMore = () => {
  if (loading.value || noMore.value) return;
  loading.value = true;
  setTimeout(() => {
    const moreWorks = allWorks.slice(works.value.length, works.value.length + 4);
    if (moreWorks.length === 0) {
      noMore.value = true;
    } else {
      works.value = [...works.value, ...moreWorks];
    }
    loading.value = false;
  }, 600);
};

// 导航跳转
const goCreate = () => uni.switchTab({ url: '/pages/create/index' });
const goAllGameplays = () => {
  uni.showToast({ title: '全部玩法页开发中', icon: 'none' });
};
const selectGameplay = (g: any) => {
  uni.switchTab({ url: '/pages/create/index' });
  uni.showToast({ title: `已套用「${g.name}」模板`, icon: 'none' });
};
const goWorkDetail = (w: Work) => {
  uni.showToast({ title: `作品「${w.title || '未命名'}」详情页开发中`, icon: 'none' });
};
const goUserProfile = (userId: number) => {
  const u = users.find(x => x.id === userId);
  uni.showToast({ title: `${u?.name || ''}主页开发中`, icon: 'none' });
};

// 计算滚动区高度
onMounted(() => {
  const sysInfo = uni.getSystemInfoSync();
  scrollHeight.value = sysInfo.windowHeight - 80; // 减去tabbar高度
  startBannerTimer();
});
onUnmounted(() => clearInterval(bannerTimer));
</script>

<style lang="scss" scoped>
.page-home {
  min-height: 100vh;
  background: #EEF4FC;
  position: relative;
}

// 毛玻璃刘海
.glass-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 74px;
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  z-index: 98;
  border-bottom: 0.5px solid rgba(91, 159, 232, 0.14);
}

// 状态栏
.status-bar {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 120;
}
.sb-time { font-size: 13px; font-weight: 600; color: #0E1F3A; }
.sb-right { display: flex; align-items: center; gap: 5px; }
.sb-icon { font-size: 10px; color: #0E1F3A; }
.sb-battery { font-size: 12px; color: #0E1F3A; }

// 导航
.nav-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 24px;
  left: 0;
  right: 0;
  z-index: 120;
}
.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #0E1F3A;
}

// 胶囊
.capsule {
  position: fixed;
  right: 7px;
  top: 28px;
  width: 87px;
  height: 32px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 200;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
}
.cap-btn {
  width: 43.5px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0E1F3A;
  font-size: 14px;
}
.cap-divider {
  width: 0.5px;
  height: 16px;
  background: rgba(0, 0, 0, 0.15);
}

// 滚动内容区
.content-scroll {
  padding-top: 74px;
}

// Banner
.banner-wrap {
  padding: 0 16px;
  margin-bottom: 16px;
}
.banner-box {
  height: 150px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  background: #fff;
  border: 1px solid rgba(91, 159, 232, 0.14);
}
.banner-track {
  display: flex;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.banner-slide {
  width: 100%;
  height: 150px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.banner-img { width: 100%; height: 150px; }
.banner-overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 20px 16px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}
.banner-title { color: #fff; font-size: 16px; font-weight: 600; }
.banner-btn {
  position: absolute;
  right: 20px; top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  border-radius: 999px;
  padding: 7px 20px;
  font-size: 12px;
  font-weight: 600;
}
.banner-dots {
  position: absolute;
  bottom: 8px; left: 0; right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
}
.banner-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(91, 159, 232, 0.25);
  transition: all 0.3s;
  &.active {
    width: 20px;
    border-radius: 999px;
    background: #5B9FE8;
  }
}

// Section
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 12px;
}
.section-title { font-size: 18px; font-weight: 700; color: #0E1F3A; }
.section-more { display: flex; align-items: center; gap: 2px; }
.more-text { font-size: 14px; font-weight: 600; color: #5B9FE8; }
.more-arrow { font-size: 18px; color: #5B9FE8; }

// 热门玩法
.gameplay-scroll { white-space: nowrap; margin-bottom: 18px; }
.gameplay-list { display: inline-flex; gap: 12px; padding: 0 16px; }
.gp-card {
  position: relative;
  width: 90px;
  height: 120px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.gp-img { width: 90px; height: 120px; }
.gp-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.1) 50%, transparent 100%);
}
.gp-hot {
  position: absolute;
  top: 8px; right: 8px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: #fff;
  font-size: 9px; font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(238, 90, 36, 0.35);
}
.gp-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; }
.gp-name { font-size: 13px; font-weight: 700; color: #fff; display: block; margin-bottom: 2px; text-shadow: 0 1px 4px rgba(0,0,0,0.3); }
.gp-uses { display: flex; align-items: center; gap: 3px; }
.gp-fire-icon { font-size: 11px; }
.gp-uses-text { font-size: 10px; color: rgba(255, 255, 255, 0.75); }

// Tabs
.home-tabs { display: flex; gap: 16px; position: relative; }
.home-tab {
  font-size: 14px; font-weight: 500; color: #8497B5;
  padding-bottom: 4px;
  position: relative;
  transition: color 0.3s;
  &.active {
    font-weight: 700;
    color: #5B9FE8;
    &::after {
      content: '';
      position: absolute;
      bottom: 0; left: 50%;
      transform: translateX(-50%);
      width: 20px; height: 3px;
      border-radius: 999px;
      background: #5B9FE8;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
  }
}

// 瀑布流
.waterfall-wrap {
  padding: 0 12px;
  display: flex;
  gap: 8px;
}
.wf-anim-left {
  animation: wfSlideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.wf-anim-right {
  animation: wfSlideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes wfSlideLeft {
  from { opacity: 0.3; transform: translateX(-36px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes wfSlideRight {
  from { opacity: 0.3; transform: translateX(36px); }
  to { opacity: 1; transform: translateX(0); }
}
.waterfall {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wf-card {
  background: #fff;
  border: 1px solid rgba(91, 159, 232, 0.14);
  border-radius: 16px;
  overflow: hidden;
}
.wf-img-wrap {
  width: 100%;
  overflow: hidden;
  cursor: pointer;
  &:active {
    transform: scale(0.97);
    transition: transform 0.15s ease;
  }
}
.wf-img { width: 100%; display: block; }
.wf-info { padding: 8px 10px 8px; }
.wf-title {
  font-size: 13px; font-weight: 600; color: #0E1F3A;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: block; margin-bottom: 4px;
}
.wf-meta { display: flex; align-items: center; justify-content: space-between; }
.wf-author {
  display: flex; align-items: center; gap: 5px;
  flex: 1; overflow: hidden;
}
.wf-avatar {
  width: 22px; height: 22px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.wf-avatar-text { font-size: 10px; color: #fff; font-weight: 700; }
.wf-author-name {
  font-size: 11px; color: #445876;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wf-like {
  display: flex; align-items: center; gap: 3px;
  flex-shrink: 0;
  padding: 2px 4px;
  border-radius: 8px;
  &:active { background: rgba(91, 159, 232, 0.08); }
}
.wf-like-icon {
  font-size: 20px;
  transition: transform 0.15s ease;
  &.like-bounce {
    animation: likeBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}
@keyframes likeBounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.45); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
.wf-like-num { font-size: 14px; font-weight: 600; }

// 加载更多
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 0 30px;
}
.load-spinner {
  width: 24px; height: 24px;
  border: 2.5px solid rgba(91, 159, 232, 0.2);
  border-top-color: #5B9FE8;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-text { font-size: 12px; color: #8497B5; }

// Tab切换loading
.tab-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}
.tab-spinner {
  width: 28px; height: 28px;
  border: 2.5px solid rgba(91, 159, 232, 0.15);
  border-top-color: #5B9FE8;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
</style>
