<script setup lang="ts">
import { computed, ref } from "vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { mockImage } from "../../services/mockImages";
import { uploadChosenImage } from "../../services/upload";
import { reversePrompt } from "./reversePromptService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const imageUrl = ref("");
const localImageUrl = ref("");
const resultText = ref("");
const hintText = ref("");
const isUploading = ref(false);
const isAnalyzing = ref(false);
const showLoginSheet = ref(false);
const { login: commitLogin, requireLogin, updateCurrentUser } = useAuth();
const { useMockData } = useDataMode();

const hasResult = computed(() => !!resultText.value);
const busy = computed(() => isUploading.value || isAnalyzing.value);

async function uploadReverseImage() {
  if (busy.value) return;

  if (useMockData.value) {
    const url = mockImage(`reverse${Date.now()}`, 600, 420);
    imageUrl.value = url;
    localImageUrl.value = url;
    resultText.value = "";
    return;
  }

  if (!requireLogin(() => (showLoginSheet.value = true))) return;
  isUploading.value = true;
  try {
    const uploaded = await uploadChosenImage("prompt-image");
    imageUrl.value = uploaded.publicUrl;
    localImageUrl.value = uploaded.localPath || uploaded.publicUrl;
    resultText.value = "";
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "图片上传失败", icon: "none" });
  } finally {
    isUploading.value = false;
  }
}

async function startReverse() {
  if (!imageUrl.value) {
    uni.showToast({ title: "请先上传图片", icon: "none" });
    return;
  }
  if (!requireLogin(() => (showLoginSheet.value = true))) return;
  if (isAnalyzing.value) return;

  isAnalyzing.value = true;
  resultText.value = "";
  try {
    if (useMockData.value) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      resultText.value =
        "A beautiful scene with soft lighting, dreamy atmosphere, pastel color palette, detailed composition, high quality, ethereal mood, sharp focus";
      uni.showToast({ title: "分析完成，模拟消耗积分", icon: "none" });
      return;
    }

    const result = await reversePrompt({ imageUrl: imageUrl.value, hint: hintText.value.trim() || undefined });
    resultText.value = result.prompt;
    updateCurrentUser({ credits: result.creditsAfter });
    uni.showToast({ title: `分析完成，消耗 ${result.costCredits} 积分`, icon: "none" });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "分析失败，请稍后重试", icon: "none" });
  } finally {
    isAnalyzing.value = false;
  }
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

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}
</script>

<template>
  <view class="reverse-page" :class="themeClass">
    <scroll-view class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="card upload-card">
          <view v-if="!imageUrl" class="upload-area" @click="uploadReverseImage">
            <view class="upload-icon">▤</view>
            <view class="upload-title">上传图片</view>
            <view class="upload-sub">AI 将分析图片内容并反推可编辑提示词</view>
          </view>

          <view v-else class="preview-wrap">
            <image class="preview-img" :src="localImageUrl || imageUrl" mode="aspectFill" />
            <button class="btn btn-secondary" :disabled="busy" @click="uploadReverseImage">重新上传</button>
          </view>

          <view class="hint-wrap">
            <textarea v-model="hintText" class="hint-input" maxlength="200" placeholder="可选：补充主体、风格或用途，帮助生成更贴合的提示词" />
          </view>

          <button class="btn btn-gradient analyze-btn" :disabled="busy" @click="startReverse">
            <view v-if="busy" class="spinner" />
            <text>{{ isUploading ? "上传中..." : isAnalyzing ? "分析中..." : hasResult ? "重新分析" : "开始分析" }}</text>
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
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.reverse-page {
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

.card {
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
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

.hint-wrap {
  margin-top: 12px;
}

.hint-input {
  width: 100%;
  min-height: 76px;
  padding: 10px;
  box-sizing: border-box;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg-primary);
  background: var(--bg-soft);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  text-align: left;
}

.btn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
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
  transition: border-color 0.3s, box-shadow 0.3s;
}

.result-card:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
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
