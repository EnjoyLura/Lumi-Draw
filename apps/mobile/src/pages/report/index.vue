<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { reportReasons } from "../work-detail/workDetailData";

const selectedReasonIndex = ref(-1);
const description = ref("");
const workId = ref(0);

onLoad((query) => {
  const id = Number(query?.workId || 0);
  if (Number.isFinite(id)) workId.value = id;
});

function selectReason(index: number) {
  selectedReasonIndex.value = index;
}

function submitReport() {
  if (selectedReasonIndex.value < 0) {
    uni.showToast({ title: "请选择举报原因", icon: "none" });
    return;
  }

  uni.showToast({ title: "举报已提交，我们会尽快处理", icon: "none" });
  setTimeout(() => {
    uni.navigateBack();
  }, 450);
}
</script>

<template>
  <view class="report-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="section-title">请选择举报原因</view>
        <view class="reason-list">
          <view
            v-for="(reason, index) in reportReasons"
            :key="reason"
            class="reason-row"
            :class="{ selected: selectedReasonIndex === index }"
            @click="selectReason(index)"
          >
            <text>{{ reason }}</text>
            <text class="check-icon">✓</text>
          </view>
        </view>

        <view class="section-title desc-title">补充描述（选填）</view>
        <textarea v-model="description" class="desc-input" placeholder="请描述具体问题..." />
        <button class="submit-btn" @click="submitReport">提交举报</button>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.report-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.page-content {
  padding: 16px;
}

.section-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.reason-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  font-size: 15px;
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.2s, background 0.2s;
}

.reason-row.selected {
  background: rgba(91, 159, 232, 0.06);
  border-color: var(--accent);
}

.check-icon {
  font-size: 20px;
  color: var(--accent);
  opacity: 0;
  transition: opacity 0.2s;
}

.reason-row.selected .check-icon {
  opacity: 1;
}

.desc-title {
  margin-bottom: 8px;
}

.desc-input {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  margin-bottom: 20px;
  box-sizing: border-box;
  font-size: 14px;
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.desc-input:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.submit-btn {
  width: 100%;
  padding: 12px 0;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 14px;
}

.submit-btn::after {
  border: none;
}
</style>
