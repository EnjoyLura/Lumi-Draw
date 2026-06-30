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
          <view class="home-tab-indicator" :style="{ left: homeTab === 'recommend' ? '4px' : '50px' }" />
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
                <image :src="w.img" mode="widthFix" class="wf-img" :class="{ loaded: w.imgLoaded }" @load="w.imgLoaded = true" />
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
                <image :src="w.img" mode="widthFix" class="wf-img" :class="{ loaded: w.imgLoaded }" @load="w.imgLoaded = true" />
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
    <LoginPopup />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { configApi, workApi, getUserDisplay } from '@/utils/api';
import { requireLogin } from '@/utils/auth';
import LoginPopup from '@/components/LoginPopup.vue';

const banners = ref<any[]>([]);
const gameplays = ref<any[]>([]);

interface Work {
  id: string;
  img: string;
  userId: string;
  title: string;
  prompt: string;
  likes: number;
  liked: boolean;
  bouncing: boolean;
  imgLoaded?: boolean;
}

const allWorks = ref<Work[]>([]);
const works = ref<Work[]>([]);

const homeTab = ref('recommend');
const bannerIdx = ref(0);
const isRefreshing = ref(false);
const loading = ref(false);
const noMore = ref(false);
const animDir = ref('');
const animKey = ref(0);
let bannerTimer: any = null;

const leftColumn = computed(() => works.value.filter((_, i) => i % 2 === 0));
const rightColumn = computed(() => works.value.filter((_, i) => i % 2 === 1));

const getUserName = (id: string) => getUserDisplay(id).avatar ? id.substring(0, 1) : '';
const getUserAvatar = (id: string) => getUserDisplay(id).avatar;
const getUserColor = (id: string) => getUserDisplay(id).color;

// Banner 轮播
const startBannerTimer = () => {
  bannerTimer = setInterval(() => {
    if (banners.value.length > 0) bannerIdx.value = (bannerIdx.value + 1) % banners.value.length;
  }, 4000);
};
const nextBanner = () => {
  clearInterval(bannerTimer);
  if (banners.value.length > 0) bannerIdx.value = (bannerIdx.value + 1) % banners.value.length;
  startBannerTimer();
};
const onBannerTouchStart = () => clearInterval(bannerTimer);
const onBannerTouchEnd = () => startBannerTimer();

const tabLoading = ref(false);

const mapWork = (w: any): Work => ({
  id: w.id,
  img: w.image_urls?.[0] || '',
  userId: w.user_id,
  title: w.title || '',
  prompt: w.prompt || '',
  likes: w.likes_count || 0,
  liked: false,
  bouncing: false,
});

const loadWorks = async (tab: string) => {
  try {
    const res = await workApi.getHomeWorks(tab);
    return (res.data?.list || res.data || []).map(mapWork);
  } catch { return []; }
};

const switchTab = async (tab: string) => {
  if (homeTab.value === tab) return;
  const oldTab = homeTab.value;
  homeTab.value = tab;
  animDir.value = (tab === 'new' && oldTab === 'recommend') ? 'left' : 'right';
  tabLoading.value = true;
  const list = await loadWorks(tab);
  setTimeout(() => {
    tabLoading.value = false;
    animKey.value++;
    allWorks.value = list;
    works.value = list.slice(0, 8);
    noMore.value = list.length <= 8;
    setTimeout(() => { animDir.value = ''; }, 400);
  }, 300);
};

const toggleLike = async (w: Work) => {
  if (!requireLogin()) return;
  w.liked = !w.liked;
  w.likes += w.liked ? 1 : -1;
  if (w.liked) {
    w.bouncing = true;
    setTimeout(() => { w.bouncing = false; }, 400);
    try { await workApi.likeWork(w.id); } catch {}
  } else {
    try { await workApi.likeWork(w.id); } catch {}
  }
};

const onRefresh = async () => {
  isRefreshing.value = true;
  const list = await loadWorks(homeTab.value);
  allWorks.value = list;
  works.value = list.slice(0, 8);
  noMore.value = list.length <= 8;
  isRefreshing.value = false;
};

const onLoadMore = () => {
  if (loading.value || noMore.value) return;
  loading.value = true;
  setTimeout(() => {
    const more = allWorks.value.slice(works.value.length, works.value.length + 4);
    if (more.length === 0) { noMore.value = true; }
    else { works.value = [...works.value, ...more]; }
    loading.value = false;
  }, 600);
};

const goCreate = () => uni.switchTab({ url: '/pages/create/index' });
const goAllGameplays = () => uni.navigateTo({ url: '/pages/all-gameplays/index' });
const selectGameplay = (g: any) => {
  uni.$emit('applyGameplay', g);
  uni.switchTab({ url: '/pages/create/index' });
  uni.showToast({ title: `已套用「${g.name}」模板`, icon: 'none' });
};
const goWorkDetail = (w: Work) => uni.navigateTo({ url: `/pages/work-detail/index?id=${w.id}` });
const goUserProfile = (userId: string) => uni.navigateTo({ url: '/pages/user-profile/index' });

onMounted(async () => {
  // 并行加载配置数据
  const [bannerRes, gpRes] = await Promise.all([
    configApi.getBanners().catch(() => ({ data: [] })),
    configApi.getGameplays().catch(() => ({ data: [] })),
  ]);
  const bList = (bannerRes as any).data || bannerRes || [];
  banners.value = bList.map((b: any) => ({ img: b.image_url, title: b.title }));
  const gList = (gpRes as any).data || gpRes || [];
  gameplays.value = gList.map((g: any) => ({ name: g.name, img: g.cover_url, uses: g.uses_count, hot: g.is_hot }));

  // 加载作品
  const list = await loadWorks('recommend');
  allWorks.value = list;
  works.value = list.slice(0, 8);
  noMore.value = list.length <= 8;
  startBannerTimer();
});
onUnmounted(() => clearInterval(bannerTimer));
</script>

<style lang="scss" scoped>
.page-home {
  height: 100vh;
  background: #EEF4FC;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 毛玻璃刘海
.glass-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 74px;
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  z-index: 90;
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
  flex: 1;
  height: 0;
}

// Banner
.banner-wrap {
  padding: 0 16px;
  margin-top: 5px;
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
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  border-radius: 999px;
  padding: 7px 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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
.gameplay-list { display: inline-flex; gap: 8px; padding: 0 16px; }
.gp-card {
  position: relative;
  width: 90px;
  height: 120px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.gp-img {
  width: 100%; height: 100%;
  position: absolute; top: 0; left: 0;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.gp-card:active .gp-img { transform: scale(1.05); }
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
.home-tabs { display: flex; gap: 16px; position: relative; padding-bottom: 6px; }
.home-tab {
  font-size: 14px; font-weight: 500; color: #8497B5;
  transition: color 0.3s; cursor: pointer;
  &.active { font-weight: 700; color: #5B9FE8; }
}
.home-tab-indicator {
  position: absolute; bottom: 0;
  width: 20px; height: 3px; border-radius: 999px;
  background: #5B9FE8;
  transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
.wf-img {
  width: 100%; display: block;
  opacity: 0;
  transition: opacity 0.35s ease;
  &.loaded { opacity: 1; }
}
.wf-info { padding: 8px 10px 6px; }
.wf-title {
  font-size: 13px; font-weight: 600; color: #0E1F3A;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: block; margin-bottom: 2px;
}
.wf-meta { display: flex; align-items: center; justify-content: space-between; }
.wf-author {
  display: flex; align-items: center; gap: 6px;
  flex: 1; overflow: hidden;
  cursor: pointer;
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
  cursor: pointer;
  transition: background 0.2s;
  &:active { background: rgba(91, 159, 232, 0.08); }
}
.wf-like-icon {
  font-size: 16px;
  transition: all 0.3s;
  &.like-bounce {
    animation: likeBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}
@keyframes likeBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}
.wf-like-num { font-size: 13px; font-weight: 600; }

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
