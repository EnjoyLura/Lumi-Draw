<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { navigateBackOrRedirect } from "../../services/navigation";
import { getWorkById } from "../work-detail/workDetailData";
import { workTags } from "../publish/publishData";
import { fetchEditableWork, updateEditableWork } from "./editWorkService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
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
const loginRequired = ref(false);
const loadFailed = ref(false);
let lastLoadKey = "";

const titleCount = computed(() => `${title.value.length}/30`);
const descCount = computed(() => `${desc.value.length}/200`);

function leaveEditWorkPage() {
  navigateBackOrRedirect(workId.value ? `/pages/work-detail/index?id=${workId.value}` : "/pages/gallery/index");
}

onLoad((query) => {
  workId.value = resolveRouteId(query);
  void loadWork();
});

onShow(() => {
  const nextId = resolveRouteId();
  const nextLoadKey = `${nextId}-${useMockData.value}-${isLoggedIn.value}`;
  if (nextId !== workId.value) workId.value = nextId;
  if (nextLoadKey === lastLoadKey) return;
  void loadWork();
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
  const nextId = resolveRouteId();
  if (nextId === workId.value) return;
  workId.value = nextId;
  void loadWork();
}

function resolveRouteId(query?: Record<string, unknown>) {
  const queryId = Number(query?.id || 0);
  if (Number.isFinite(queryId) && queryId > 0) return queryId;

  if (typeof window !== "undefined") {
    const hashId = Number(window.location.hash.match(/[?&]id=([^&]+)/)?.[1] || 0);
    if (Number.isFinite(hashId) && hashId > 0) return hashId;
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  const pageId = Number(current?.options?.id || current?.$page?.options?.id || 0);
  return Number.isFinite(pageId) && pageId > 0 ? pageId : 0;
}

function clearWork() {
  image.value = "";
  modelName.value = "";
  info.value = "";
  title.value = "";
  desc.value = "";
  selectedTags.value = [];
}

function applyWork(work: {
  image: string;
  modelName?: string;
  ratio: string;
  styleName?: string;
  time: string;
  title?: string;
  description?: string;
  tags: string[];
  editTags?: string[];
}) {
  image.value = work.image;
  modelName.value = work.modelName || "";
  info.value = [work.ratio, work.styleName, work.time].filter(Boolean).join(" · ");
  title.value = work.title || "";
  desc.value = work.description || "";
  selectedTags.value = (work.editTags ?? work.tags).filter((tag) => workTags.some((item) => item.name === tag));
}

async function loadWork() {
  lastLoadKey = `${workId.value}-${useMockData.value}-${isLoggedIn.value}`;
  loadFailed.value = false;
  if (!workId.value) {
    clearWork();
    loadFailed.value = true;
    return;
  }
  if (useMockData.value) {
    loginRequired.value = false;
    loadMockWork();
    return;
  }
  if (!isLoggedIn.value) {
    clearWork();
    loginRequired.value = true;
    return;
  }
  loginRequired.value = false;
  clearWork();

  isLoading.value = true;
  try {
    const detail = await fetchEditableWork(workId.value);
    applyWork(detail.work);
  } catch {
    clearWork();
    loadFailed.value = true;
    uni.showToast({ title: "作品信息加载失败", icon: "none" });
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
  if (!work) {
    clearWork();
    loadFailed.value = true;
    return;
  }
  loadFailed.value = false;
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
  if (loadFailed.value) {
    uni.showToast({ title: "作品信息未加载，请重试", icon: "none" });
    return;
  }
  if (!title.value.trim()) {
    uni.showToast({ title: "请输入作品标题", icon: "none" });
    return;
  }
  if (useMockData.value) {
    uni.showToast({ title: "作品信息已保存", icon: "none" });
    setTimeout(leaveEditWorkPage, 600);
    return;
  }
  if (!workId.value || !ensureLogin()) return;

  isSaving.value = true;
  try {
    await updateEditableWork(workId.value, {
      title: title.value.trim(),
      description: desc.value.trim(),
      style: selectedTags.value[0] || "",
      tags: selectedTags.value
    });
    uni.showToast({ title: "作品信息已保存", icon: "none" });
    setTimeout(leaveEditWorkPage, 600);
  } catch {
    uni.showToast({ title: "保存失败，请稍后重试", icon: "none" });
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <view class="edit-work-page" :class="themeClass">
    <LumiPageHeader title="编辑作品" />
    <LumiDeferredPageContent>
    <scroll-view class="page-scroll" scroll-y>
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        title="登录后编辑作品"
        subtitle="登录后才能读取并修改你的真实作品信息。"
        @login="showLoginSheet = true"
      />

      <view v-else-if="loadFailed" class="edit-empty">
        <view class="empty-icon"><LumiIcon name="images" :size="30" /></view>
        <view class="empty-title">作品信息加载失败</view>
        <view class="empty-sub">请确认作品存在且属于当前账号后重试。</view>
        <button class="empty-btn" @click="loadWork">重新加载</button>
      </view>

      <view v-else class="edit-content">
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

        <button class="submit-btn" :disabled="isSaving || isLoading || loadFailed" @click="submit">
          <LumiIcon v-if="!isSaving" name="check" :size="16" />{{ isSaving ? "保存中..." : "保存修改" }}
        </button>
      </view>
    </scroll-view>
    </LumiDeferredPageContent>
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

.edit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52vh;
  padding: 40px 24px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 14px;
  font-size: 42px;
  color: var(--fg-muted);
}

.empty-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 800;
  color: var(--fg-primary);
}

.empty-sub {
  max-width: 260px;
  margin-bottom: 22px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-secondary);
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 132px;
  height: 42px;
  padding: 0 22px;
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  border: none;
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(255, 92, 122, 0.24);
}

.empty-btn::after {
  border: none;
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

/* Lumi custom page header layout */
.edit-work-page {
  display: flex;
  flex-direction: column;
}

.edit-work-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
