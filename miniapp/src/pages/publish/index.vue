<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">发布作品</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="form-section">
        <text class="form-label">选择作品</text>
        <view class="draft-card" @click="openDraftPicker">
          <view v-if="!selectedDraft" class="draft-placeholder">
            <view class="draft-icon">🖼</view>
            <view class="draft-info"><text class="draft-title">从草稿箱选择</text><text class="draft-desc">点击浏览全部草稿作品</text></view>
          </view>
          <view v-else class="draft-selected">
            <image :src="selectedDraft.img" mode="aspectFill" class="draft-img" />
            <view class="draft-selected-info"><text class="draft-selected-title">{{ selectedDraft.title }}</text><text class="draft-selected-meta">{{ selectedDraft.meta }}</text></view>
          </view>
          <text class="draft-arrow">›</text>
        </view>
      </view>

      <view class="form-section">
        <text class="form-label">作品标题</text>
        <view class="input-card" :class="{ focused: titleFocused }">
          <input class="form-input" v-model="title" maxlength="30" placeholder="给作品起个名字" @focus="titleFocused = true" @blur="titleFocused = false" />
        </view>
        <text class="form-count">{{ title.length }}/30</text>
      </view>

      <view class="form-section">
        <text class="form-label">作品描述</text>
        <view class="textarea-card" :class="{ focused: descFocused }">
          <textarea class="form-textarea" v-model="desc" maxlength="200" placeholder="介绍一下你的创作灵感吧~" @focus="descFocused = true" @blur="descFocused = false" />
        </view>
        <text class="form-count">{{ desc.length }}/200</text>
      </view>

      <view class="form-section">
        <view class="tags-header"><text class="form-label">作品标签</text><text class="tags-hint">最多选5个</text></view>
        <view class="tags-grid">
          <view v-for="(t, i) in allTags" :key="t" :class="['tag-chip', tagColorClass(t)]" @click="toggleTag(t)">{{ t }}</view>
        </view>
      </view>

      <view class="publish-btn" @click="publish">✈ 发布作品</view>
    </scroll-view>

    <!-- 草稿选择抽屉 -->
    <view v-if="showDraftPicker" class="sheet-overlay" @click="showDraftPicker = false" />
    <view :class="['bottom-sheet', { show: showDraftPicker }]">
      <view class="sheet-handle" />
      <text class="sheet-title">选择草稿作品</text>
      <view class="draft-grid">
        <view v-for="d in drafts" :key="d.id" class="draft-grid-item" @click="pickDraft(d)">
          <view class="draft-grid-img-wrap">
            <image :src="d.img" mode="aspectFill" class="draft-grid-img" />
          </view>
          <text class="draft-grid-name">{{ d.title }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const title = ref('');
const desc = ref('');
const titleFocused = ref(false);
const descFocused = ref(false);
const selectedDraft = ref<any>(null);
const selectedTags = ref<string[]>([]);
const showDraftPicker = ref(false);

const allTags = ['人物', '风景', '建筑', '动物', '科幻', '奇幻', '写实', '二次元', '水彩', '油画', '像素', '3D', '日常', '节日', '壁纸', '头像'];
const tagColors: Record<string, string> = {
  '人物': 'accent', '风景': 'mint', '建筑': 'lavender', '动物': 'peach',
  '科幻': 'accent', '奇幻': 'lavender', '写实': 'mint', '二次元': 'rose',
  '水彩': 'peach', '油画': 'lavender', '像素': 'accent', '3D': 'mint',
  '日常': 'peach', '节日': 'rose', '壁纸': 'accent', '头像': 'lavender',
};

const drafts = [
  { id: 13, img: 'https://picsum.photos/seed/w13/300/400', title: '花园机器人', meta: 'GPT Image 2 · 3:4' },
  { id: 14, img: 'https://picsum.photos/seed/w14/300/300', title: '魔法森林', meta: 'Flux Pro · 1:1' },
  { id: 15, img: 'https://picsum.photos/seed/w15/300/530', title: '星空灯塔', meta: 'SDXL · 9:16' },
  { id: 16, img: 'https://picsum.photos/seed/w16/300/225', title: '竹林古寺', meta: 'Nano Banana 2 · 4:3' },
  { id: 17, img: 'https://picsum.photos/seed/w17/300/400', title: '赛博猫咪', meta: 'GPT Image 2 · 3:4' },
  { id: 18, img: 'https://picsum.photos/seed/w18/300/300', title: '水墨鲤鱼', meta: 'SDXL · 1:1' },
];

const tagColorClass = (t: string) => {
  if (!selectedTags.value.includes(t)) return '';
  return 'active-' + (tagColors[t] || 'accent');
};

const openDraftPicker = () => { showDraftPicker.value = true; };
const pickDraft = (d: any) => {
  selectedDraft.value = d;
  showDraftPicker.value = false;
  if (!title.value) title.value = d.title;
};
const toggleTag = (t: string) => {
  const idx = selectedTags.value.indexOf(t);
  if (idx >= 0) selectedTags.value.splice(idx, 1);
  else if (selectedTags.value.length < 5) selectedTags.value.push(t);
  else uni.showToast({ title: '最多选5个标签', icon: 'none' });
};
const publish = () => {
  if (!selectedDraft.value) { uni.showToast({ title: '请先选择作品', icon: 'none' }); return; }
  uni.showToast({ title: '发布成功！', icon: 'success' });
  setTimeout(() => uni.navigateBack(), 1000);
};
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

.form-section { margin-bottom: 20px; }
.form-label { font-size: 14px; font-weight: 700; color: #0E1F3A; margin-bottom: 10px; display: block; }

// 输入框卡片包裹
.input-card, .textarea-card {
  background: #fff; border-radius: 20px; border: 1.5px solid rgba(91,159,232,0.14);
  overflow: hidden; transition: all 0.3s;
  &.focused { border-color: #5B9FE8; box-shadow: 0 0 0 3px rgba(91,159,232,0.12); }
}
.form-input { width: 100%; height: 44px; padding: 0 14px; background: none; font-size: 14px; color: #0E1F3A; border: none; outline: none; }
.form-textarea { width: 100%; min-height: 80px; padding: 12px 14px; background: none; font-size: 14px; color: #0E1F3A; resize: none; line-height: 1.6; border: none; outline: none; }
.form-count { text-align: right; font-size: 11px; color: #8497B5; margin-top: 4px; display: block; }

// 选择作品卡片
.draft-card {
  background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14);
  padding: 14px; display: flex; align-items: center; cursor: pointer;
}
.draft-placeholder { display: flex; align-items: center; gap: 12px; flex: 1; }
.draft-icon { width: 72px; height: 72px; border-radius: 12px; background: rgba(91,159,232,0.12); display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
.draft-info { flex: 1; }
.draft-title { font-size: 14px; font-weight: 600; color: #0E1F3A; display: block; }
.draft-desc { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; }
.draft-arrow { font-size: 20px; color: #8497B5; flex-shrink: 0; margin-left: auto; }
.draft-selected { display: flex; align-items: center; gap: 12px; flex: 1; }
.draft-img { width: 72px; height: 72px; border-radius: 12px; flex-shrink: 0; }
.draft-selected-info { flex: 1; min-width: 0; }
.draft-selected-title { font-size: 14px; font-weight: 700; color: #0E1F3A; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.draft-selected-meta { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; }

// 标签
.tags-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.tags-hint { font-size: 12px; color: #8497B5; }
.tags-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-chip {
  padding: 6px 14px; font-size: 13px; font-weight: 500; border-radius: 999px;
  background: #fff; border: 1px solid rgba(91,159,232,0.2); color: #445876;
  transition: all 0.2s;
  // 不同颜色的选中态
  &.active-accent { background: rgba(91,159,232,0.12); border-color: #5B9FE8; color: #3B7FC8; }
  &.active-mint { background: rgba(111,212,176,0.16); border-color: #6FD4B0; color: #4EAA8E; }
  &.active-lavender { background: rgba(184,165,227,0.2); border-color: #B8A5E3; color: #8470C7; }
  &.active-peach { background: rgba(255,181,154,0.2); border-color: #FFB59A; color: #E07A5A; }
  &.active-rose { background: rgba(255,168,184,0.22); border-color: #FFA8B8; color: #E07A8A; }
}

// 发布按钮
.publish-btn { width: 100%; padding: 14px 0; text-align: center; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; font-size: 16px; font-weight: 700; border-radius: 14px; margin-top: 8px; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(91,159,232,0.35); &:active { transform: scale(0.97); } }

// 草稿选择抽屉
.sheet-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.4); }
.bottom-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
  background: #fff; border-radius: 24px 24px 0 0;
  box-shadow: 0 -8px 30px rgba(60,120,200,0.12);
  transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
  max-height: 65vh; overflow-y: auto; padding-bottom: 30px;
  &.show { transform: translateY(0); }
}
.sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(91,159,232,0.3); margin: 10px auto 4px; }
.sheet-title { font-size: 16px; font-weight: 600; color: #0E1F3A; display: block; padding: 10px 20px 16px; }
.draft-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 20px; }
.draft-grid-item { cursor: pointer; &:active { transform: scale(0.95); } }
.draft-grid-img-wrap { width: 100%; padding-bottom: 100%; position: relative; border-radius: 12px; overflow: hidden; }
.draft-grid-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.draft-grid-name { font-size: 11px; color: #445876; margin-top: 4px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
</style>
