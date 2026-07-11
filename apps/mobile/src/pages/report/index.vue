<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { onMounted, onUnmounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { navigateBackOrRedirect } from "../../services/navigation";
import { reportReasons } from "../work-detail/workDetailData";
import { submitWorkReport } from "./reportService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const selectedReasonIndex = ref(-1);
const description = ref("");
const workId = ref(0);
const isSubmitting = ref(false);
const showLoginSheet = ref(false);
const { login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();

function leaveReportPage() {
  navigateBackOrRedirect(workId.value ? `/pages/work-detail/index?id=${workId.value}` : "/pages/plaza/index");
}

onLoad((query) => {
  workId.value = resolveRouteWorkId(query);
});

onShow(() => {
  const nextId = resolveRouteWorkId();
  if (nextId !== workId.value) workId.value = nextId;
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
  const nextId = resolveRouteWorkId();
  if (nextId !== workId.value) workId.value = nextId;
}

function resolveRouteWorkId(query?: Record<string, unknown>) {
  const queryId = Number(query?.workId || 0);
  if (Number.isFinite(queryId) && queryId > 0) return queryId;

  if (typeof window !== "undefined") {
    const hashId = Number(window.location.hash.match(/[?&]workId=([^&]+)/)?.[1] || 0);
    if (Number.isFinite(hashId) && hashId > 0) return hashId;
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  const pageId = Number(current?.options?.workId || current?.$page?.options?.workId || 0);
  return Number.isFinite(pageId) && pageId > 0 ? pageId : 0;
}

function selectReason(index: number) {
  selectedReasonIndex.value = index;
}

async function submitReport() {
  if (selectedReasonIndex.value < 0) {
    uni.showToast({ title: "请选择举报原因", icon: "none" });
    return;
  }
  if (!workId.value) {
    uni.showToast({ title: "作品信息缺失", icon: "none" });
    return;
  }
  if (!requireLogin(() => (showLoginSheet.value = true))) return;
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    let duplicated = false;
    if (!useMockData.value) {
      const result = await submitWorkReport(workId.value, {
        reason: reportReasons[selectedReasonIndex.value],
        description: description.value.trim()
      });
      duplicated = result.duplicated;
    }
    uni.showToast({ title: duplicated ? "已收到举报，请勿重复提交" : "举报已提交，我们会尽快处理", icon: "none" });
    setTimeout(() => {
      leaveReportPage();
    }, 450);
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "举报提交失败，请稍后重试", icon: "none" });
  } finally {
    isSubmitting.value = false;
  }
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
  <view class="report-page" :class="themeClass">
    <LumiPageHeader title="举报" />
    <LumiDeferredPageContent>
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
        <textarea v-model="description" class="desc-input" maxlength="500" placeholder="请描述具体问题..." />
        <button class="submit-btn" :disabled="isSubmitting" @click="submitReport">
          {{ isSubmitting ? "提交中..." : "提交举报" }}
        </button>
      </view>
    </scroll-view>
    </LumiDeferredPageContent>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
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

.submit-btn[disabled] {
  opacity: 0.72;
}

.submit-btn::after {
  border: none;
}

/* Lumi custom page header layout */
.report-page {
  display: flex;
  flex-direction: column;
}

.report-page > .page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
