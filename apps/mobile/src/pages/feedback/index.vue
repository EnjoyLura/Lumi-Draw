<script setup lang="ts">
import { computed, ref } from "vue";

interface FeedbackType {
  key: string;
  label: string;
  icon: string;
}

const feedbackTypes: FeedbackType[] = [
  { key: "bug", label: "Bug反馈", icon: "⚠" },
  { key: "experience", label: "体验反馈", icon: "☺" },
  { key: "suggestion", label: "优化建议", icon: "✦" }
];

const activeType = ref("bug");
const desc = ref("");
const wechat = ref("");
const images = ref<string[]>([]);

const descCount = computed(() => `${desc.value.length}/500`);

function addImage() {
  if (images.value.length >= 2) return;
  const seed = images.value.length === 0 ? "fb1" : "fb2";
  images.value.push(`https://picsum.photos/seed/${seed}/200/200`);
}

function removeImage(index: number) {
  images.value.splice(index, 1);
}

function submit() {
  uni.showToast({ title: "感谢您的反馈！", icon: "none" });
  setTimeout(() => uni.navigateBack(), 600);
}
</script>

<template>
  <view class="feedback-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="feedback-content">
        <view class="field">
          <view class="field-title">反馈类型</view>
          <view class="type-row">
            <view
              v-for="item in feedbackTypes"
              :key="item.key"
              class="type-option"
              :class="{ active: activeType === item.key }"
              @click="activeType = item.key"
            >
              <view class="type-icon">{{ item.icon }}</view>
              <view class="type-label">{{ item.label }}</view>
            </view>
          </view>
        </view>

        <view class="field">
          <view class="field-title">反馈描述 <text class="field-sub">（选填）</text></view>
          <view class="input-card">
            <textarea
              class="desc-textarea"
              v-model="desc"
              :maxlength="500"
              placeholder="请详细描述您遇到的问题或建议…"
            />
          </view>
          <view class="counter">{{ descCount }}</view>
        </view>

        <view class="field">
          <view class="field-title">截图 <text class="field-sub">（选填，最多2张）</text></view>
          <view class="image-row">
            <view v-for="(img, index) in images" :key="index" class="image-item">
              <image class="image-thumb" :src="img" mode="aspectFill" />
              <view class="image-remove" @click="removeImage(index)">✕</view>
            </view>
            <view v-if="images.length < 2" class="image-add" @click="addImage">
              <view class="image-add-icon">＋</view>
              <view class="image-add-text">添加图片</view>
            </view>
          </view>
        </view>

        <view class="field">
          <view class="field-title">微信号 <text class="field-sub">（选填）</text></view>
          <view class="input-card">
            <input class="wechat-input" type="text" v-model="wechat" :maxlength="30" placeholder="方便我们联系您" />
          </view>
        </view>

        <button class="submit-btn" @click="submit">✈ 提交反馈</button>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.feedback-page {
  --bg-base: #eef4fc;
  --bg-soft: #e1ebf8;
  --bg-card: #ffffff;
  --bg-elevated: #fbfdff;
  --fg-primary: #0e1f3a;
  --fg-secondary: #445876;
  --fg-muted: #8497b5;
  --border: rgba(91, 159, 232, 0.14);
  --accent: #5b9fe8;
  --accent-deep: #3b7fc8;
  --accent-soft: rgba(91, 159, 232, 0.12);
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
}

.feedback-content {
  padding: 16px;
}

.field {
  margin-bottom: 18px;
}

.field-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--fg-primary);
}

.field-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--fg-muted);
}

.type-row {
  display: flex;
  gap: 10px;
}

.type-option {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.type-option.active {
  color: var(--accent-deep);
  background: var(--accent-soft);
  border-color: var(--accent);
}

.type-icon {
  margin-bottom: 4px;
  font-size: 20px;
}

.type-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
}

.type-option.active .type-label {
  color: var(--accent-deep);
}

.input-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.desc-textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 100px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--fg-primary);
}

.counter {
  margin-top: 4px;
  font-size: 11px;
  color: var(--fg-muted);
  text-align: right;
}

.image-row {
  display: flex;
  gap: 10px;
}

.image-item {
  position: relative;
  width: 80px;
  height: 80px;
  overflow: hidden;
  border-radius: 12px;
}

.image-thumb {
  width: 100%;
  height: 100%;
}

.image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
}

.image-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: var(--bg-elevated);
  border: 2px dashed var(--border);
  border-radius: 12px;
}

.image-add-icon {
  font-size: 24px;
  color: var(--fg-muted);
}

.image-add-text {
  margin-top: 2px;
  font-size: 10px;
  color: var(--fg-muted);
}

.wechat-input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  font-size: 14px;
  color: var(--fg-primary);
}

.submit-btn {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  line-height: 50px;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border: none;
  border-radius: 12px;
}

.submit-btn::after {
  border: none;
}
</style>
