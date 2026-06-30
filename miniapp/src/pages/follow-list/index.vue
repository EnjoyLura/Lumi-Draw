<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">{{ pageTitle }}</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view v-for="u in users" :key="u.id" class="user-item">
        <view class="user-avatar" :style="{ background: u.color }"><text class="user-avatar-text">{{ u.avatar }}</text></view>
        <view class="user-info">
          <text class="user-name">{{ u.name }}</text>
          <text class="user-bio">{{ u.bio }}</text>
        </view>
        <view :class="['follow-btn', { following: u.followed }]" @click="u.followed = !u.followed">{{ u.followed ? '已关注' : '+ 关注' }}</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { socialApi, getUserDisplay } from '@/utils/api';

const scrollH = ref(700);
const listType = ref('following');
const pageTitle = computed(() => listType.value === 'following' ? '我的关注' : '我的粉丝');
const users = ref<any[]>([]);
const goBack = () => uni.navigateBack();

onMounted(async () => {
  scrollH.value = uni.getSystemInfoSync().windowHeight - 80;
  const pages = getCurrentPages();
  const curPage = pages[pages.length - 1] as any;
  const options = curPage?.$page?.options || curPage?.options || {};
  if (options.type) listType.value = options.type;

  try {
    const res = await socialApi.getFollowList(listType.value);
    const list = (res.data || res || []) as any[];
    users.value = list.map((u: any) => {
      const display = getUserDisplay(u.id);
      return {
        id: u.id,
        name: u.nickname,
        avatar: display.avatar,
        color: display.color,
        bio: u.signature || '',
        followed: listType.value === 'following',
      };
    });
  } catch {}
});
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.page-scroll { padding-top: 90px; }
.user-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.user-item:active { background: rgba(91,159,232,0.05); }
.user-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-avatar-text { font-size: 16px; color: #fff; font-weight: 700; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 15px; font-weight: 600; color: #0E1F3A; display: block; }
.user-bio { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.follow-btn { padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #5B9FE8; color: #fff; flex-shrink: 0; }
.follow-btn.following { background: #E1EBF8; color: #8497B5; }
</style>
