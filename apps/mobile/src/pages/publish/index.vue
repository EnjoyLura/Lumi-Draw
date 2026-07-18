<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onLoad, onReady, onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { navigateBackOrRedirect } from "../../services/navigation";
import { invalidateTabPages } from "../../services/tabPageCache";
import { draftWorks, workTags, type DraftWork } from "./publishData";
import { fetchPublishDrafts, publishWork } from "./publishService";
import { fetchMemberPlans, fetchMemberStatus, fetchPublishRewardConfig } from "../points/pointsService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const { useMockData } = useDataMode();
const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();

const selectedDraft = ref<DraftWork | null>(null);
const title = ref("");
const desc = ref("");
const selectedTags = ref<string[]>([]);
const pickerOpen = ref(false);
const backendDrafts = ref<DraftWork[]>([]);
const isLoadingDrafts = ref(false);
const isSubmitting = ref(false);
const pendingDraftId = ref<number | null>(null);
const showLoginSheet = ref(false);
const loginRequired = ref(false);
const basePublishReward = ref(50);
const memberPublishBonus = ref(0);
const isInitialContentReady = ref(false);
let lastMockMode: boolean | null = null;
let initialContentTimer: ReturnType<typeof setTimeout> | undefined;

const titleCount = computed(() => `${title.value.length}/30`);
const descCount = computed(() => `${desc.value.length}/200`);
const draftOptions = computed(() => (useMockData.value ? draftWorks : backendDrafts.value));
const publishReward = computed(() => basePublishReward.value + memberPublishBonus.value);
const publishButtonText = computed(() => {
  const suffix = memberPublishBonus.value ? `送${publishReward.value}积分（含会员加成）` : `送${publishReward.value}积分`;
  return `发布作品 · ${suffix}`;
});

function leavePublishPage() {
  navigateBackOrRedirect("/pages/gallery/index");
}

onLoad((query) => {
  pendingDraftId.value = resolveRouteDraftId(query);
});

onReady(() => {
  initialContentTimer = setTimeout(() => {
    isInitialContentReady.value = true;
    initialContentTimer = undefined;
  }, 16);
});

onShow(() => {
  const nextDraftId = resolveRouteDraftId();
  if (nextDraftId && nextDraftId !== pendingDraftId.value && nextDraftId !== selectedDraft.value?.id) {
    pendingDraftId.value = nextDraftId;
    clearPublishForm();
  }
  if (lastMockMode !== useMockData.value) {
    selectedDraft.value = null;
    title.value = "";
    desc.value = "";
    selectedTags.value = [];
    lastMockMode = useMockData.value;
  }
  void loadDrafts();
  void loadPublishReward();
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", handleHashChange);
});

onUnmounted(() => {
  if (initialContentTimer) clearTimeout(initialContentTimer);
  if (typeof window === "undefined") return;
  window.removeEventListener("hashchange", handleHashChange);
});

function handleHashChange() {
  const nextDraftId = resolveRouteDraftId();
  if (!nextDraftId || nextDraftId === pendingDraftId.value || nextDraftId === selectedDraft.value?.id) return;
  pendingDraftId.value = nextDraftId;
  clearPublishForm();
  void loadDrafts();
}

function resolveRouteDraftId(query?: Record<string, unknown>) {
  const queryId = Number(query?.draftId || 0);
  if (Number.isFinite(queryId) && queryId > 0) return queryId;

  if (typeof window !== "undefined") {
    const hashId = Number(window.location.hash.match(/[?&]draftId=([^&]+)/)?.[1] || 0);
    if (Number.isFinite(hashId) && hashId > 0) return hashId;
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  const pageId = Number(current?.options?.draftId || current?.$page?.options?.draftId || 0);
  return Number.isFinite(pageId) && pageId > 0 ? pageId : 0;
}

function clearPublishForm() {
  selectedDraft.value = null;
  title.value = "";
  desc.value = "";
  selectedTags.value = [];
  pickerOpen.value = false;
}

async function loadDrafts() {
  if (isLoadingDrafts.value) return;
  if (useMockData.value) {
    backendDrafts.value = [];
    loginRequired.value = false;
    applyPendingDraft();
    return;
  }
  if (!isLoggedIn.value) {
    backendDrafts.value = [];
    clearPublishForm();
    loginRequired.value = true;
    return;
  }
  loginRequired.value = false;

  isLoadingDrafts.value = true;
  try {
    backendDrafts.value = await fetchPublishDrafts();
    applyPendingDraft();
    if (selectedDraft.value && !backendDrafts.value.some((draft) => draft.id === selectedDraft.value?.id)) {
      selectedDraft.value = null;
    }
  } catch {
    backendDrafts.value = [];
    if (selectedDraft.value?.source === "backend") selectedDraft.value = null;
    uni.showToast({ title: "草稿加载失败", icon: "none" });
  } finally {
    isLoadingDrafts.value = false;
  }
}

async function loadPublishReward() {
  if (useMockData.value) {
    basePublishReward.value = 50;
    memberPublishBonus.value = 0;
    return;
  }
  try {
    basePublishReward.value = await fetchPublishRewardConfig();
    memberPublishBonus.value = 0;
    if (!isLoggedIn.value) return;
    const [status, plans] = await Promise.all([fetchMemberStatus(), fetchMemberPlans()]);
    if (!status.isMember) return;
    memberPublishBonus.value = plans.find((plan) => plan.name === status.memberPlan)?.publishBonus ?? 0;
  } catch {
    memberPublishBonus.value = 0;
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
    await Promise.all([loadDrafts(), loadPublishReward()]);
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function openPicker() {
  pickerOpen.value = true;
  if (!useMockData.value && !backendDrafts.value.length) void loadDrafts();
}

function closePicker() {
  pickerOpen.value = false;
}

function selectDraft(draft: DraftWork) {
  selectedDraft.value = draft;
  if (!title.value) title.value = draft.title;
  if (!desc.value && draft.prompt) desc.value = draft.prompt.slice(0, 200);
  closePicker();
}

function syncDraftResolution(draftId: number, event: Event) {
  const detail = (event as unknown as { detail?: { width?: number; height?: number } }).detail;
  const width = Number(detail?.width);
  const height = Number(detail?.height);
  if (!width || !height) return;

  const resolution = `${width}x${height}`;
  backendDrafts.value = backendDrafts.value.map((draft) => (draft.id === draftId && draft.resolution !== resolution ? { ...draft, resolution } : draft));
  if (selectedDraft.value?.id === draftId && selectedDraft.value.resolution !== resolution) {
    selectedDraft.value = { ...selectedDraft.value, resolution };
  }
}

function applyPendingDraft() {
  if (!pendingDraftId.value || selectedDraft.value) return;
  const draft = draftOptions.value.find((item) => item.id === pendingDraftId.value);
  if (!draft) return;
  pendingDraftId.value = null;
  selectDraft(draft);
}

function publishSuccessMessage(result?: { status?: string; isPublic?: boolean }) {
  if (result?.status === "pending") return "作品已提交审核";
  if (result?.status === "published" && result.isPublic !== false) return "作品发布成功";
  if (result?.status === "draft" || result?.isPublic === false) return "作品已保存为草稿";
  return "作品已保存";
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

function previewDraftImage() {
  if (!selectedDraft.value) return;
  uni.previewImage({
    urls: [selectedDraft.value.image],
    current: selectedDraft.value.image
  });
}

async function submit() {
  if (isSubmitting.value) return;
  if (!selectedDraft.value) {
    uni.showToast({ title: "请选择要发布的作品", icon: "none" });
    return;
  }
  if (!title.value.trim()) {
    uni.showToast({ title: "请输入作品标题", icon: "none" });
    return;
  }

  if (useMockData.value) {
    uni.showToast({ title: `作品「${title.value.trim()}」发布成功`, icon: "none" });
    setTimeout(leavePublishPage, 800);
    return;
  }

  if (!ensureLogin()) return;

  isSubmitting.value = true;
  try {
    const result = await publishWork({
      title: title.value.trim(),
      description: desc.value.trim(),
      tags: selectedTags.value,
      draft: selectedDraft.value
    });
    invalidateTabPages("gallery:");
    uni.showToast({ title: publishSuccessMessage(result), icon: "none" });
    setTimeout(leavePublishPage, 900);
  } catch {
    uni.showToast({ title: "发布失败，请稍后重试", icon: "none" });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <view class="publish-page" :class="themeClass">
    <LumiPageHeader title="发布作品" />
    <view v-if="!isInitialContentReady" class="page-first-frame" />
    <scroll-view v-else class="page-scroll" scroll-y enable-flex>
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        title="登录后发布作品"
        subtitle="登录后才能读取草稿箱并提交真实作品审核。"
        @login="showLoginSheet = true"
      />

      <view v-else class="publish-content">
        <view class="field">
          <view class="field-title">选择作品</view>
          <view class="draft-card" @click="openPicker">
            <template v-if="!selectedDraft">
              <view class="draft-empty-icon"><LumiIcon name="plus" :size="28" /></view>
              <view class="draft-empty-text">
                <view class="draft-empty-title">从草稿箱选择</view>
                <view class="draft-empty-sub">点击浏览全部草稿作品</view>
              </view>
            </template>
            <template v-else>
              <image class="draft-thumb" :src="selectedDraft.image" mode="aspectFill" @click.stop="previewDraftImage" @load="syncDraftResolution(selectedDraft.id, $event)" />
              <view class="draft-selected-text">
                <view class="draft-selected-title">{{ selectedDraft.title }}</view>
                <view class="draft-selected-sub">{{ selectedDraft.resolution }}</view>
              </view>
            </template>
            <LumiIcon class="draft-arrow" name="chevron-right" :size="18" />
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

        <button class="submit-btn" :disabled="isSubmitting" @click="submit">
          <LumiIcon v-if="!isSubmitting" name="send" :size="16" />
          <text>{{ isSubmitting ? "发布中..." : publishButtonText }}</text>
        </button>
      </view>
    </scroll-view>

    <view class="sheet-overlay" :class="{ show: pickerOpen }" @click="closePicker" />
    <view class="picker-sheet" :class="{ show: pickerOpen }">
      <view class="sheet-handle" />
      <view class="picker-head">
        <view class="picker-title">选择草稿作品</view>
      </view>
      <scroll-view class="picker-scroll" scroll-y>
        <view v-if="isLoadingDrafts && !draftOptions.length" class="picker-state">草稿加载中...</view>
        <view v-else-if="!draftOptions.length" class="picker-state">暂无可发布草稿</view>
        <view v-else class="picker-grid">
          <view
            v-for="draft in draftOptions"
            :key="draft.id"
            class="picker-item"
            :class="{ active: selectedDraft && selectedDraft.id === draft.id }"
            @click="selectDraft(draft)"
          >
            <image class="picker-thumb" :src="draft.image" mode="aspectFill" @load="syncDraftResolution(draft.id, $event)" />
            <view class="picker-info">
              <view class="picker-name">{{ draft.title }}</view>
              <view class="picker-res">{{ draft.resolution }}</view>
            </view>
            <view v-if="selectedDraft && selectedDraft.id === draft.id" class="picker-check"><LumiIcon name="check" :size="16" /></view>
          </view>
        </view>
      </scroll-view>
    </view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.publish-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  flex: 1;
  min-height: 0;
}

.page-first-frame {
  flex: 1;
  background: var(--page-bg);
}

.publish-content {
  padding: 16px 16px calc(56px + env(safe-area-inset-bottom));
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

.draft-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.draft-empty-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  font-size: 26px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 12px;
}

.draft-empty-text {
  flex: 1;
}

.draft-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
}

.draft-empty-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
}

.draft-thumb {
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  border-radius: 12px;
}

.draft-selected-text {
  flex: 1;
  min-width: 0;
}

.draft-selected-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-selected-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
}

.draft-arrow {
  flex: 0 0 auto;
  font-size: 20px;
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
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  margin-top: 8px;
  margin-bottom: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border: none;
  border-radius: 12px;
}

.submit-btn[disabled] {
  opacity: 0.7;
}

.submit-btn::after {
  border: none;
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  visibility: hidden;
  background: rgba(0, 0, 0, 0.36);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.sheet-overlay.show {
  visibility: visible;
  opacity: 1;
}

.picker-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 310;
  padding: 8px 20px 20px;
  background: var(--bg-card);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 30px rgba(14, 31, 58, 0.12);
  transform: translateY(110%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.picker-sheet.show {
  transform: translateY(0);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto 16px;
  background: rgba(91, 159, 232, 0.32);
  border-radius: 999px;
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.picker-title {
  font-size: 16px;
  font-weight: 600;
}

.picker-scroll {
  max-height: 60vh;
}

.picker-state {
  padding: 36px 0;
  font-size: 13px;
  color: var(--fg-muted);
  text-align: center;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.picker-item {
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 8px;
}

.picker-item.active {
  border-color: var(--accent);
}

.picker-thumb {
  display: block;
  width: 100%;
  height: 96px;
}

.picker-info {
  padding: 6px 8px;
  background: var(--bg-elevated);
}

.picker-name {
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-res {
  margin-top: 2px;
  font-size: 10px;
  color: var(--fg-muted);
}

.picker-check {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 14px;
  color: #fff;
  background: var(--accent);
  border-radius: 50%;
}

/* Lumi custom page header layout */
.publish-page {
  display: flex;
  flex-direction: column;
}

.publish-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}

</style>
