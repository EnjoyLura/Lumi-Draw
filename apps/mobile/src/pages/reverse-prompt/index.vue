<script setup lang="ts">
import { computed, ref } from "vue";

const imageUrl = ref("");
const resultText = ref("");
const isAnalyzing = ref(false);

const hasResult = computed(() => !!resultText.value);

function uploadReverseImage() {
  imageUrl.value = `https://picsum.photos/seed/reverse${Date.now()}/600/420`;
}

function startReverse() {
  if (!imageUrl.value) {
    uni.showToast({ title: "请先上传图片", icon: "none" });
    return;
  }

  isAnalyzing.value = true;
  setTimeout(() => {
    resultText.value =
      "A beautiful scene with soft lighting, dreamy atmosphere, pastel color palette, detailed composition, artistic style, high quality, ethereal mood, serene landscape with gentle bokeh";
    isAnalyzing.value = false;
    uni.showToast({ title: "分析完成，消耗5积分", icon: "none" });
  }, 900);
}

function copyResult() {
  if (!resultText.value) return;
  uni.setClipboardData({ data: resultText.value });
}

function useResult() {
  if (!resultText.value) {
    uni.showToast({ title: "请先完成分析", icon: "none" });
    return;
  }

  uni.setStorageSync("lumiCreatePromptDraft", resultText.value);
  uni.navigateBack({
    fail: () => {
      uni.navigateTo({
        url: `/pages/create/index?prompt=${encodeURIComponent(resultText.value)}`
      });
    }
  });
}
</script>

<template>
  <view class="reverse-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="card upload-card">
          <view v-if="!imageUrl" class="upload-area" @click="uploadReverseImage">
            <view class="upload-icon">▧</view>
            <view class="upload-title">上传图片</view>
            <view class="upload-sub">AI 将分析图片内容并反推可编辑提示词</view>
          </view>

          <view v-else class="preview-wrap">
            <image class="preview-img" :src="imageUrl" mode="aspectFill" />
            <button class="btn btn-secondary" @click="uploadReverseImage">重新上传</button>
          </view>

          <button class="btn btn-gradient analyze-btn" :disabled="isAnalyzing" @click="startReverse">
            <view v-if="isAnalyzing" class="spinner" />
            <text>{{ isAnalyzing ? "分析中..." : hasResult ? "重新分析" : "开始分析" }}</text>
          </button>
        </view>

        <view v-if="hasResult" class="result-block">
          <view class="section-title">反推结果</view>
          <view class="card result-card">
            <textarea v-model="resultText" class="result-textarea" placeholder="分析结果将显示在这里..." />
          </view>
          <view class="action-row">
            <button class="btn btn-secondary action-btn" @click="copyResult">复制</button>
            <button class="btn btn-gradient action-btn" @click="useResult">带入创作</button>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.reverse-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
}

.page-content {
  padding: 16px;
}

.card {
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.upload-card {
  padding: 20px;
  margin-bottom: 16px;
  text-align: center;
}

.upload-area {
  padding: 40px 20px;
  border: 2px dashed var(--border-strong);
  border-radius: 16px;
}

.upload-icon {
  margin-bottom: 10px;
  font-size: 48px;
  line-height: 1;
  color: var(--accent);
}

.upload-title {
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 700;
}

.upload-sub {
  font-size: 12px;
  line-height: 1.6;
  color: var(--fg-muted);
}

.preview-wrap {
  margin-bottom: 12px;
}

.preview-img {
  width: 100%;
  max-height: 200px;
  margin-bottom: 10px;
  border-radius: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
}

.btn::after {
  border: none;
}

.btn-gradient {
  color: #fff;
  background: var(--gradient-dream);
}

.btn-secondary {
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
}

.analyze-btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px 18px;
}

.analyze-btn[disabled] {
  opacity: 0.55;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.section-title {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 700;
}

.result-card {
  margin-bottom: 12px;
}

.result-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  box-sizing: border-box;
  font-size: 13px;
  line-height: 1.6;
  color: var(--fg-primary);
  border: none;
}

.action-row {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 10px 18px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
