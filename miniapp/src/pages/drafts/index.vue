<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">草稿箱</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="waterfall-wrap">
        <view class="waterfall">
          <view v-for="w in leftCol" :key="w.id" class="wf-item" @click="goEdit(w)">
            <view class="wf-card">
              <view class="wf-draft-badge">草稿</view>
              <view class="wf-img-wrap">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title }}</text>
                <view class="wf-meta">
                  <view class="wf-author">
                    <view class="wf-avatar"><text class="wf-avatar-text">梦</text></view>
                    <text class="wf-author-name">云端造梦师</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in rightCol" :key="w.id" class="wf-item" @click="goEdit(w)">
            <view class="wf-card">
              <view class="wf-draft-badge">草稿</view>
              <view class="wf-img-wrap">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title }}</text>
                <view class="wf-meta">
                  <view class="wf-author">
                    <view class="wf-avatar"><text class="wf-avatar-text">梦</text></view>
                    <text class="wf-author-name">云端造梦师</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { workApi } from '@/utils/api';

const scrollH = ref(700);
const drafts = ref<any[]>([
  { id: 13, img: 'https://picsum.photos/seed/w13/300/400', title: '花园里的可爱机器人' },
  { id: 14, img: 'https://picsum.photos/seed/w14/300/300', title: '发光蘑菇的魔法森林' },
  { id: 15, img: 'https://picsum.photos/seed/w15/300/530', title: '星空下的灯塔' },
  { id: 16, img: 'https://picsum.photos/seed/w16/300/225', title: '竹林深处的古寺' },
  { id: 17, img: 'https://picsum.photos/seed/w17/300/400', title: '赛博朋克风格的猫咪' },
  { id: 18, img: 'https://picsum.photos/seed/w18/300/300', title: '水墨风格的鲤鱼跃龙门' },
  { id: 19, img: 'https://picsum.photos/seed/w19/300/400', title: '午后阳光下的咖啡馆' },
  { id: 20, img: 'https://picsum.photos/seed/w20/300/530', title: '二次元少女骑在巨龙上' },
]);
const leftCol = computed(() => drafts.value.filter((_, i) => i % 2 === 0));
const rightCol = computed(() => drafts.value.filter((_, i) => i % 2 === 1));
const goEdit = (w: any) => uni.navigateTo({ url: `/pages/work-detail/index?id=${w.id}` });
const goBack = () => uni.navigateBack();
onMounted(async () => {
  scrollH.value = uni.getSystemInfoSync().windowHeight - 80;
  try {
    const res = await workApi.getMyWorks();
    const data = res.data || res;
    const draftList = (data.drafts || []) as any[];
    if (draftList.length > 0) {
      drafts.value = draftList.map((w: any) => ({
        id: w.id,
        img: w.image_urls?.[0] || '',
        title: w.title || '未命名作品',
      }));
    }
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
.page-scroll { padding-top: 74px; }
.waterfall-wrap { padding: 0 12px; display: flex; gap: 8px; }
.waterfall { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.wf-card {
  background: #fff; border: 1px solid rgba(91,159,232,0.14); border-radius: 20px;
  overflow: hidden; position: relative;
  transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
  &:active { transform: scale(0.97); }
}
.wf-img-wrap { width: 100%; overflow: hidden; }
.wf-img { width: 100%; display: block; }
.wf-info { padding: 8px 10px 6px; }
.wf-title {
  font-size: 13px; font-weight: 600; color: #0E1F3A; display: block;
  margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wf-meta { display: flex; align-items: center; justify-content: space-between; }
.wf-author { display: flex; align-items: center; gap: 5px; flex: 1; overflow: hidden; }
.wf-avatar {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  background: #5B9FE8; display: flex; align-items: center; justify-content: center;
}
.wf-avatar-text { font-size: 10px; color: #fff; font-weight: 700; }
.wf-author-name {
  font-size: 11px; color: #445876;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wf-draft-badge {
  position: absolute; top: 8px; right: 8px; z-index: 5;
  background: rgba(255,255,255,0.85);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: #5B9FE8; font-size: 10px; font-weight: 600;
  padding: 3px 8px; border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
</style>
