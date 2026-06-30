<template>
  <view class="page-plaza">
    <!-- 毛玻璃刘海层 -->
    <view class="glass-header" />
    <!-- 状态栏 -->
    <view class="status-bar">
      <text class="sb-time">9:41</text>
      <view class="sb-right">
        <text class="sb-icon">●●●●</text>
        <text class="sb-icon">▲</text>
        <text class="sb-battery">▮</text>
      </view>
    </view>
    <!-- 导航 -->
    <view class="nav-header">
      <text class="nav-title">广场</text>
    </view>
    <!-- 胶囊 -->
    <view class="capsule">
      <view class="cap-btn">⋯</view>
      <view class="cap-divider" />
      <view class="cap-btn">✕</view>
    </view>

    <!-- 可滚动内容 -->
    <scroll-view
      scroll-y
      class="content-scroll"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 顶部操作栏: 汉堡 | Tab居中 | 搜索 -->
      <view class="plaza-top">
        <view class="top-menu" @click="openDrawer">
          <text class="top-menu-icon">☰</text>
        </view>
        <view class="top-tabs">
          <text
            v-for="(t, i) in plazaTabs"
            :key="i"
            :class="['plaza-tab', { active: curTab === i }]"
            @click="switchTab(i)"
          >{{ t }}</text>
          <view class="tab-indicator" :style="{ left: plazaIndicatorLeft + 'px' }" />
        </view>
        <view class="top-search" @click="goSearch">
          <text class="top-search-icon">🔍</text>
        </view>
      </view>

      <!-- 分类芯片行 -->
      <view class="cat-row">
        <scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
          <view class="cat-list">
            <view
              v-for="(c, i) in categories"
              :key="i"
              :class="['cat-chip', { active: curCat === i }]"
              @click="selectCat(i)"
            >
              <text :class="['cat-text', { active: curCat === i }]">{{ c }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="cat-fade" />
        <view class="filter-btn" @click="openFilter">
          <text class="filter-icon">⚙</text>
        </view>
      </view>

      <!-- Tab切换loading -->
      <view v-if="tabLoading" class="tab-loading">
        <view class="tab-spinner" />
      </view>

      <!-- 瀑布流 -->
      <view
        v-else
        class="waterfall-wrap"
        :class="{ 'wf-anim-left': animDir === 'left', 'wf-anim-right': animDir === 'right' }"
        :key="animKey"
      >
        <view class="waterfall">
          <view v-for="w in leftCol" :key="w.id" class="wf-item">
            <view class="wf-card">
              <view class="wf-img-wrap" @click="goWorkDetail(w)">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title || w.prompt?.substring(0, 20) || '未命名' }}</text>
                <view class="wf-meta">
                  <view class="wf-author" @click.stop="goUserProfile(w.userId)">
                    <view class="wf-avatar" :style="{ background: getUser(w.userId).color }">
                      <text class="wf-avatar-text">{{ getUser(w.userId).avatar }}</text>
                    </view>
                    <text class="wf-author-name">{{ getUser(w.userId).name }}</text>
                  </view>
                  <view class="wf-like" @click.stop="toggleLike(w)">
                    <text
                      class="wf-like-icon"
                      :class="{ 'like-bounce': w.bouncing }"
                      :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }"
                    >{{ w.liked ? '♥' : '♡' }}</text>
                    <text class="wf-like-num" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.likes }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in rightCol" :key="w.id" class="wf-item">
            <view class="wf-card">
              <view class="wf-img-wrap" @click="goWorkDetail(w)">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title || w.prompt?.substring(0, 20) || '未命名' }}</text>
                <view class="wf-meta">
                  <view class="wf-author" @click.stop="goUserProfile(w.userId)">
                    <view class="wf-avatar" :style="{ background: getUser(w.userId).color }">
                      <text class="wf-avatar-text">{{ getUser(w.userId).avatar }}</text>
                    </view>
                    <text class="wf-author-name">{{ getUser(w.userId).name }}</text>
                  </view>
                  <view class="wf-like" @click.stop="toggleLike(w)">
                    <text
                      class="wf-like-icon"
                      :class="{ 'like-bounce': w.bouncing }"
                      :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }"
                    >{{ w.liked ? '♥' : '♡' }}</text>
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

    <!-- 左侧抽屉遮罩 -->
    <view v-if="drawerOpen" class="drawer-overlay" @click="closeDrawer" />
    <!-- 左侧抽屉 -->
    <view :class="['left-drawer', { show: drawerOpen }]">
      <view class="drawer-header">
        <view class="drawer-user">
          <view class="drawer-avatar">
            <text class="drawer-avatar-text">梦</text>
          </view>
          <view class="drawer-user-info">
            <text class="drawer-name">云端造梦师</text>
            <view class="drawer-credits">
              <text class="drawer-credits-num">2860</text>
              <text class="drawer-credits-label">积分</text>
            </view>
          </view>
        </view>
        <view class="drawer-shortcuts">
          <view class="drawer-shortcut" @click="goPage('recharge')">
            <view class="shortcut-icon" style="background:linear-gradient(135deg,#a8d8f8,#b0e6d0)">💰</view>
            <text class="shortcut-text">充值</text>
          </view>
          <view class="drawer-shortcut" @click="goPage('checkin')">
            <view class="shortcut-icon" style="background:linear-gradient(135deg,#FFD4C8,#FFC8D6)">📅</view>
            <text class="shortcut-text">签到</text>
          </view>
          <view class="drawer-shortcut" @click="goPage('membership')">
            <view class="shortcut-icon" style="background:linear-gradient(135deg,#D4C8F0,#B8A8E0)">👑</view>
            <text class="shortcut-text">会员</text>
          </view>
          <view class="drawer-shortcut" @click="goPage('invite')">
            <view class="shortcut-icon" style="background:linear-gradient(135deg,#A3E4CC,#8BD8B8)">👤</view>
            <text class="shortcut-text">邀请</text>
          </view>
        </view>
      </view>
      <view class="drawer-menu">
        <view class="drawer-row" @click="goPage('publish')">
          <text class="drawer-row-icon" style="color:#5B9FE8">✦</text>
          <text class="drawer-row-text">发布作品</text>
          <text class="drawer-row-arrow">›</text>
        </view>
        <view class="drawer-row" @click="goPage('history')">
          <text class="drawer-row-icon" style="color:#6FD4B0">🕐</text>
          <text class="drawer-row-text">浏览记录</text>
          <text class="drawer-row-arrow">›</text>
        </view>
        <view class="drawer-row" @click="goPage('messages')">
          <text class="drawer-row-icon" style="color:#FFA8B8">💬</text>
          <text class="drawer-row-text">消息中心</text>
          <view class="drawer-badge">5</view>
          <text class="drawer-row-arrow">›</text>
        </view>
        <view class="drawer-row" @click="goPage('following')">
          <text class="drawer-row-icon" style="color:#FFB59A">❤</text>
          <text class="drawer-row-text">我的关注</text>
          <text class="drawer-row-arrow">›</text>
        </view>
        <view class="drawer-row" @click="goPage('followers')">
          <text class="drawer-row-icon" style="color:#FFE08A">👥</text>
          <text class="drawer-row-text">我的粉丝</text>
          <text class="drawer-row-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 筛选遮罩 -->
    <view v-if="filterOpen" class="drawer-overlay" @click="closeFilter" />
    <!-- 筛选底部弹窗 -->
    <view :class="['filter-sheet', { show: filterOpen }]">
      <view class="sheet-handle" />
      <view class="sheet-body">
        <text class="filter-section-title">分类</text>
        <view class="filter-chips">
          <view
            v-for="(c, i) in categories"
            :key="'fc'+i"
            :class="['filter-chip', { active: filterCats.includes(i) }]"
            @click="toggleFilterCat(i)"
          >{{ c }}</view>
        </view>

        <text class="filter-section-title">模型</text>
        <view class="filter-chips">
          <view v-for="m in models" :key="'fm'+m" :class="['filter-chip', { active: filterModels.includes(m) }]" @click="toggleFilterModel(m)">{{ m }}</view>
        </view>

        <text class="filter-section-title">尺寸</text>
        <view class="filter-chips">
          <view v-for="r in ratios" :key="'fr'+r" :class="['filter-chip', { active: filterRatios.includes(r) }]" @click="toggleFilterRatio(r)">{{ r }}</view>
        </view>

        <text class="filter-section-title">精度</text>
        <view class="filter-chips">
          <view v-for="q in qualities" :key="'fq'+q" :class="['filter-chip', { active: filterQualities.includes(q) }]" @click="toggleFilterQuality(q)">{{ q }}</view>
        </view>

        <view class="filter-actions">
          <view class="filter-btn-reset" @click="resetFilter">重置</view>
          <view class="filter-btn-confirm" @click="applyFilter">确认</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { workApi, getUserDisplay } from '@/utils/api';

const plazaTabs = ['推荐', '热门', '最新'];
const curTab = ref(0);
const plazaIndicatorLeft = ref(0);

// 每个tab文字约32px宽，gap 28px，居中对齐，指示器24px宽
const updatePlazaIndicator = (idx: number) => {
  // tab宽约32px, gap 28px => 每个tab占60px, 指示器居中
  plazaIndicatorLeft.value = idx * 60 + 16 - 12; // 居中在每个tab下
};
const curCat = ref(0);
const categories = ['全部', '二次元', '风景', '建筑', '表情包', '写实', '国风', '人像', '动物', '抽象'];
const models = ['全部', 'GPT Image 2', 'Nano Banana 2', 'Flux Pro', 'SDXL', 'DALL-E 3', 'Midjourney'];
const ratios = ['全部', '1:1', '3:4', '4:3', '16:9', '9:16'];
const qualities = ['全部', '标清', '高清', '超清'];

const drawerOpen = ref(false);
const filterOpen = ref(false);
const tabLoading = ref(false);
const loading = ref(false);
const noMore = ref(false);
const isRefreshing = ref(false);
const animDir = ref('');
const animKey = ref(0);
const scrollH = ref(700);

const filterCats = ref<number[]>([0]);
const filterModels = ref<string[]>([]);
const filterRatios = ref<string[]>([]);
const filterQualities = ref<string[]>([]);

interface Work {
  id: string; img: string; userId: string; title: string;
  prompt: string; likes: number; liked: boolean; bouncing: boolean;
}

const allWorks = ref<Work[]>([]);
const works = ref<Work[]>([]);
const leftCol = computed(() => works.value.filter((_, i) => i % 2 === 0));
const rightCol = computed(() => works.value.filter((_, i) => i % 2 === 1));
const getUser = (id: string) => { const d = getUserDisplay(id); return { avatar: d.avatar, color: d.color }; };

const mapWork = (w: any): Work => ({
  id: w.id, img: w.image_urls?.[0] || '', userId: w.user_id,
  title: w.title || '', prompt: w.prompt || '',
  likes: w.likes_count || 0, liked: false, bouncing: false,
});

const fetchWorks = async () => {
  const tab = plazaTabs[curTab.value].toLowerCase();
  const cat = categories[curCat.value];
  try {
    const res = await workApi.getPlazaWorks({ tab, category: cat });
    return ((res as any).data?.list || (res as any).data || []).map(mapWork);
  } catch { return []; }
};

const switchTab = async (idx: number) => {
  if (curTab.value === idx) return;
  curTab.value = idx;
  updatePlazaIndicator(idx);
  tabLoading.value = true;
  const list = await fetchWorks();
  setTimeout(() => {
    tabLoading.value = false;
    animKey.value++;
    allWorks.value = list;
    works.value = list;
    noMore.value = list.length <= 10;
  }, 300);
};

const selectCat = async (idx: number) => {
  if (curCat.value === idx) return;
  curCat.value = idx;
  tabLoading.value = true;
  const list = await fetchWorks();
  setTimeout(() => {
    tabLoading.value = false;
    animKey.value++;
    allWorks.value = list;
    works.value = list;
  }, 300);
};

const toggleLike = async (w: Work) => {
  w.liked = !w.liked;
  w.likes += w.liked ? 1 : -1;
  if (w.liked) { w.bouncing = true; setTimeout(() => { w.bouncing = false; }, 400); }
  try { await workApi.likeWork(w.id); } catch {}
};

const openDrawer = () => { drawerOpen.value = true; };
const closeDrawer = () => { drawerOpen.value = false; };
const openFilter = () => { filterOpen.value = true; };
const closeFilter = () => { filterOpen.value = false; };
const toggleFilterCat = (i: number) => { const idx = filterCats.value.indexOf(i); if (idx >= 0) filterCats.value.splice(idx, 1); else filterCats.value = [i]; };
const toggleFilterModel = (m: string) => { const idx = filterModels.value.indexOf(m); if (idx >= 0) filterModels.value.splice(idx, 1); else filterModels.value.push(m); };
const toggleFilterRatio = (r: string) => { const idx = filterRatios.value.indexOf(r); if (idx >= 0) filterRatios.value.splice(idx, 1); else filterRatios.value.push(r); };
const toggleFilterQuality = (q: string) => { const idx = filterQualities.value.indexOf(q); if (idx >= 0) filterQualities.value.splice(idx, 1); else filterQualities.value.push(q); };
const resetFilter = () => { filterCats.value = []; filterModels.value = []; filterRatios.value = []; filterQualities.value = []; uni.showToast({ title: '已重置筛选', icon: 'none' }); };
const applyFilter = () => { filterOpen.value = false; fetchWorks().then(l => { works.value = l; allWorks.value = l; }); };

const onRefresh = async () => {
  isRefreshing.value = true;
  const list = await fetchWorks();
  allWorks.value = list; works.value = list; noMore.value = false;
  isRefreshing.value = false;
};

const onLoadMore = () => {
  if (loading.value || noMore.value) return;
  loading.value = true;
  setTimeout(() => { noMore.value = true; loading.value = false; }, 600);
};

const goSearch = () => uni.navigateTo({ url: '/pages/search/index' });
const goWorkDetail = (w: Work) => uni.navigateTo({ url: `/pages/work-detail/index?id=${w.id}` });
const goUserProfile = (userId: string) => uni.navigateTo({ url: '/pages/user-profile/index' });
const pageRoutes: Record<string, string> = {
  recharge: '/pages/recharge/index', settings: '/pages/settings/index', editProfile: '/pages/edit-profile/index',
  checkin: '/pages/checkin/index', invite: '/pages/invite/index', membership: '/pages/membership/index',
  messages: '/pages/messages/index', publish: '/pages/publish/index',
};
const goPage = (name: string) => {
  closeDrawer();
  if (pageRoutes[name]) uni.navigateTo({ url: pageRoutes[name] });
  else uni.showToast({ title: `${name}页开发中`, icon: 'none' });
};

onMounted(async () => {
  updatePlazaIndicator(0);
  scrollH.value = uni.getSystemInfoSync().windowHeight - 80;
  const list = await fetchWorks();
  allWorks.value = list; works.value = list;
  noMore.value = list.length <= 10;
});
</script>

<style lang="scss" scoped>
.page-plaza {
  height: 100vh;
  background: #EEF4FC;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 毛玻璃
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
  top: 0; left: 0; right: 0;
  z-index: 120;
}
.sb-time { font-size: 13px; font-weight: 600; color: #0E1F3A; }
.sb-right { display: flex; align-items: center; gap: 5px; }
.sb-icon { font-size: 10px; color: #0E1F3A; }
.sb-battery { font-size: 12px; color: #0E1F3A; }

.nav-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 24px; left: 0; right: 0;
  z-index: 120;
}
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }

.capsule {
  position: fixed;
  right: 7px; top: 28px;
  width: 87px; height: 32px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 200;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
}
.cap-btn {
  width: 43.5px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  color: #0E1F3A; font-size: 14px;
}
.cap-divider {
  width: 0.5px; height: 16px;
  background: rgba(0, 0, 0, 0.15);
}

.content-scroll { padding-top: 74px; flex: 1; height: 0; }

// 顶部操作栏
.plaza-top {
  display: flex;
  align-items: center;
  padding: 4px 16px;
  gap: 10px;
  position: relative;
  z-index: 95;
}
.top-menu { padding: 4px; }
.top-menu-icon { font-size: 22px; color: #0E1F3A; }
.top-tabs {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 28px;
  position: relative;
  padding-bottom: 6px;
}
.plaza-tab {
  font-size: 16px;
  font-weight: 500;
  color: #8497B5;
  transition: color 0.3s;
  cursor: pointer;
  &.active {
    font-weight: 700;
    color: #5B9FE8;
  }
}
.tab-indicator {
  position: absolute; bottom: 0;
  width: 24px; height: 3px;
  border-radius: 999px;
  background: #5B9FE8;
  transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.top-search { padding: 4px; flex-shrink: 0; }
.top-search-icon { font-size: 22px; color: #0E1F3A; }

// 分类芯片
.cat-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  position: relative;
  z-index: 95;
}
.cat-scroll {
  flex: 1;
  white-space: nowrap;
}
.cat-list {
  display: inline-flex;
  padding: 0 16px;
  gap: 0;
}
.cat-chip {
  flex-shrink: 0;
  padding: 6px 12px;
  transition: all 0.3s;
}
.cat-text {
  font-size: 14px;
  font-weight: 400;
  color: #445876;
  &.active {
    font-weight: 600;
    color: #5B9FE8;
  }
}
.cat-fade {
  position: absolute;
  right: 44px;
  top: 0; bottom: 0;
  width: 30px;
  background: linear-gradient(to right, transparent, #EEF4FC);
  pointer-events: none;
}
.filter-btn {
  width: 44px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  border-left: 0.5px solid rgba(91, 159, 232, 0.14);
}
.filter-icon { font-size: 18px; color: #0E1F3A; }

// 瀑布流
.waterfall-wrap {
  padding: 0 12px;
  display: flex;
  gap: 8px;
}
.wf-anim-left { animation: wfSlideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.wf-anim-right { animation: wfSlideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
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
  flex-shrink: 0; padding: 2px 4px; border-radius: 8px;
}
.wf-like-icon {
  font-size: 20px;
  transition: transform 0.15s ease;
  &.like-bounce { animation: likeBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
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

// Tab loading
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

// 左侧抽屉
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 150;
  animation: fadeIn 0.3s;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.left-drawer {
  position: fixed;
  top: 0; bottom: 0; left: 0;
  width: 280px;
  background: #fff;
  z-index: 200;
  transform: translateX(-100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 24px 56px rgba(60, 120, 200, 0.16);
  display: flex;
  flex-direction: column;
  &.show { transform: translateX(0); }
}
.drawer-header {
  padding: 90px 20px 24px;
  background: linear-gradient(180deg, #E1EBF8 0%, #F5F9FE 100%);
  border-bottom: 1px solid rgba(91, 159, 232, 0.14);
}
.drawer-user {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.drawer-avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #B8A5E3, #5B9FE8, #6FD4B0);
  display: flex; align-items: center; justify-content: center;
}
.drawer-avatar-text { font-size: 20px; color: #fff; font-weight: 700; }
.drawer-user-info { flex: 1; }
.drawer-name { font-size: 17px; font-weight: 700; color: #0E1F3A; }
.drawer-credits {
  display: flex; gap: 4px; margin-top: 3px;
}
.drawer-credits-num { font-size: 16px; font-weight: 700; color: #5B9FE8; }
.drawer-credits-label { font-size: 14px; color: #8497B5; }
.drawer-shortcuts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.drawer-shortcut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.shortcut-icon {
  width: 42px; height: 42px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.shortcut-text { font-size: 12px; color: #445876; }

.drawer-menu {
  flex: 1;
  padding: 12px 0;
}
.drawer-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  transition: background 0.2s;
  &:active { background: rgba(91, 159, 232, 0.08); }
}
.drawer-row-icon { font-size: 22px; width: 22px; text-align: center; flex-shrink: 0; }
.drawer-row-text { flex: 1; font-size: 15px; color: #0E1F3A; }
.drawer-row-arrow { color: #8497B5; font-size: 18px; }
.drawer-badge {
  min-width: 18px; height: 18px;
  padding: 0 5px;
  background: #FFA8B8;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
}

// 筛选底部弹窗
.filter-sheet {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 24px 56px rgba(60, 120, 200, 0.16);
  z-index: 200;
  transform: translateY(100%);
  visibility: hidden;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s;
  max-height: 80%;
  overflow-y: auto;
  &.show {
    transform: translateY(0);
    visibility: visible;
  }
}
.sheet-handle {
  width: 36px; height: 4px;
  background: rgba(91, 159, 232, 0.3);
  border-radius: 2px;
  margin: 10px auto 4px;
}
.sheet-body {
  padding: 8px 20px 100px; // 底部留出tabbar空间
}
.filter-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #0E1F3A;
  margin-bottom: 12px;
  display: block;
}
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}
.filter-chip {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px;
  white-space: nowrap;
  background: transparent;
  border: 1px solid rgba(91, 159, 232, 0.32);
  color: #445876;
  transition: all 0.3s;
  &.active {
    background: rgba(91, 159, 232, 0.12);
    border-color: #5B9FE8;
    color: #3B7FC8;
  }
}
.filter-actions {
  display: flex;
  gap: 10px;
}
.filter-btn-reset {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0E1F3A;
  background: #fff;
  border: 1px solid rgba(91, 159, 232, 0.32);
}
.filter-btn-confirm {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%);
  box-shadow: 0 4px 14px rgba(91, 159, 232, 0.35);
}
</style>

