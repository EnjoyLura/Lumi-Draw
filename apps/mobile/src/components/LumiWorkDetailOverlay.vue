<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import WorkDetailPage from "../pages/work-detail/index.vue";
import { getNavigationMetrics } from "../services/navigationMetrics";
import {
  registerWorkDetailOverlay,
  type WorkDetailOverlayOpenPayload,
  type WorkDetailSourceRect
} from "../services/workDetailNavigation";
import { resolveWorkDetailImageHeight } from "../services/workDetailLayout";

const props = defineProps<{ ownerRoute: string }>();

const OPEN_DURATION = 320;
const CLOSE_DURATION = 390;
const CLOSE_HANDOFF_AT = 330;
const FINAL_FRAME_DELAY = 24;

const navigationMetrics = getNavigationMetrics();
const workId = ref<number | null>(null);
const isOpen = ref(false);
const backGuardVisible = ref(false);
const surfaceVisible = ref(false);
const contentVisible = ref(false);
const sharedActive = ref(false);
const sourceRect = ref<WorkDetailSourceRect | null>(null);
const workRatio = ref("1:1");

let openTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
let contentTimer: ReturnType<typeof setTimeout> | undefined;
let handoffTimer: ReturnType<typeof setTimeout> | undefined;
let unregisterOverlay: (() => void) | undefined;

const surfaceStyle = computed(() => {
  const source = sourceRect.value;
  if (!source) return {};
  const systemInfo = uni.getSystemInfoSync();
  const windowWidth = systemInfo.windowWidth || navigationMetrics.windowWidth || 375;
  const windowHeight = systemInfo.windowHeight || 760;
  const destinationHeight = resolveWorkDetailImageHeight(workRatio.value, windowWidth);
  const imageTop = navigationMetrics.statusBarHeight + navigationMetrics.navigationBarHeight;
  const imageBottom = Math.max(0, windowHeight - imageTop - destinationHeight);
  return {
    "--detail-source-x": `${source.left}px`,
    "--detail-source-y": `${source.top - imageTop * (source.height / destinationHeight)}px`,
    "--detail-source-scale-x": String(source.width / windowWidth),
    "--detail-source-scale-y": String(source.height / destinationHeight),
    "--detail-image-top": `${imageTop}px`,
    "--detail-image-bottom": `${imageBottom}px`,
    "--detail-surface-height": `${windowHeight}px`
  };
});

onMounted(() => {
  unregisterOverlay = registerWorkDetailOverlay(props.ownerRoute, openOverlay);
});

onBeforeUnmount(() => {
  unregisterOverlay?.();
  unregisterOverlay = undefined;
  clearTimers();
});

function openOverlay(payload: WorkDetailOverlayOpenPayload) {
  clearTimers();
  isOpen.value = false;
  backGuardVisible.value = false;
  surfaceVisible.value = false;
  contentVisible.value = false;
  workId.value = payload.work.id;
  workRatio.value = payload.work.ratio || "1:1";
  sourceRect.value = payload.sourceRect;
  sharedActive.value = Boolean(payload.sourceRect);

  void nextTick(() => {
    openTimer = setTimeout(() => {
      isOpen.value = true;
      backGuardVisible.value = true;
      surfaceVisible.value = true;
      openTimer = undefined;
      if (!payload.sourceRect) {
        contentVisible.value = true;
        return;
      }
      contentTimer = setTimeout(() => {
        contentVisible.value = true;
        contentTimer = undefined;
      }, 10);
    }, 16);
  });
}

function closeOverlay() {
  if (openTimer) clearTimeout(openTimer);
  isOpen.value = false;
  backGuardVisible.value = false;
  contentVisible.value = false;
  if (contentTimer) clearTimeout(contentTimer);
  if (closeTimer) clearTimeout(closeTimer);
  if (handoffTimer) clearTimeout(handoffTimer);
  handoffTimer = setTimeout(() => {
    surfaceVisible.value = false;
    handoffTimer = undefined;
  }, sharedActive.value ? CLOSE_HANDOFF_AT : 0);
  closeTimer = setTimeout(finishClose, CLOSE_DURATION + 60);
}

function handleTransitionEnd() {
  if (isOpen.value) return;
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(finishClose, FINAL_FRAME_DELAY);
}

function finishClose() {
  if (isOpen.value) return;
  clearTimers();
  workId.value = null;
  backGuardVisible.value = false;
  surfaceVisible.value = false;
}

function handleSystemBack() {
  if (!workId.value || !isOpen.value) return;
  closeOverlay();
}

function clearTimers() {
  if (openTimer) clearTimeout(openTimer);
  if (closeTimer) clearTimeout(closeTimer);
  if (contentTimer) clearTimeout(contentTimer);
  if (handoffTimer) clearTimeout(handoffTimer);
  openTimer = undefined;
  closeTimer = undefined;
  contentTimer = undefined;
  handoffTimer = undefined;
}
</script>

<template>
  <page-container
    v-if="workId"
    :show="backGuardVisible"
    :duration="0"
    :overlay="false"
    :z-index="999"
    custom-style="width:1px;height:1px;background:transparent;pointer-events:none;"
    @beforeleave="handleSystemBack"
  />
  <view
    v-if="workId"
    class="work-detail-overlay"
    :class="{ open: isOpen, 'surface-visible': surfaceVisible }"
    @touchmove.stop.prevent
  >
    <view class="work-detail-overlay-backdrop" />
    <view
      class="work-detail-overlay-surface"
      :class="{ 'from-source': sharedActive }"
      :style="surfaceStyle"
      @transitionend.self="handleTransitionEnd"
    >
      <WorkDetailPage
        embedded
        :open="isOpen"
        :initial-work-id="workId"
        :shared-transitioning="false"
        :content-visible="contentVisible"
        @close="closeOverlay"
      />
    </view>
  </view>
</template>

<style scoped>
.work-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  overflow: hidden;
  background: transparent;
}

.work-detail-overlay-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  transition: background 390ms cubic-bezier(.4, 0, .2, 1);
}

.work-detail-overlay.open .work-detail-overlay-backdrop {
  background: rgba(0, 0, 0, .58);
  transition-duration: 320ms;
}

.work-detail-overlay-surface {
  position: relative;
  z-index: 1;
  width: 100%;
  height: var(--detail-surface-height, 100%);
  overflow: hidden;
  background: var(--bg-base);
  opacity: 0;
  transform-origin: top left;
  transition: opacity 60ms ease;
}

.work-detail-overlay.surface-visible .work-detail-overlay-surface {
  opacity: 1;
}

.work-detail-overlay-surface.from-source {
  -webkit-clip-path: inset(var(--detail-image-top) 0 var(--detail-image-bottom) 0 round 10px);
  clip-path: inset(var(--detail-image-top) 0 var(--detail-image-bottom) 0 round 10px);
  transform: translate(var(--detail-source-x), var(--detail-source-y)) scale(var(--detail-source-scale-x), var(--detail-source-scale-y));
  transition: opacity 60ms ease, transform 390ms cubic-bezier(.4, 0, .2, 1), -webkit-clip-path 390ms cubic-bezier(.4, 0, .2, 1), clip-path 390ms cubic-bezier(.4, 0, .2, 1);
  will-change: transform, clip-path;
}

.work-detail-overlay.open {
  pointer-events: auto;
}

.work-detail-overlay.open .work-detail-overlay-surface.from-source {
  -webkit-clip-path: inset(0 0 0 0 round 0);
  clip-path: inset(0 0 0 0 round 0);
  transform: translate(0, 0) scale(1, 1);
  transition: opacity 60ms ease, transform 320ms cubic-bezier(.4, 0, .2, 1), -webkit-clip-path 320ms cubic-bezier(.4, 0, .2, 1), clip-path 320ms cubic-bezier(.4, 0, .2, 1);
}
</style>
