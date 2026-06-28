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
          <view v-for="h in history" :key="h" class="history-tag" @click="keyword = h; doSearch()">{{ h }}</view>
        </view>
      </view>
      <view class="section">
        <view class="section-header">
          <text class="section-title">🔥 热门搜索</text>
        </view>
        <view class="hot-list">
          <view v-for="(h, i) in hotSearches" :key="h" class="hot-item" @click="keyword = h; doSearch()">
            <text class="hot-rank" :style="{ color: i < 3 ? '#FFB59A' : '#8497B5' }">{{ i + 1 }}</text>
            <text class="hot-keyword">{{ h }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-else class="result-area">
      <view class="waterfall-wrap">
        <view class="waterfall">
          <view v-for="w in leftCol" :key="w.id" class="wf-item">
            <view class="wf-card">
              <image :src="w.img" mode="widthFix" class="wf-img" />
              <view class="wf-info"><text class="wf-title">{{ w.title }}</text></view>
            </view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in rightCol" :key="w.id" class="wf-item">
            <view class="wf-card">
              <image :src="w.img" mode="widthFix" class="wf-img" />
              <view class="wf-info"><text class="wf-title">{{ w.title }}</text></view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const keyword = ref('');
const hasSearched = ref(false);
const history = ref(['梦幻城堡', '猫咪水彩', '日落风景']);
const hotSearches = ['赛博朋克', '古风少女', '证件照', '宠物头像', '二次元', '国风山水', 'Logo设计', '表情包'];

const mockResults = [
  { id: 1, img: 'https://picsum.photos/seed/s1/300/420', title: '霓虹都市' },
  { id: 2, img: 'https://picsum.photos/seed/s2/300/225', title: '山水之间' },
  { id: 3, img: 'https://picsum.photos/seed/s3/300/450', title: '少女与猫' },
  { id: 4, img: 'https://picsum.photos/seed/s4/300/300', title: '抽象梦境' },
];

const leftCol = computed(() => mockResults.filter((_, i) => i % 2 === 0));
const rightCol = computed(() => mockResults.filter((_, i) => i % 2 === 1));

const doSearch = () => {
  if (!keyword.value.trim()) return;
  if (!history.value.includes(keyword.value)) {
    history.value.unshift(keyword.value);
    if (history.value.length > 10) history.value.pop();
  }
  hasSearched.value = true;
};
const clearHistory = () => { history.value = []; };
const goBack = () => uni.navigateBack();
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
.search-input { width: 100%; padding: 10px 14px; padding-left: 38px; border-radius: 12px; border: 1.5px solid rgba(91,159,232,0.14); background: #FBFDFF; font-size: 14px; color: #0E1F3A; }
.search-btn { padding: 10px 16px; color: #5B9FE8; font-weight: 600; font-size: 14px; display: flex; align-items: center; }

.section { padding: 0 16px; margin-bottom: 18px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.section-title { font-size: 16px; font-weight: 700; color: #0E1F3A; }
.section-more { font-size: 13px; color: #8497B5; }

.history-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.history-tag { padding: 6px 14px; font-size: 13px; background: #E1EBF8; color: #445876; border-radius: 999px; }

.hot-list { display: flex; flex-direction: column; }
.hot-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 0.5px solid rgba(91,159,232,0.08); &:active { background: rgba(91,159,232,0.05); } }
.hot-rank { font-size: 16px; font-weight: 700; width: 24px; text-align: center; }
.hot-keyword { font-size: 14px; color: #0E1F3A; flex: 1; }

.result-area { padding: 0 0 20px; }
.waterfall-wrap { padding: 0 12px; display: flex; gap: 8px; }
.waterfall { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.wf-card { background: #fff; border: 1px solid rgba(91,159,232,0.14); border-radius: 16px; overflow: hidden; }
.wf-img { width: 100%; display: block; }
.wf-info { padding: 6px 8px; }
.wf-title { font-size: 12px; font-weight: 600; color: #0E1F3A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
</style>
