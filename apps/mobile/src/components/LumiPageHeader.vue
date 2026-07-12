<script setup lang="ts">
import { onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentPageTitle } from "../services/navigationTitle";
import { getNavigationMetrics } from "../services/navigationMetrics";

const props = defineProps<{
  title?: string;
  embedded?: boolean;
}>();
const emit = defineEmits<{ back: [] }>();

const statusBarHeight = ref(0);
const navigationBarHeight = ref(50);
const canGoBack = ref(false);
const resolvedTitle = ref(props.title || "");
const currentRoute = ref("");

const ROOT_ROUTES = new Set(["pages/home/index", "pages/create/index", "pages/plaza/index", "pages/gallery/index", "pages/mine/index"]);

const ROUTE_FALLBACKS: Record<string, string> = {
  "pages/messages/index": "/pages/mine/index",
  "pages/message-detail/index": "/pages/messages/index",
  "pages/settings/index": "/pages/mine/index",
  "pages/edit-profile/index": "/pages/mine/index",
  "pages/checkin/index": "/pages/mine/index",
  "pages/recharge/index": "/pages/mine/index",
  "pages/membership/index": "/pages/mine/index",
  "pages/invite/index": "/pages/mine/index",
  "pages/feedback/index": "/pages/mine/index",
  "pages/drafts/index": "/pages/mine/index",
  "pages/history/index": "/pages/mine/index",
  "pages/follow-list/index": "/pages/mine/index",
  "pages/generation-history/index": "/pages/gallery/index",
  "pages/publish/index": "/pages/gallery/index",
  "pages/edit-work/index": "/pages/gallery/index",
  "pages/work-detail/index": "/pages/plaza/index",
  "pages/report/index": "/pages/plaza/index",
  "pages/user-profile/index": "/pages/plaza/index",
  "pages/all-gameplays/index": "/pages/home/index",
  "pages/search/index": "/pages/home/index",
  "pages/reverse-prompt/index": "/pages/create/index",
  "pages/agreement/index": "/pages/settings/index",
  "pages/changelog/index": "/pages/settings/index"
};

const navigationMetrics = getNavigationMetrics();
statusBarHeight.value = navigationMetrics.statusBarHeight;
navigationBarHeight.value = navigationMetrics.navigationBarHeight;

function readCurrentRoute() {
  try {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1] as { route?: string } | undefined;
    if (current?.route) return current.route.replace(/^\/+/, "");
  } catch {
    // Fall back to the H5 hash below.
  }

  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#\/?/, "").split("?")[0].replace(/^\/+/, "");
}

function hasPageStack() {
  try {
    return getCurrentPages().length > 1;
  } catch {
    return false;
  }
}

function syncCanGoBack() {
  currentRoute.value = readCurrentRoute();
  canGoBack.value = Boolean(props.embedded) || hasPageStack() || (!!currentRoute.value && !ROOT_ROUTES.has(currentRoute.value));
  resolvedTitle.value = props.title || getCurrentPageTitle();
}

function goBack() {
  if (!canGoBack.value) return;
  if (props.embedded) {
    emit("back");
    return;
  }
  if (hasPageStack()) {
    uni.navigateBack();
    return;
  }
  uni.redirectTo({ url: ROUTE_FALLBACKS[currentRoute.value] || "/pages/home/index" });
}

onMounted(syncCanGoBack);
onShow(syncCanGoBack);
</script>

<template>
  <view class="lumi-page-header">
    <view class="lumi-status-spacer" :style="{ height: statusBarHeight + 'px' }" />
    <view class="lumi-title-row" :style="{ height: `${navigationBarHeight}px` }">
      <button v-if="canGoBack" class="lumi-back" @click="goBack">‹</button>
      <view class="lumi-page-title">{{ resolvedTitle }}</view>
    </view>
  </view>
</template>

<style scoped>
.lumi-page-header {
  --lumi-header-height: 50px;
  position: relative;
  z-index: 20;
  flex: 0 0 auto;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.lumi-title-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--lumi-header-height);
  padding: 0 56px;
  box-sizing: border-box;
}

.lumi-back {
  position: absolute;
  left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  margin: 0;
  font-size: 34px;
  font-weight: 300;
  line-height: 1;
  color: var(--fg-primary);
  background: transparent;
  border: 0;
}

.lumi-back::after {
  border: 0;
}

.lumi-page-title {
  max-width: 100%;
  overflow: hidden;
  font-size: 18px;
  font-weight: 700;
  color: var(--fg-primary);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
