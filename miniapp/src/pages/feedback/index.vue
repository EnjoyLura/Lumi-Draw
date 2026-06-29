<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">意见反馈</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="form-section">
        <text class="form-label">反馈类型</text>
        <view class="type-grid">
          <view v-for="t in types" :key="t.key" :class="['type-card', { active: selectedType === t.key }]" @click="selectedType = t.key">
            <text class="type-icon">{{ t.icon }}</text>
            <text class="type-name">{{ t.name }}</text>
          </view>
        </view>
      </view>
      <view class="form-section">
        <text class="form-label">反馈描述 <text class="form-hint">（选填）</text></text>
        <view class="textarea-card">
          <textarea class="form-textarea" v-model="desc" maxlength="500" placeholder="请详细描述您遇到的问题或建议…" />
        </view>
        <text class="form-count">{{ desc.length }}/500</text>
      </view>
      <view class="form-section">
        <text class="form-label">截图 <text class="form-hint">（选填，最多2张）</text></text>
        <view class="img-upload-area" @click="addImage">
          <text class="img-upload-icon">🖼</text>
          <text class="img-upload-text">添加图片</text>
        </view>
      </view>
      <view class="form-section">
        <text class="form-label">微信号 <text class="form-hint">（选填）</text></text>
        <view class="input-card">
          <input class="form-input" v-model="wechat" maxlength="30" placeholder="方便我们联系您" />
        </view>
      </view>
      <view class="submit-btn" @click="submit">✈ 提交反馈</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const selectedType = ref('bug');
const desc = ref('');
const wechat = ref('');
const types = [
  { key: 'bug', name: 'Bug反馈', icon: '🐛' },
  { key: 'experience', name: '体验反馈', icon: '😊' },
  { key: 'suggestion', name: '优化建议', icon: '💡' },
];
const addImage = () => uni.showToast({ title: '选择图片', icon: 'none' });
const submit = () => { uni.showToast({ title: '反馈已提交', icon: 'success' }); setTimeout(() => uni.navigateBack(), 1000); };
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
.form-hint { font-size: 12px; color: #8497B5; font-weight: 400; }
.input-card { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); overflow: hidden; }
.form-input { width: 100%; height: 44px; padding: 0 14px; background: none; font-size: 14px; color: #0E1F3A; box-sizing: border-box; border: none; outline: none; }
.textarea-card { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); overflow: hidden; }
.form-textarea { width: 100%; min-height: 100px; padding: 12px 14px; background: none; font-size: 14px; color: #0E1F3A; resize: none; line-height: 1.6; box-sizing: border-box; border: none; outline: none; }
.form-count { text-align: right; font-size: 11px; color: #8497B5; margin-top: 4px; display: block; }
.type-grid { display: flex; gap: 10px; }
.type-card { flex: 1; text-align: center; padding: 10px 0; border-radius: 12px; border: 2px solid rgba(91,159,232,0.2); background: #FBFDFF; color: #445876; }
.type-card.active { border-color: #5B9FE8; background: rgba(91,159,232,0.12); color: #3B7FC8; }
.type-icon { font-size: 20px; display: block; margin-bottom: 4px; }
.type-name { font-size: 13px; font-weight: 600; }
.img-upload-area { width: 80px; height: 80px; border-radius: 12px; border: 2px dashed rgba(91,159,232,0.32); display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FBFDFF; }
.img-upload-icon { font-size: 24px; color: #8497B5; }
.img-upload-text { font-size: 10px; color: #8497B5; margin-top: 2px; }
.submit-btn { width: 100%; padding: 14px 0; text-align: center; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; font-size: 16px; font-weight: 700; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(91,159,232,0.35); }
.submit-btn:active { transform: scale(0.97); }
</style>
