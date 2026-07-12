<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { mockImage } from "../../services/mockImages";
import { navigateBackOrRedirect } from "../../services/navigation";
import { chooseLocalImage, uploadSelectedImage, type ChosenImage } from "../../services/upload";
import { submitFeedback } from "./feedbackService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

interface FeedbackType {
  key: string;
  label: string;
  icon: string;
}

interface FeedbackImage {
  id: string;
  previewUrl: string;
  localImage?: ChosenImage;
  uploadedUrl?: string;
}

const { login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();

const feedbackTypes: FeedbackType[] = [
  { key: "bug", label: "Bug反馈", icon: "!" },
  { key: "experience", label: "体验反馈", icon: "●" },
  { key: "suggestion", label: "优化建议", icon: "✓" }
];

const activeType = ref("bug");
const desc = ref("");
const wechat = ref("");
const images = ref<FeedbackImage[]>([]);
const isUploading = ref(false);
const isSubmitting = ref(false);
const showLoginSheet = ref(false);
let lastRouteSource = "";

const descCount = computed(() => `${desc.value.length}/500`);

function leaveFeedbackPage() {
  navigateBackOrRedirect("/pages/mine/index");
}

onLoad((query) => {
  applyRouteSource(query);
});

onShow(() => {
  applyRouteSource();
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", handleHashChange);
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("hashchange", handleHashChange);
});

function handleHashChange() {
  applyRouteSource();
}

function resolveRouteSource(query?: Record<string, unknown>) {
  const querySource = typeof query?.source === "string" ? query.source : "";
  if (querySource) return querySource;

  if (typeof window !== "undefined") {
    const hashSource = window.location.hash.match(/[?&]source=([^&]+)/)?.[1];
    if (hashSource) return decodeURIComponent(hashSource);
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  return current?.options?.source || current?.$page?.options?.source || "";
}

function applyRouteSource(query?: Record<string, unknown>) {
  const source = resolveRouteSource(query);
  if (source === lastRouteSource) return;
  lastRouteSource = source;
  if (source !== "service") return;
  activeType.value = "experience";
  if (!desc.value.trim()) desc.value = "我想咨询：";
}

async function addImage() {
  if (images.value.length >= 2 || isUploading.value) return;

  if (useMockData.value) {
    const seed = images.value.length === 0 ? "fb1" : "fb2";
    images.value.push({
      id: `mock-${Date.now()}-${images.value.length}`,
      previewUrl: mockImage(seed, 200, 200),
      uploadedUrl: mockImage(seed, 200, 200)
    });
    return;
  }

  isUploading.value = true;
  try {
    const image = await chooseLocalImage();
    images.value.push({
      id: `${Date.now()}-${image.name}`,
      previewUrl: image.path,
      localImage: image
    });
  } catch {
    uni.showToast({ title: "未选择图片", icon: "none" });
  } finally {
    isUploading.value = false;
  }
}

function openLoginSheet() {
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
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

function removeImage(index: number) {
  images.value.splice(index, 1);
}

async function resolveFeedbackImageUrls() {
  const urls: string[] = [];
  for (const item of images.value) {
    if (item.uploadedUrl) {
      urls.push(item.uploadedUrl);
      continue;
    }
    if (!item.localImage) continue;
    const uploaded = await uploadSelectedImage("feedback", item.localImage);
    item.uploadedUrl = uploaded.publicUrl;
    urls.push(uploaded.publicUrl);
  }
  return urls;
}

async function submit() {
  if (isSubmitting.value) return;
  if (!desc.value.trim() && !images.value.length) {
    uni.showToast({ title: "请填写反馈内容或上传截图", icon: "none" });
    return;
  }

  if (useMockData.value) {
    uni.showToast({ title: "感谢您的反馈", icon: "none" });
    setTimeout(leaveFeedbackPage, 600);
    return;
  }
  if (!ensureLogin()) return;

  isSubmitting.value = true;
  try {
    const imageUrls = await resolveFeedbackImageUrls();
    await submitFeedback({
      type: activeType.value,
      content: desc.value.trim(),
      imageUrls,
      wechat: wechat.value.trim()
    });
    uni.showToast({ title: "感谢您的反馈", icon: "none" });
    setTimeout(leaveFeedbackPage, 600);
  } catch {
    uni.showToast({ title: "提交失败，请稍后重试", icon: "none" });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <view class="feedback-page" :class="themeClass">
    <LumiPageHeader title="意见反馈" />
    <LumiDeferredPageContent>
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
          <view class="field-title">反馈描述 <text class="field-sub">（可选）</text></view>
          <view class="input-card">
            <textarea
              class="desc-textarea"
              v-model="desc"
              :maxlength="500"
              placeholder="请详细描述您遇到的问题或建议..."
            />
          </view>
          <view class="counter">{{ descCount }}</view>
        </view>

        <view class="field">
          <view class="field-title">截图 <text class="field-sub">（可选，最多2张）</text></view>
          <view class="image-row">
            <view v-for="(img, index) in images" :key="img.id" class="image-item">
              <image class="image-thumb" :src="img.previewUrl" mode="aspectFill" />
              <view class="image-remove" @click="removeImage(index)">×</view>
            </view>
            <view v-if="images.length < 2" class="image-add" @click="addImage">
              <view class="image-add-icon">{{ isUploading ? "..." : "+" }}</view>
              <view class="image-add-text">{{ isUploading ? "选择中" : "添加图片" }}</view>
            </view>
          </view>
        </view>

        <view class="field">
          <view class="field-title">微信号 <text class="field-sub">（可选）</text></view>
          <view class="input-card">
            <input class="wechat-input" type="text" v-model="wechat" :maxlength="30" placeholder="方便我们联系您" />
          </view>
        </view>

        <button class="submit-btn" :disabled="isSubmitting" @click="submit">
          {{ isSubmitting ? "提交中..." : "提交反馈" }}
        </button>
      </view>
    </scroll-view>
    </LumiDeferredPageContent>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.feedback-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
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

.input-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.input-card:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
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

.image-item,
.image-add {
  width: 80px;
  height: 80px;
  border-radius: 12px;
}

.image-item {
  position: relative;
  overflow: hidden;
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
  background: var(--bg-elevated);
  border: 2px dashed var(--border);
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

.submit-btn[disabled] {
  opacity: 0.65;
}

.submit-btn::after {
  border: none;
}

/* Lumi custom page header layout */
.feedback-page {
  display: flex;
  flex-direction: column;
}

.feedback-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
