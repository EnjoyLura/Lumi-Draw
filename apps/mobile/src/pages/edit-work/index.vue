<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { getWorkById } from "../work-detail/workDetailData";
import { workTags } from "../publish/publishData";
import { fetchEditableWork, updateEditableWork } from "./editWorkService";

const { login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();
const workId = ref(0);
const image = ref("");
const modelName = ref("");
const info = ref("");
const title = ref("");
const desc = ref("");
const selectedTags = ref<string[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const showLoginSheet = ref(false);

const titleCount = computed(() => `${title.value.length}/30`);
const descCount = computed(() => `${desc.value.length}/200`);

onLoad((query) => {
  const id = Number(query?.id || 0);
  if (Number.isFinite(id) && id > 0) workId.value = id;
  void loadWork();
});

function applyWork(work: {
  image: string;
  modelName?: string;
  ratio: string;
  styleName?: string;
  time: string;
  title?: string;
  description?: string;
  tags: string[];
}) {
  image.value = work.image;
  modelName.value = work.modelName || "";
  info.value = [work.ratio, work.styleName, work.time].filter(Boolean).join(" · ");
  title.value = work.title || "";
  desc.value = work.description || "";
  selectedTags.value = work.tags.filter((tag) => workTags.some((item) => item.name === tag));
}

async function loadWork() {
  if (!workId.value) return;
  if (useMockData.value) {
    loadMockWork();
    return;
  }
  if (!ensureLogin()) return;

  isLoading.value = true;
  try {
    const detail = await fetchEditableWork(workId.value);
    applyWork(detail.work);
  } catch {
    uni.showToast({ title: "作品信息加载失败", icon: "none" });
    loadMockWork();
  } finally {
    isLoading.value = false;
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
    await loadWork();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function loadMockWork() {
  const id = workId.value;
  const work = getWorkById(id);
  if (!work) return;
  applyWork(work);
}

function isTagSelected(name: string) {
  return selectedTags.value.includes(name);
}

function toggleTag(name: string) {
  const index = selectedTags.value.indexOf(name);
  if (index >= 0) {
    selectedTags.value.splice(index, 1);
    return;
  }
  if (selectedTags.value.length >= 5) {
    uni.showToast({ title: "最多选择5个标签", icon: "none" });
    return;
  }
  selectedTags.value.push(name);
}

async function submit() {
  if (isSaving.value) return;
  if (!title.value.trim()) {
    uni.showToast({ title: "请输入作品标题", icon: "none" });
    return;
  }
  if (useMockData.value) {
    uni.showToast({ title: "作品信息已保存", icon: "none" });
    setTimeout(() => uni.navigateBack(), 600);
    return;
  }
  if (!workId.value || !ensureLogin()) return;

  isSaving.value = true;
  try {
    await updateEditableWork(workId.value, {
      title: title.value.trim(),
      description: desc.value.trim(),
      style: selectedTags.value[0] || ""
    });
    uni.showToast({ title: "作品信息已保存", icon: "none" });
    setTimeout(() => uni.navigateBack(), 600);
  } catch {
    uni.showToast({ title: "保存失败，请稍后重试", icon: "none" });
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <view class="edit-work-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="edit-content">
        <view class="field">
          <view class="field-title">作品预览</view>
          <view class="preview-card">
            <image class="preview-thumb" :src="image" mode="aspectFill" />
            <view class="preview-text">
              <view class="preview-model">{{ isLoading ? "加载中..." : modelName }}</view>
              <view class="preview-info">{{ isLoading ? "正在读取作品信息" : info }}</view>
            </view>
          </view>
        </view>

        <view class="field">
          <view class="field-title">作品标题</view>
          <view class="input-card">
            <input class="text-input" type="text" v-model="title" :maxlength="30" placeholder="给作品起个名字" />
          </view>
          <view class="counter">{{ titleCount }}</view>
        </view>

        <view class="field">
          <view class="field-title">作品描述</view>
          <view class="input-card">
            <textarea class="text-area" v-model="desc" :maxlength="200" placeholder="介绍一下你的创作灵感吧~" />
          </view>
          <view class="counter">{{ descCount }}</view>
        </view>

        <view class="field">
          <view class="field-head">
            <view class="field-title">作品标签</view>
            <view class="field-hint">最多选5个</view>
          </view>
          <view class="tag-grid">
            <view
              v-for="tag in workTags"
              :key="tag.name"
              class="tag-chip"
              :style="
                isTagSelected(tag.name)
                  ? { background: tag.bg, color: tag.color, borderColor: tag.color, fontWeight: 600 }
                  : {}
              "
              @click="toggleTag(tag.name)"
            >
              {{ tag.name }}
            </view>
          </view>
        </view>

        <button class="submit-btn" :disabled="isSaving || isLoading" @click="submit">
          {{ isSaving ? "保存中..." : "✓ 保存修改" }}
        </button>
      </view>
    </scroll-view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.edit-work-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.edit-content {
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

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.field-head .field-title {
  margin-bottom: 0;
}

.field-hint {
  font-size: 12px;
  color: var(--fg-muted);
}

.preview-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.preview-thumb {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 10px;
}

.preview-text {
  flex: 1;
  min-width: 0;
}

.preview-model {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg-primary);
}

.preview-info {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
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

.text-input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  font-size: 14px;
  color: var(--fg-primary);
}

.text-area {
  box-sizing: border-box;
  width: 100%;
  min-height: 80px;
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

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-secondary);
  background: var(--bg-elevated);
  border: 1.5px solid transparent;
  border-radius: 999px;
}

.submit-btn {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  margin-bottom: 20px;
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
