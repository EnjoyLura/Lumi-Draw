<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useDataMode } from "../../services/dataMode";
import { refreshNavigationTitle } from "../../services/navigationTitle";
import { fetchAgreement } from "../settings/settingsService";
import { useTheme } from "../../services/theme";
import { mobileAgreementFallback } from "./agreementContent";

const { themeClass } = useTheme();

const mockAgreements = mobileAgreementFallback;
const { useMockData } = useDataMode();
type AgreementType = keyof typeof mockAgreements;

function fallbackAgreement(type: string) {
  return mockAgreements[type as AgreementType] || mockAgreements.user;
}

const agreementType = ref("user");
const title = ref("协议");
const content = ref("");
const updatedAt = ref("");
const isLoading = ref(false);
const loadFailed = ref(false);
let lastLoadKey = "";

const updatedText = computed(() => (updatedAt.value ? `更新于 ${updatedAt.value.slice(0, 10)}` : ""));

onLoad((query) => {
  agreementType.value = resolveRouteType(query);
  void loadAgreement();
});

onShow(() => {
  const nextType = resolveRouteType();
  const nextLoadKey = `${nextType}-${useMockData.value}`;
  if (nextType !== agreementType.value) agreementType.value = nextType;
  if (nextLoadKey === lastLoadKey) return;
  void loadAgreement();
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
  const nextType = resolveRouteType();
  if (nextType === agreementType.value) return;
  agreementType.value = nextType;
  void loadAgreement();
}

function resolveRouteType(query?: Record<string, unknown>) {
  const queryType = typeof query?.type === "string" ? query.type : "";
  if (queryType) return queryType;

  if (typeof window !== "undefined") {
    const hashType = window.location.hash.match(/[?&]type=([^&]+)/)?.[1];
    if (hashType) return decodeURIComponent(hashType);
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  return current?.options?.type || current?.$page?.options?.type || "user";
}

async function loadAgreement() {
  lastLoadKey = `${agreementType.value}-${useMockData.value}`;
  const mock = fallbackAgreement(agreementType.value);
  title.value = mock.title;
  refreshNavigationTitle(mock.title);
  content.value = "";
  updatedAt.value = "";
  loadFailed.value = false;
  isLoading.value = true;
  try {
    if (useMockData.value) {
      content.value = mock.content;
      return;
    }
    const data = await fetchAgreement(agreementType.value);
    if (!data.content?.trim()) throw new Error("agreement content is empty");
    title.value = data.title;
    refreshNavigationTitle(data.title);
    content.value = data.content;
    updatedAt.value = data.updatedAt;
  } catch {
    const fallback = fallbackAgreement(agreementType.value);
    title.value = fallback.title;
    refreshNavigationTitle(fallback.title);
    content.value = fallback.content;
    updatedAt.value = "";
    loadFailed.value = false;
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <view class="agreement-page" :class="themeClass">
    <LumiPageHeader />
    <LumiDeferredPageContent class="agreement-deferred">
    <scroll-view class="page-scroll" scroll-y>
      <view class="agreement-content">
        <view class="title-row">
          <view>
            <view class="page-title">{{ title }}</view>
            <view v-if="updatedText" class="updated-text">{{ updatedText }}</view>
          </view>
          <view v-if="isLoading" class="spinner" />
        </view>
        <view v-if="!useMockData && loadFailed" class="failure-card">
          <view class="failure-title">协议加载失败</view>
          <view class="failure-sub">当前不会显示本地模拟协议内容，请重新加载后查看后端配置。</view>
          <button class="failure-btn" @click="loadAgreement">重新加载</button>
        </view>
        <view v-else class="content-card">
          <text class="content-text">{{ content }}</text>
        </view>
      </view>
    </scroll-view>
    </LumiDeferredPageContent>
  </view>
</template>

<style scoped>
.agreement-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.agreement-content {
  padding: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
}

.updated-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--fg-muted);
}

.content-card {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.failure-card {
  padding: 22px 16px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.failure-title {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--fg-primary);
}

.failure-sub {
  margin-bottom: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--fg-muted);
}

.failure-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin: 0 auto;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 999px;
  line-height: 1.4;
}

.failure-btn::after {
  border: none;
}

.content-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--fg-secondary);
  white-space: pre-wrap;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Lumi custom page header layout */
.agreement-page {
  display: flex;
  flex-direction: column;
}

.agreement-page > .agreement-deferred {
  flex: 1;
  min-height: 0;
}

.agreement-deferred > .page-scroll {
  height: 100%;
}
</style>
