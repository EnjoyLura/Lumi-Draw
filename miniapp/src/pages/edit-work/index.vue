<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">编辑作品</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="form-section">
        <text class="form-label">作品预览</text>
        <view class="preview-card">
          <image src="https://picsum.photos/seed/w3/200/200" mode="aspectFill" class="preview-img" />
          <view class="preview-info"><text class="preview-model">GPT Image 2</text><text class="preview-meta">3:4 · 二次元 · 680赞</text></view>
        </view>
      </view>
      <view class="form-section">
        <text class="form-label">作品标题</text>
        <input class="form-input" v-model="title" maxlength="30" placeholder="给作品起个名字" />
        <text class="form-count">{{ title.length }}/30</text>
      </view>
      <view class="form-section">
        <text class="form-label">作品描述</text>
        <textarea class="form-textarea" v-model="desc" maxlength="200" placeholder="介绍一下你的创作灵感吧~" />
        <text class="form-count">{{ desc.length }}/200</text>
      </view>
      <view class="form-section">
        <view class="tags-header"><text class="form-label">作品标签</text><text class="tags-hint">最多选5个</text></view>
        <view class="tags-grid">
          <view v-for="t in allTags" :key="t" :class="['tag-chip', { active: selectedTags.includes(t) }]" @click="toggleTag(t)">{{ t }}</view>
        </view>
      </view>
      <view class="save-btn" @click="save">✓ 保存修改</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const title = ref('少女与猫');
const desc = ref('吉卜力风格的少女与猫咪，温暖柔和的光线');
const selectedTags = ref(['二次元', '人像']);
const allTags = ['人物', '风景', '建筑', '动物', '科幻', '奇幻', '写实', '二次元', '水彩', '油画', '像素', '3D', '日常', '节日', '壁纸', '头像'];
const toggleTag = (t: string) => {
  const idx = selectedTags.value.indexOf(t);
  if (idx >= 0) selectedTags.value.splice(idx, 1);
  else if (selectedTags.value.length < 5) selectedTags.value.push(t);
};
const save = () => { uni.showToast({ title: '修改已保存', icon: 'success' }); setTimeout(() => uni.navigateBack(), 1000); };
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
.form-section { margin-bottom: 18px; }
.form-label { font-size: 14px; font-weight: 700; color: #0E1F3A; margin-bottom: 8px; display: block; }
.form-input { width: 100%; padding: 12px 14px; border-radius: 12px; background: #fff; font-size: 14px; color: #0E1F3A; box-sizing: border-box; border: 1px solid rgba(91,159,232,0.14); }
.form-textarea { width: 100%; min-height: 80px; padding: 12px 14px; border-radius: 12px; background: #fff; font-size: 14px; color: #0E1F3A; resize: none; line-height: 1.6; box-sizing: border-box; border: 1px solid rgba(91,159,232,0.14); }
.form-count { text-align: right; font-size: 11px; color: #8497B5; margin-top: 4px; display: block; }
.preview-card { background: #fff; border-radius: 16px; border: 1px solid rgba(91,159,232,0.14); padding: 14px; display: flex; align-items: center; gap: 12px; }
.preview-img { width: 56px; height: 56px; border-radius: 10px; flex-shrink: 0; }
.preview-model { font-size: 14px; font-weight: 700; color: #0E1F3A; display: block; }
.preview-meta { font-size: 12px; color: #8497B5; margin-top: 2px; }
.tags-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.tags-hint { font-size: 12px; color: #8497B5; }
.tags-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-chip { padding: 6px 14px; font-size: 13px; font-weight: 500; border-radius: 999px; background: #fff; border: 1px solid rgba(91,159,232,0.2); color: #445876; &.active { background: rgba(91,159,232,0.12); border-color: #5B9FE8; color: #3B7FC8; } }
.save-btn { width: 100%; padding: 14px 0; text-align: center; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; font-size: 16px; font-weight: 700; border-radius: 14px; margin-top: 8px; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(91,159,232,0.35); &:active { transform: scale(0.97); } }
</style>
