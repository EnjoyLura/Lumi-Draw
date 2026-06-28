<template>
  <view class="page-gallery">
    <!-- 头部背景区域 -->
    <view class="gallery-header">
      <!-- 顶部操作栏 -->
      <view class="header-top">
        <view class="header-menu" @click="openDrawer">
          <text class="header-menu-icon">☰</text>
        </view>
        <view style="flex:1;" />
        <view class="bg-btn" @click="openBgPicker">
          <text class="bg-btn-icon">📷</text>
          <text class="bg-btn-text">设置背景</text>
        </view>
        <view class="header-search" @click="goSearch">
          <text class="header-search-icon">🔍</text>
        </view>
      </view>

      <!-- 头像 + 信息 -->
      <view class="user-row">
        <view class="avatar-wrap">
          <view class="user-avatar">
            <text class="user-avatar-text">梦</text>
          </view>
          <view class="avatar-add" @click="changeAvatar">
            <text class="avatar-add-icon">+</text>
          </view>
        </view>
        <view class="user-info">
          <text class="user-name">云端造梦师</text>
          <text class="user-id">ID: LUMI8829</text>
          <view class="user-gender">
            <text class="gender-tag">♀</text>
          </view>
        </view>
      </view>

      <!-- 签名 -->
      <text class="user-signature">用AI描绘心中的梦境，每一笔都是想象力的延伸</text>

      <!-- 标签 -->
      <view class="user-tags">
        <text class="user-tag">✦ AI创作者</text>
      </view>

      <!-- 数据统计 + 编辑按钮 -->
      <view class="stats-row">
        <view class="stats-list">
          <view class="stat-item">
            <text class="stat-num" style="color:#FFA8B8;">48</text>
            <text class="stat-label">作品</text>
          </view>
          <view class="stat-item" @click="goFollowList('followers')">
            <text class="stat-num" style="color:#5B9FE8;">326</text>
            <text class="stat-label">粉丝</text>
          </view>
          <view class="stat-item">
            <text class="stat-num" style="color:#B8A5E3;">1.2k</text>
            <text class="stat-label">获赞</text>
          </view>
        </view>
        <view class="edit-btn" @click="goEditProfile">编辑资料</view>
      </view>
    </view>

    <!-- 子标签页 + 管理按钮 -->
    <view class="gallery-tabs-row">
      <view class="gallery-tabs">
        <view
          v-for="(t, i) in galleryTabs"
          :key="i"
          class="tab-wrap"
          @click="switchTab(i)"
        >
          <text :class="['gallery-tab', { active: curTab === i }]">{{ t }}</text>
          <view v-if="curTab === i" class="tab-indicator" />
        </view>
      </view>
      <view class="manage-btn" @click="toggleManage">
        <text class="manage-icon">☰</text>
        <text class="manage-text">管理</text>
      </view>
    </view>

    <!-- 管理模式底部栏 -->
    <view :class="['manage-bar', { show: isManage }]">
      <text class="manage-count">已选择 {{ selectedCount }} 项</text>
      <view class="manage-select-all" @click="selectAll">全选</view>
      <view :class="['manage-delete', { active: selectedCount > 0 }]" @click="deleteSelected">删除</view>
    </view>

    <!-- 瀑布流 -->
    <scroll-view
      scroll-y
      class="gallery-scroll"
      :style="{ height: scrollH + 'px' }"
      @scrolltolower="onLoadMore"
    >
      <view class="waterfall-wrap">
        <view class="waterfall">
          <view v-for="w in leftCol" :key="w.id" class="wf-item" @click="goWorkDetail(w)">
            <view :class="['wf-card', { selected: isManage && w.managed }]" @click="isManage && toggleManageItem(w)">
              <view v-if="isManage && w.managed" class="wf-check">✓</view>
              <view class="wf-img-wrap">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view v-if="w.title" class="wf-info">
                <text class="wf-title">{{ w.title }}</text>
              </view>
              <view v-if="curTab === 2" class="wf-draft-badge">草稿</view>
            </view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in rightCol" :key="w.id" class="wf-item" @click="goWorkDetail(w)">
            <view :class="['wf-card', { selected: isManage && w.managed }]" @click="isManage && toggleManageItem(w)">
              <view v-if="isManage && w.managed" class="wf-check">✓</view>
              <view class="wf-img-wrap">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view v-if="w.title" class="wf-info">
                <text class="wf-title">{{ w.title }}</text>
              </view>
              <view v-if="curTab === 2" class="wf-draft-badge">草稿</view>
            </view>
          </view>
        </view>
      </view>
      <view class="load-more">
        <view v-if="loading" class="load-spinner" />
        <text v-else class="load-text">{{ noMore ? '没有更多了' : '' }}</text>
      </view>
    </scroll-view>

    <!-- 悬浮发布按钮 -->
    <view class="publish-fab" @click="goPublish">
      <text class="publish-fab-icon">+</text>
    </view>

    <!-- 左侧抽屉 (复用) -->
    <view v-if="drawerOpen" class="drawer-overlay" @click="drawerOpen = false" />
    <view :class="['left-drawer', { show: drawerOpen }]">
      <view class="drawer-header">
        <view class="drawer-user">
          <view class="drawer-avatar"><text class="drawer-avatar-text">梦</text></view>
          <view class="drawer-user-info">
            <text class="drawer-name">云端造梦师</text>
            <view class="drawer-credits"><text class="drawer-credits-num">2860</text><text class="drawer-credits-label">积分</text></view>
          </view>
        </view>
        <view class="drawer-shortcuts">
          <view class="drawer-shortcut"><view class="shortcut-icon" style="background:linear-gradient(135deg,#a8d8f8,#b0e6d0)">💰</view><text class="shortcut-text">充值</text></view>
          <view class="drawer-shortcut"><view class="shortcut-icon" style="background:linear-gradient(135deg,#FFD4C8,#FFC8D6)">📅</view><text class="shortcut-text">签到</text></view>
          <view class="drawer-shortcut"><view class="shortcut-icon" style="background:linear-gradient(135deg,#D4C8F0,#B8A8E0)">👑</view><text class="shortcut-text">会员</text></view>
          <view class="drawer-shortcut"><view class="shortcut-icon" style="background:linear-gradient(135deg,#A3E4CC,#8BD8B8)">👤</view><text class="shortcut-text">邀请</text></view>
        </view>
      </view>
      <view class="drawer-menu">
        <view class="drawer-row"><text class="drawer-row-icon" style="color:#5B9FE8">✦</text><text class="drawer-row-text">发布作品</text><text class="drawer-row-arrow">›</text></view>
        <view class="drawer-row"><text class="drawer-row-icon" style="color:#6FD4B0">🕐</text><text class="drawer-row-text">浏览记录</text><text class="drawer-row-arrow">›</text></view>
        <view class="drawer-row"><text class="drawer-row-icon" style="color:#FFA8B8">💬</text><text class="drawer-row-text">消息中心</text><view class="drawer-badge">5</view><text class="drawer-row-arrow">›</text></view>
        <view class="drawer-row"><text class="drawer-row-icon" style="color:#FFB59A">❤</text><text class="drawer-row-text">我的关注</text><text class="drawer-row-arrow">›</text></view>
        <view class="drawer-row"><text class="drawer-row-icon" style="color:#FFE08A">👥</text><text class="drawer-row-text">我的粉丝</text><text class="drawer-row-arrow">›</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Work {
  id: number; img: string; title: string; managed: boolean; published: boolean;
}

const galleryTabs = ['全部', '已发布', '草稿箱', '收藏'];
const curTab = ref(0);
const isManage = ref(false);
const drawerOpen = ref(false);
const loading = ref(false);
const noMore = ref(false);
const scrollH = ref(500);

const allWorks: Work[] = [
  { id: 3, img: 'https://picsum.photos/seed/w3/300/450', title: '少女与猫', managed: false, published: true },
  { id: 5, img: 'https://picsum.photos/seed/w5/300/530', title: '古风少女', managed: false, published: true },
  { id: 11, img: 'https://picsum.photos/seed/w11/300/400', title: '油画风景', managed: false, published: true },
  { id: 13, img: 'https://picsum.photos/seed/w13/300/400', title: '', managed: false, published: false },
  { id: 14, img: 'https://picsum.photos/seed/w14/300/300', title: '', managed: false, published: false },
  { id: 15, img: 'https://picsum.photos/seed/w15/300/530', title: '', managed: false, published: false },
  { id: 16, img: 'https://picsum.photos/seed/w16/300/225', title: '', managed: false, published: false },
  { id: 17, img: 'https://picsum.photos/seed/w17/300/400', title: '', managed: false, published: false },
  { id: 18, img: 'https://picsum.photos/seed/w18/300/300', title: '', managed: false, published: false },
  { id: 19, img: 'https://picsum.photos/seed/w19/300/400', title: '', managed: false, published: false },
  { id: 20, img: 'https://picsum.photos/seed/w20/300/530', title: '', managed: false, published: false },
  { id: 21, img: 'https://picsum.photos/seed/w21/300/225', title: '', managed: false, published: false },
];

const filteredWorks = computed(() => {
  if (curTab.value === 0) return allWorks;
  if (curTab.value === 1) return allWorks.filter(w => w.published);
  if (curTab.value === 2) return allWorks.filter(w => !w.published);
  return []; // 收藏 tab - mock empty
});

const leftCol = computed(() => filteredWorks.value.filter((_, i) => i % 2 === 0));
const rightCol = computed(() => filteredWorks.value.filter((_, i) => i % 2 === 1));
const selectedCount = computed(() => allWorks.filter(w => w.managed).length);

const switchTab = (idx: number) => {
  curTab.value = idx;
  isManage.value = false;
  allWorks.forEach(w => w.managed = false);
};

const toggleManage = () => {
  isManage.value = !isManage.value;
  if (!isManage.value) allWorks.forEach(w => w.managed = false);
};

const toggleManageItem = (w: Work) => { w.managed = !w.managed; };
const selectAll = () => {
  const allSelected = filteredWorks.value.every(w => w.managed);
  filteredWorks.value.forEach(w => w.managed = !allSelected);
};
const deleteSelected = () => {
  if (selectedCount.value === 0) return;
  uni.showToast({ title: `已删除 ${selectedCount.value} 项`, icon: 'none' });
  allWorks.forEach(w => w.managed = false);
  isManage.value = false;
};

const openDrawer = () => { drawerOpen.value = true; };
const openBgPicker = () => uni.showToast({ title: '背景选择开发中', icon: 'none' });
const goSearch = () => uni.showToast({ title: '搜索页开发中', icon: 'none' });
const changeAvatar = () => uni.showToast({ title: '更换头像', icon: 'none' });
const goEditProfile = () => uni.showToast({ title: '编辑资料页开发中', icon: 'none' });
const goFollowList = (type: string) => uni.showToast({ title: `${type}列表开发中`, icon: 'none' });
const goWorkDetail = (w: Work) => {
  if (isManage.value) return;
  uni.showToast({ title: `作品「${w.title || '未命名'}」详情开发中`, icon: 'none' });
};
const goPublish = () => uni.showToast({ title: '发布作品页开发中', icon: 'none' });

const onLoadMore = () => {
  if (loading.value || noMore.value) return;
  loading.value = true;
  setTimeout(() => { noMore.value = true; loading.value = false; }, 600);
};

onMounted(() => {
  const sys = uni.getSystemInfoSync();
  scrollH.value = sys.windowHeight - 360; // 减去头部+tabs+tabbar
});
</script>

<style lang="scss" scoped>
.page-gallery {
  min-height: 100vh;
  background: #EEF4FC;
  position: relative;
}

// 头部
.gallery-header {
  padding-bottom: 8px;
}
.header-top {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 16px; padding-top: 30px;
}
.header-menu { padding: 4px; }
.header-menu-icon { font-size: 22px; color: #0E1F3A; }
.bg-btn {
  display: flex; align-items: center; gap: 4px;
  background: rgba(91, 159, 232, 0.12); color: #3B7PC8;
  padding: 5px 12px; border-radius: 8px;
}
.bg-btn-icon { font-size: 14px; }
.bg-btn-text { font-size: 12px; font-weight: 600; }
.header-search { padding: 4px; }
.header-search-icon { font-size: 20px; color: #0E1F3A; }

// 用户信息
.user-row {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 12px 16px 0;
}
.avatar-wrap { position: relative; flex-shrink: 0; }
.user-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  background: linear-gradient(135deg, #B8A5E3, #5B9FE8, #6FD4B0);
  display: flex; align-items: center; justify-content: center;
}
.user-avatar-text { font-size: 28px; color: #fff; font-weight: 700; }
.avatar-add {
  position: absolute; bottom: -2px; right: -2px;
  width: 24px; height: 24px; border-radius: 50%;
  background: #5B9FE8; border: 2px solid #EEF4FC;
  display: flex; align-items: center; justify-content: center;
}
.avatar-add-icon { font-size: 14px; color: #fff; font-weight: 700; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 18px; font-weight: 700; color: #0E1F3A; display: block; }
.user-id { font-size: 13px; color: #8497B5; margin-top: 3px; display: block; }
.user-gender { margin-top: 2px; }
.gender-tag {
  background: rgba(255, 168, 184, 0.22); color: #FFA8B8;
  padding: 2px 8px; border-radius: 999px; font-size: 12px;
}
.user-signature {
  padding: 10px 16px 0; font-size: 14px; color: #445876;
  line-height: 1.5; display: block;
}
.user-tags { padding: 8px 16px 0; }
.user-tag {
  background: rgba(184, 165, 227, 0.2); color: #8470C7;
  padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
}

// 统计
.stats-row {
  display: flex; align-items: center; padding: 16px 16px 8px;
}
.stats-list { flex: 1; display: flex; gap: 28px; }
.stat-item { text-align: center; }
.stat-num { font-size: 18px; font-weight: 700; }
.stat-label { font-size: 13px; color: #8497B5; margin-left: 4px; }
.edit-btn {
  padding: 6px 16px; background: #5B9FE8; color: #fff;
  border-radius: 10px; font-size: 13px; font-weight: 600;
  box-shadow: 0 4px 14px rgba(91, 159, 232, 0.35);
  &:active { transform: scale(0.96); }
}

// Tabs
.gallery-tabs-row {
  display: flex; align-items: center; padding: 0 16px;
  margin-bottom: 12px; gap: 8px;
}
.gallery-tabs {
  flex: 1; display: flex; align-items: center; gap: 20px;
}
.tab-wrap {
  display: flex; flex-direction: column; align-items: center;
  padding-bottom: 6px;
}
.gallery-tab {
  font-size: 13px; font-weight: 500; color: #8497B5;
  transition: color 0.3s;
  &.active { font-weight: 700; color: #5B9FE8; }
}
.tab-indicator {
  width: 20px; height: 3px; border-radius: 999px;
  background: #5B9FE8; margin-top: 4px;
}
.manage-btn {
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
}
.manage-icon { font-size: 16px; color: #8497B5; }
.manage-text { font-size: 13px; color: #8497B5; }

// 管理模式栏
.manage-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px; max-height: 0; opacity: 0; overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border-top: 0.5px solid rgba(91, 159, 232, 0.14);
  transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s, padding 0.35s;
  &.show { max-height: 48px; opacity: 1; padding: 10px 16px; }
}
.manage-count { font-size: 13px; color: #445876; flex: 1; }
.manage-select-all {
  padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
  background: rgba(91, 159, 232, 0.12); color: #3B7PC8;
}
.manage-delete {
  padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
  background: #FFA8B8; color: #fff; opacity: 0.5;
  &.active { opacity: 1; }
}

// 瀑布流
.gallery-scroll { padding: 0; }
.waterfall-wrap {
  padding: 0 12px; display: flex; gap: 8px;
}
.waterfall { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.wf-card {
  background: #fff; border: 1px solid rgba(91, 159, 232, 0.14);
  border-radius: 16px; overflow: hidden; position: relative;
  &.selected { border-color: #5B9FE8; box-shadow: 0 0 0 2px rgba(91, 159, 232, 0.3); }
}
.wf-check {
  position: absolute; top: 8px; left: 8px; z-index: 5;
  width: 22px; height: 22px; border-radius: 50%;
  background: #5B9FE8; color: #fff; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.wf-img-wrap { width: 100%; overflow: hidden; }
.wf-img { width: 100%; display: block; }
.wf-info { padding: 6px 8px; }
.wf-title {
  font-size: 12px; font-weight: 600; color: #0E1F3A;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;
}
.wf-draft-badge {
  position: absolute; top: 8px; right: 8px;
  background: rgba(255, 255, 255, 0.85); color: #5B9FE8;
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 8px;
}

// 加载更多
.load-more {
  display: flex; align-items: center; justify-content: center;
  padding: 18px 0 30px;
}
.load-spinner {
  width: 24px; height: 24px;
  border: 2.5px solid rgba(91, 159, 232, 0.2);
  border-top-color: #5B9FE8; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-text { font-size: 12px; color: #8497B5; }

// 悬浮发布按钮
.publish-fab {
  position: fixed; bottom: 108px; right: 16px;
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(91,159,232,0.85), rgba(70,130,210,0.9));
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  backdrop-filter: blur(16px) saturate(180%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(91, 159, 232, 0.35), 0 2px 8px rgba(0,0,0,0.1);
  z-index: 75;
  &:active { transform: scale(0.93); }
}
.publish-fab-icon { font-size: 24px; color: #fff; font-weight: 300; }

// 左侧抽屉 (复用广场页样式)
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 150;
}
.left-drawer {
  position: fixed; top: 0; bottom: 0; left: 0; width: 280px;
  background: #fff; z-index: 200;
  transform: translateX(-100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 24px 56px rgba(60, 120, 200, 0.16);
  display: flex; flex-direction: column;
  &.show { transform: translateX(0); }
}
.drawer-header {
  padding: 90px 20px 24px;
  background: linear-gradient(180deg, #E1EBF8 0%, #F5F9FE 100%);
  border-bottom: 1px solid rgba(91, 159, 232, 0.14);
}
.drawer-user { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.drawer-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  background: linear-gradient(135deg, #B8A5E3, #5B9FE8, #6FD4B0);
  display: flex; align-items: center; justify-content: center;
}
.drawer-avatar-text { font-size: 20px; color: #fff; font-weight: 700; }
.drawer-name { font-size: 17px; font-weight: 700; color: #0E1F3A; }
.drawer-credits { display: flex; gap: 4px; margin-top: 3px; }
.drawer-credits-num { font-size: 16px; font-weight: 700; color: #5B9FE8; }
.drawer-credits-label { font-size: 14px; color: #8497B5; }
.drawer-shortcuts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.drawer-shortcut { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.shortcut-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.shortcut-text { font-size: 12px; color: #445876; }
.drawer-menu { flex: 1; padding: 12px 0; }
.drawer-row {
  display: flex; align-items: center; gap: 12px; padding: 13px 16px;
  &:active { background: rgba(91, 159, 232, 0.08); }
}
.drawer-row-icon { font-size: 22px; width: 22px; text-align: center; flex-shrink: 0; }
.drawer-row-text { flex: 1; font-size: 15px; color: #0E1F3A; }
.drawer-row-arrow { color: #8497B5; font-size: 18px; }
.drawer-badge {
  min-width: 18px; height: 18px; padding: 0 5px;
  background: #FFA8B8; color: #fff; font-size: 10px; font-weight: 700;
  border-radius: 999px; display: flex; align-items: center; justify-content: center;
}
</style>

