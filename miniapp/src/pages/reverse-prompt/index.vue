<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">反推提示词</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="upload-card">
        <view v-if="!uploadedImg" class="upload-area" @click="uploadImg">
          <text class="upload-icon">🖼</text>
          <text class="upload-title">上传图片</text>
          <text class="upload-desc">AI将分析图片并生成提示词</text>
        </view>
        <view v-else class="img-preview">
          <image :src="uploadedImg" mode="aspectFill" class="preview-img" />
        </view>
        <view class="analyze-btn" @click="startAnalyze">🔍 开始分析 (消耗5积分)</view>
      </view>

      <view v-if="showResult" class="result-section">
        <text class="section-label">分析结果</text>
        <view class="result-card">
          <textarea class="result-text" v-model="resultText" placeholder="分析结果将显示在这里..." />
        </view>
        <view class="result-actions">
          <view class="action-btn secondary" @click="copyResult">复制</view>
          <view class="action-btn gradient" @click="useInCreate">带入创作</view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const uploadedImg = ref('');
const showResult = ref(false);
const resultText = ref('');

const uploadImg = () => {
  uploadedImg.value = `https://picsum.photos/seed/reverse${Date.now()}/600/400`;
};
const startAnalyze = () => {
  if (!uploadedImg.value) { uni.showToast({ title: '请先上传图片', icon: 'none' }); return; }
  uni.showLoading({ title: '分析中...' });
  setTimeout(() => {
    uni.hideLoading();
    showResult.value = true;
    resultText.value = 'a beautiful anime girl with long blue hair, sitting by a window, soft sunlight, cherry blossoms outside, detailed eyes, studio ghibli style, warm color palette, dreamy atmosphere';
  }, 1500);
};
const copyResult = () => uni.showToast({ title: '已复制到剪贴板', icon: 'none' });
const useInCreate = () => {
  uni.showToast({ title: '已带入创作页', icon: 'none' });
  setTimeout(() => uni.switchTab({ url: '/pages/create/index' }), 800);
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

.upload-card { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); padding: 20px; text-align: center; margin-bottom: 16px; }
.upload-area { border: 2px dashed rgba(91,159,232,0.32); border-radius: 16px; padding: 40px 20px; }
.upload-icon { font-size: 48px; color: #5B9FE8; display: block; margin-bottom: 10px; }
.upload-title { font-size: 15px; font-weight: 600; color: #0E1F3A; display: block; }
.upload-desc { font-size: 12px; color: #8497B5; margin-top: 4px; display: block; }
.img-preview { margin-bottom: 12px; }
.preview-img { width: 100%; max-height: 200px; border-radius: 12px; }
.analyze-btn { width: 100%; padding: 14px 0; margin-top: 12px; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; font-size: 15px; font-weight: 600; border-radius: 14px; text-align: center; box-shadow: 0 4px 14px rgba(91,159,232,0.35); }
.analyze-btn:active { transform: scale(0.97); }

.section-label { font-size: 16px; font-weight: 700; color: #0E1F3A; margin-bottom: 10px; display: block; }
.result-card { background: #fff; border-radius: 16px; border: 1px solid rgba(91,159,232,0.14); padding: 14px; margin-bottom: 12px; }
.result-text { width: 100%; min-height: 100px; border: none; background: none; font-size: 14px; color: #0E1F3A; resize: none; line-height: 1.6; }
.result-actions { display: flex; gap: 10px; margin-bottom: 20px; }
.action-btn { flex: 1; padding: 12px 0; text-align: center; border-radius: 12px; font-size: 14px; font-weight: 600; }
.action-btn.secondary { border: 1px solid rgba(91,159,232,0.32); color: #0E1F3A; }
.action-btn.gradient { background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; }
</style>
