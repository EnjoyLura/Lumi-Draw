<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { addActiveGenerateJobId, removeActiveGenerateJobIds } from "../../services/generateTaskState";
import { galleryGenTasks } from "../gallery/galleryData";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();
import {
  cancelGenerateJob,
  fetchGenerateHistoryJobs,
  retryGenerateJob,
  type GenerateHistoryFilter,
  type GenerateHistoryJob,
  type GenerateJobStatus
} from "./generationHistoryService";

const PAGE_SIZE = 20;

const filters: Array<{ key: GenerateHistoryFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "running", label: "进行中" },
  { key: "succeeded", label: "已完成" },
  { key: "failed", label: "失败" }
];

const statusInfo: Record<GenerateJobStatus, { label: string; className: string }> = {
  queued: { label: "排队中", className: "running" },
  running: { label: "生成中", className: "running" },
  succeeded: { label: "已完成", className: "succeeded" },
  partial_failed: { label: "部分完成", className: "succeeded" },
  failed: { label: "失败", className: "failed" },
  cancelled: { label: "已取消", className: "failed" }
};

const activeFilter = ref<GenerateHistoryFilter>("all");
const jobs = ref<GenerateHistoryJob[]>([]);
const page = ref(1);
const hasMore = ref(false);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const showLoginSheet = ref(false);
const lastMode = ref<boolean | null>(null);
const { useMockData } = useDataMode();
const { isLoggedIn, login: commitLogin, requireLogin, updateCurrentUser } = useAuth();
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let skipNextShowReload = false;

const mockJobs = computed<GenerateHistoryJob[]>(() =>
  galleryGenTasks.map((task) => ({
    id: String(task.id),
    mode: "text-to-image",
    modelId: task.model,
    prompt: task.prompt,
    ratio: task.ratio,
    quality: task.quality,
    count: task.count,
    costCredits: 12,
    refundCredits: 0,
    status: "running",
    progress: task.percent,
    stageText: task.stage,
    results: [],
    createdAt: new Date(Date.now() - task.elapsed * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }))
);

const visibleJobs = computed(() => (useMockData.value ? filterJobs(mockJobs.value, activeFilter.value) : jobs.value));
const hasActiveJob = computed(() => !useMockData.value && jobs.value.some((job) => !isTerminal(job.status)));
const emptyTitle = computed(() => {
  if (activeFilter.value === "running") return "暂无进行中的生成任务";
  if (activeFilter.value === "succeeded") return "暂无已完成记录";
  if (activeFilter.value === "failed") return "暂无失败记录";
  return "暂无生成记录";
});

onLoad(() => {
  lastMode.value = useMockData.value;
  skipNextShowReload = true;
  void reloadJobs();
});

onShow(() => {
  if (skipNextShowReload) {
    skipNextShowReload = false;
    return;
  }
  const modeChanged = lastMode.value !== useMockData.value;
  lastMode.value = useMockData.value;
  if (useMockData.value && !modeChanged) return;
  void reloadJobs();
});

onBeforeUnmount(() => {
  clearRefreshTimer();
});

function isTerminal(status: GenerateJobStatus) {
  return status === "succeeded" || status === "partial_failed" || status === "failed" || status === "cancelled";
}

function isSuccess(status: GenerateJobStatus) {
  return status === "succeeded" || status === "partial_failed";
}

function filterJobs(items: GenerateHistoryJob[], filter: GenerateHistoryFilter) {
  if (filter === "all") return items;
  if (filter === "running") return items.filter((job) => !isTerminal(job.status));
  if (filter === "succeeded") return items.filter((job) => isSuccess(job.status));
  return items.filter((job) => job.status === "failed" || job.status === "cancelled");
}

function canCancel(status: GenerateJobStatus) {
  return status === "queued" || status === "running";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function formatMeta(job: GenerateHistoryJob) {
  return [job.modelId || job.providerModel || "AI模型", `${job.count}张`, job.ratio, job.quality].filter(Boolean).join(" · ");
}

function statusLabel(status: GenerateJobStatus) {
  return statusInfo[status]?.label || status;
}

function statusClass(status: GenerateJobStatus) {
  return statusInfo[status]?.className || "running";
}

function firstWorkId(job: GenerateHistoryJob) {
  return job.results.find((item) => item.workId)?.workId;
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }
}

function scheduleRefresh() {
  clearRefreshTimer();
  if (!isLoggedIn.value || !hasActiveJob.value) return;

  refreshTimer = setTimeout(() => {
    void refreshJobsSilently();
  }, 5000);
}

async function refreshJobsSilently() {
  if (isLoading.value || isLoadingMore.value) {
    scheduleRefresh();
    return;
  }

  try {
    await loadJobs(1, false, Math.max(PAGE_SIZE, page.value * PAGE_SIZE));
  } catch {
    // Keep the current list visible; the next manual refresh can surface errors.
  } finally {
    scheduleRefresh();
  }
}

async function loadJobs(nextPage = 1, append = false, pageSize = PAGE_SIZE) {
  if (useMockData.value) {
    jobs.value = [];
    hasMore.value = false;
    clearRefreshTimer();
    return;
  }
  if (!isLoggedIn.value) {
    jobs.value = [];
    page.value = 1;
    hasMore.value = false;
    clearRefreshTimer();
    return;
  }

  const result = await fetchGenerateHistoryJobs(activeFilter.value, nextPage, pageSize);
  jobs.value = append ? [...jobs.value, ...result.items] : result.items;
  page.value = append ? result.page : Math.max(nextPage, Math.ceil(pageSize / PAGE_SIZE));
  hasMore.value = result.hasMore;
  scheduleRefresh();
}

function openLoginSheet() {
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
}

async function reloadJobs() {
  isLoading.value = true;
  try {
    await loadJobs(1, false);
  } catch {
    uni.showToast({ title: "生成记录加载失败", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}

async function loadMore() {
  if (useMockData.value || isLoading.value || isLoadingMore.value || !hasMore.value) return;
  isLoadingMore.value = true;
  try {
    await loadJobs(page.value + 1, true);
  } catch {
    uni.showToast({ title: "加载更多失败", icon: "none" });
  } finally {
    isLoadingMore.value = false;
  }
}

function switchFilter(key: GenerateHistoryFilter) {
  if (key === activeFilter.value || isLoading.value) return;
  activeFilter.value = key;
  void reloadJobs();
}

function openCreate(job: GenerateHistoryJob) {
  uni.navigateTo({ url: `/pages/create/index?jobId=${encodeURIComponent(job.id)}` });
}

function openWork(event: Event, workId?: number) {
  event.stopPropagation();
  if (!workId) return;
  uni.navigateTo({ url: `/pages/work-detail/index?id=${workId}` });
}

async function retryJob(event: Event, job: GenerateHistoryJob) {
  event.stopPropagation();
  if (!useMockData.value && !ensureLogin()) return;
  if (useMockData.value) {
    uni.showToast({ title: "模拟数据下已重新加入队列", icon: "none" });
    return;
  }
  try {
    const result = await retryGenerateJob(job.id);
    addActiveGenerateJobId(result.jobId);
    if (typeof result.creditsAfter === "number") updateCurrentUser({ credits: result.creditsAfter });
    uni.showToast({ title: "已重新提交生成", icon: "none" });
    uni.navigateTo({ url: `/pages/create/index?jobId=${encodeURIComponent(result.jobId)}` });
  } catch {
    uni.showToast({ title: "重新生成失败，请稍后重试", icon: "none" });
  }
}

function confirmCancelJob() {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: "取消生成",
      content: "取消后会按后端规则退回未消耗积分，确定取消这个任务吗？",
      confirmText: "取消任务",
      confirmColor: "#ff5c7a",
      success(result) {
        resolve(Boolean(result.confirm));
      },
      fail() {
        resolve(false);
      }
    });
  });
}

async function cancelJob(event: Event, job: GenerateHistoryJob) {
  event.stopPropagation();
  if (!useMockData.value && !ensureLogin()) return;
  if (useMockData.value) {
    uni.showToast({ title: "模拟任务已取消", icon: "none" });
    return;
  }
  const confirmed = await confirmCancelJob();
  if (!confirmed) return;

  try {
    const result = await cancelGenerateJob(job.id);
    removeActiveGenerateJobIds([job.id]);
    if (typeof result.creditsAfter === "number") updateCurrentUser({ credits: result.creditsAfter });
    uni.showToast({ title: "任务已取消", icon: "none" });
    await reloadJobs();
  } catch {
    uni.showToast({ title: "取消失败，请稍后重试", icon: "none" });
  }
}

function goCreate() {
  uni.navigateTo({ url: "/pages/create/index" });
}

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    await reloadJobs();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}
</script>

<template>
  <view class="generation-history-page" :class="[themeClass, 'page-enter']">
    <scroll-view class="page-scroll" scroll-y :lower-threshold="80" @scrolltolower="loadMore">
      <view class="filter-bar">
        <view
          v-for="item in filters"
          :key="item.key"
          class="filter-item"
          :class="{ active: activeFilter === item.key }"
          @click="switchFilter(item.key)"
        >
          {{ item.label }}
        </view>
      </view>

      <view v-if="!useMockData && !isLoggedIn" class="empty-state">
        <view class="empty-icon">◎</view>
        <view class="empty-title">登录后查看生成记录</view>
        <view class="empty-sub">这里会保存你的生成进度、结果和失败记录</view>
        <button class="primary-btn" @click="showLoginSheet = true">立即登录</button>
      </view>

      <view v-else-if="isLoading" class="loading-state">
        <view class="spinner" />
      </view>

      <view v-else-if="visibleJobs.length" class="history-list">
        <view v-for="job in visibleJobs" :key="job.id" class="job-card" @click="openCreate(job)">
          <view class="job-head">
            <view class="job-main">
              <view class="job-prompt">{{ job.prompt }}</view>
              <view class="job-meta">{{ formatMeta(job) }}</view>
            </view>
            <view class="status-badge" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</view>
          </view>

          <view v-if="!isTerminal(job.status)" class="progress-row">
            <view class="progress-track">
              <view class="progress-fill" :style="{ width: `${Math.max(2, Math.min(job.progress || 2, 99))}%` }" />
            </view>
            <text class="progress-text">{{ Math.max(0, Math.min(job.progress || 0, 99)) }}%</text>
          </view>

          <view v-if="job.results.length" class="thumb-row">
            <image
              v-for="result in job.results.slice(0, 4)"
              :key="result.id"
              class="thumb"
              :src="result.imageUrl"
              mode="aspectFill"
              @click="openWork($event, result.workId)"
            />
          </view>

          <view v-if="job.errorMessage" class="error-text">{{ job.errorMessage }}</view>

          <view class="job-footer">
            <text>{{ formatTime(job.createdAt) }}</text>
            <text>消耗 {{ job.costCredits }} 积分</text>
            <text v-if="job.refundCredits">退回 {{ job.refundCredits }} 积分</text>
          </view>

          <view class="action-row">
            <button v-if="isSuccess(job.status) && firstWorkId(job)" class="ghost-btn" @click="openWork($event, firstWorkId(job))">查看草稿</button>
            <button v-if="isSuccess(job.status)" class="primary-btn small" @click.stop="openCreate(job)">查看结果</button>
            <button v-if="canCancel(job.status)" class="ghost-btn danger" @click="cancelJob($event, job)">取消任务</button>
            <button v-if="job.status === 'failed' || job.status === 'cancelled'" class="primary-btn small" @click="retryJob($event, job)">重新生成</button>
          </view>
        </view>

        <view class="load-more-hint" :class="{ loading: isLoadingMore }">
          <view v-if="isLoadingMore" class="spinner mini" />
          <text>{{ isLoadingMore ? "正在加载更多记录" : hasMore ? "继续下滑查看更多记录" : "没有更多生成记录了" }}</text>
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">◎</view>
        <view class="empty-title">{{ emptyTitle }}</view>
        <view class="empty-sub">完成一次创作后，生成进度和结果会展示在这里</view>
        <button class="primary-btn" @click="goCreate">去创作</button>
      </view>
    </scroll-view>

    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.generation-history-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.filter-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 8px;
  padding: 12px 16px 8px;
  background: var(--page-bg);
}

.filter-item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 32px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 999px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.filter-item.active {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

.history-list {
  padding: 4px 16px 22px;
}

.job-card {
  padding: 14px;
  margin-bottom: 12px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(91, 159, 232, 0.06);
}

.job-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.job-main {
  flex: 1;
  min-width: 0;
}

.job-prompt {
  display: -webkit-box;
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--fg-primary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.job-meta {
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  flex: 0 0 auto;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
}

.status-badge.running {
  color: var(--accent);
  background: var(--accent-soft);
}

.status-badge.succeeded {
  color: #33a878;
  background: rgba(111, 212, 176, 0.16);
}

.status-badge.failed {
  color: var(--rose);
  background: var(--rose-soft);
}

.progress-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.progress-track {
  flex: 1;
  height: 5px;
  overflow: hidden;
  background: var(--border);
  border-radius: 999px;
}

.progress-fill {
  height: 100%;
  background: var(--gradient-dream);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-text {
  width: 38px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  text-align: right;
}

.thumb-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
  margin-top: 12px;
}

.thumb {
  width: 100%;
  aspect-ratio: 1;
  background: var(--border);
  border-radius: 8px;
}

.error-text {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--rose);
}

.job-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--fg-muted);
}

.action-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.primary-btn,
.ghost-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  height: 34px;
  padding: 0 14px;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  border: none;
  border-radius: 999px;
}

.primary-btn {
  color: #fff;
  background: var(--accent);
}

.primary-btn.small {
  min-width: 78px;
  height: 30px;
  font-size: 12px;
}

.ghost-btn {
  color: var(--fg-secondary);
  background: var(--bg-card);
  border: 1px solid var(--card-border);
}

.ghost-btn.danger {
  color: var(--rose);
  background: var(--rose-soft);
  border-color: transparent;
}

.primary-btn::after,
.ghost-btn::after {
  border: none;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 24px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  margin-bottom: 12px;
  font-size: 28px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 16px;
}

.empty-title {
  margin-bottom: 5px;
  font-size: 16px;
  font-weight: 700;
}

.empty-sub {
  max-width: 260px;
  margin-bottom: 18px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--fg-muted);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner.mini {
  width: 15px;
  height: 15px;
  border-width: 1.5px;
}

.load-more-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 12px 0 6px;
  font-size: 12px;
  color: var(--fg-muted);
}

.load-more-hint.loading {
  color: var(--accent);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
