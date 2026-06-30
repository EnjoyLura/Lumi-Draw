<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">搜索</text>
      <view style="width:40px;" />
    </view>

    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input class="search-input" v-model="keyword" placeholder="搜索作品、提示词或用户" @confirm="doSearch" />
      </view>
      <view class="search-btn" @click="doSearch">搜索</view>
    </view>

    <!-- 默认状态: 历史 + 热门 -->
    <view v-if="!hasSearched">
      <view class="section">
        <view class="section-header">
          <text class="section-title">搜索历史</text>
          <text class="section-more" @click="clearHistory">清空</text>
        </view>
        <view class="history-tags">
          <view v-for="h in history" :key="h" class="history-tag" @click="keyword = h">{{ h }}</view>
        </view>
      </view>
      <view class="section">
        <view class="section-header">
          <text class="section-title">🔥 热门搜索</text>
        </view>
        <view class="hot-list">
          <view v-for="(h, i) in hotSearches" :key="h" class="hot-item" @click="keyword = h">
            <text class="hot-rank" :style="{ color: hotColors[i] || '#8497B5' }">{{ i + 1 }}</text>
            <text class="hot-keyword">{{ h }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-else class="result-area">
      <view class="waterfall-wrap">
        <view class="waterfall">
          <view v-for="w in leftCol" :key="w.id" class="wf-item" @click="goWorkDetail(w)">
            <view class="wf-card">
              <view class="wf-img-wrap"><image :src="w.img" mode="widthFix" class="wf-img" /></view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title }}</text>
                <view class="wf-meta">
                  <view class="wf-author">
                    <view class="wf-avatar" :style="{ background: w.color }"><text class="wf-avatar-text">{{ w.avatar }}</text></view>
                    <text class="wf-author-name">{{ w.author }}</text>
                  </view>
                  <view class="wf-like" @click.stop="w.liked = !w.liked; w.likes += w.liked ? 1 : -1">
                    <text class="wf-like-icon" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.liked ? '♥' : '♡' }}</text>
                    <text class="wf-like-num" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.likes }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in rightCol" :key="w.id" class="wf-item" @click="goWorkDetail(w)">
            <view class="wf-card">
              <view class="wf-img-wrap"><image :src="w.img" mode="widthFix" class="wf-img" /></view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title }}</text>
                <view class="wf-meta">
                  <view class="wf-author">
                    <view class="wf-avatar" :style="{ background: w.color }"><text class="wf-avatar-text">{{ w.avatar }}</text></view>
                    <text class="wf-author-name">{{ w.author }}</text>
                  </view>
                  <view class="wf-like" @click.stop="w.liked = !w.liked; w.likes += w.liked ? 1 : -1">
                    <text class="wf-like-icon" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.liked ? '♥' : '♡' }}</text>
                    <text class="wf-like-num" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.likes }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { configApi, workApi, getUserDisplay, getUserInfo } from '@/utils/api';

const keyword = ref('');
const hasSearched = ref(false);
const history = ref<string[]>([]);
const hotSearches = ref<string[]>([]);
const hotColors: Record<number, string> = { 0: '#E03050', 1: '#E87040', 2: '#F0A060' };
const searchResults = reactive<any[]>([]);

const leftCol = computed(() => searchResults.filter((_, i) => i % 2 === 0));
const rightCol = computed(() => searchResults.filter((_, i) => i % 2 === 1));

const mapWork = (w: any) => {
  const display = getUserDisplay(w.user_id);
  const user = getUserInfo(w.user_id);
  return {
    id: w.id,
    img: w.image_urls?.[0] || '',
    title: w.title || '',
    author: user?.nickname || '',
    avatar: display.avatar,
    color: display.color,
    likes: w.likes_count || 0,
    liked: false,
  };
};

const doSearch = async () => {
  if (!keyword.value.trim()) return;
  if (!history.value.includes(keyword.value)) {
    history.value.unshift(keyword.value);
    if (history.value.length > 10) history.value.pop();
  }
  try {
    const res = await workApi.searchWorks(keyword.value);
    const list = (res.data?.list || res.data || []).map(mapWork);
    searchResults.splice(0, searchResults.length, ...list);
  } catch {
    searchResults.splice(0, searchResults.length);
  }
  hasSearched.value = true;
};
const clearHistory = () => { history.value = []; };
const goWorkDetail = (w: any) => uni.navigateTo({ url: `/pages/work-detail/index?id=${w.id}` });
const goBack = () => uni.navigateBack();

onMounted(async () => {
  // 加载热搜词
  try {
    const res = await configApi.getHotSearches();
    const list = (res.data || res || []) as any[];
    hotSearches.value = list.map((h: any) => h.keyword);
  } catch {}
  // 加载历史（从本地缓存）
  try {
    const cached = uni.getStorageSync('search_history');
    if (cached) history.value = JSON.parse(cached);
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

.search-bar { display: flex; gap: 10px; padding: 12px 16px; padding-top: 86px; }
.search-input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 12px; font-size: 16px; color: #8497B5; z-index: 1; }
.search-input { width: 100%; height: 40px; padding: 0 14px; padding-left: 38px; border-radius: 12px; border: 1.5px solid rgba(91,159,232,0.14); background: #FBFDFF; font-size: 14px; color: #0E1F3A; }
.search-btn { padding: 10px 16px; color: #5B9FE8; font-weight: 600; font-size: 14px; display: flex; align-items: center; }

.section { padding: 0 16px; margin-bottom: 18px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.section-title { font-size: 16px; font-weight: 700; color: #0E1F3A; }
.section-more { font-size: 13px; color: #8497B5; }

.history-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.history-tag { padding: 6px 14px; font-size: 13px; background: transparent; color: #445876; border-radius: 999px; border: 1px solid rgba(91,159,232,0.32); }

.hot-list { display: flex; flex-direction: column; }
.hot-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 0.5px solid rgba(91,159,232,0.08); &:active { background: rgba(91,159,232,0.05); } }
.hot-rank { font-size: 16px; font-weight: 700; width: 24px; text-align: center; }
.hot-keyword { font-size: 14px; color: #0E1F3A; flex: 1; }

.result-area { padding: 0 0 20px; }
.waterfall-wrap { padding: 0 12px; display: flex; gap: 8px; }
.waterfall { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.wf-card {
  background: #fff; border: 1px solid rgba(91,159,232,0.14); border-radius: 20px; overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
}
.wf-img-wrap { width: 100%; overflow: hidden; cursor: pointer; &:active { transform: scale(0.97); } }
.wf-img { width: 100%; display: block; }
.wf-info { padding: 8px 10px 6px; }
.wf-title { font-size: 13px; font-weight: 600; color: #0E1F3A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; margin-bottom: 2px; }
.wf-meta { display: flex; align-items: center; justify-content: space-between; }
.wf-author { display: flex; align-items: center; gap: 5px; flex: 1; overflow: hidden; }
.wf-avatar { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wf-avatar-text { font-size: 10px; color: #fff; font-weight: 700; }
.wf-author-name { font-size: 11px; color: #445876; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wf-like { display: flex; align-items: center; gap: 3px; flex-shrink: 0; padding: 2px 4px; border-radius: 8px; }
.wf-like-icon { font-size: 16px; transition: all 0.3s; }
.wf-like-num { font-size: 13px; font-weight: 600; }
</style>
