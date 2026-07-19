<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import LumiWorkDetailContent from "./LumiWorkDetailContent.vue";
import { getNavigationMetrics } from "../services/navigationMetrics";
import {
  registerWorkDetailOverlay,
  resolveWorkDetailSourceRect,
  type WorkDetailOverlayOpenPayload,
  type WorkDetailSourceRect
} from "../services/workDetailNavigation";
import { resolveWorkDetailImageHeight } from "../services/workDetailLayout";

const props = defineProps<{ ownerRoute: string }>();

const OPEN_DURATION = 320;
const CLOSE_DURATION = 390;
const FINAL_FRAME_DELAY = 24;

const navigationMetrics = getNavigationMetrics();
const workId = ref<number | null>(null);
const isOpen = ref(false);
const backGuardVisible = ref(false);
const surfaceVisible = ref(false);
const contentVisible = ref(false);
const sharedActive = ref(false);
const sharedImageVisible = ref(false);
const sharedImage = ref("");
const sourceRect = ref<WorkDetailSourceRect | null>(null);
const workRatio = ref("1:1");

let openTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
let contentTimer: ReturnType<typeof setTimeout> | undefined;
let sharedImageTimer: ReturnType<typeof setTimeout> | undefined;
let unregisterOverlay: (() => void) | undefined;
let activeSourceId: string | undefined;
let activeSourceContext: object | null | undefined;
let closing = false;

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
    "--detail-source-top": `${source.top}px`,
    "--detail-source-width": `${source.width}px`,
    "--detail-source-height": `${source.height}px`,
    "--detail-source-y": `${source.top - imageTop * (source.height / destinationHeight)}px`,
    "--detail-source-scale-x": String(source.width / windowWidth),
    "--detail-source-scale-y": String(source.height / destinationHeight),
    "--detail-image-top": `${imageTop}px`,
    "--detail-image-bottom": `${imageBottom}px`,
    "--detail-image-height": `${destinationHeight}px`,
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
  sharedImage.value = payload.work.image;
  sourceRect.value = payload.sourceRect;
  activeSourceId = payload.sourceId;
  activeSourceContext = payload.sourceContext;
  sharedActive.value = Boolean(payload.sourceRect);
  sharedImageVisible.value = Boolean(payload.sourceRect && sharedImage.value);
  closing = false;

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
      sharedImageTimer = setTimeout(() => {
        sharedImageVisible.value = false;
        sharedImageTimer = undefined;
      }, OPEN_DURATION + FINAL_FRAME_DELAY);
    }, 16);
  });
}

async function closeOverlay() {
  if (closing || !workId.value) return;
  closing = true;
  if (activeSourceId) {
    const latestRect = await resolveWorkDetailSourceRect(activeSourceId, activeSourceContext);
    if (latestRect) {
      sourceRect.value = latestRect;
      sharedActive.value = true;
      await nextTick();
    }
  }
  if (openTimer) clearTimeout(openTimer);
  backGuardVisible.value = false;
  contentVisible.value = false;
  if (contentTimer) clearTimeout(contentTimer);
  if (sharedImageTimer) clearTimeout(sharedImageTimer);
  if (closeTimer) clearTimeout(closeTimer);
  sharedImageVisible.value = Boolean(sharedActive.value && sharedImage.value);
  await nextTick();
  openTimer = setTimeout(() => {
    isOpen.value = false;
    openTimer = undefined;
    closeTimer = setTimeout(finishClose, CLOSE_DURATION + 60);
  }, 16);
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
  sharedImageVisible.value = false;
  sharedImage.value = "";
  activeSourceId = undefined;
  activeSourceContext = undefined;
  closing = false;
}

function handleSystemBack() {
  if (!workId.value || !isOpen.value) return;
  void closeOverlay();
}

function clearTimers() {
  if (openTimer) clearTimeout(openTimer);
  if (closeTimer) clearTimeout(closeTimer);
  if (contentTimer) clearTimeout(contentTimer);
  if (sharedImageTimer) clearTimeout(sharedImageTimer);
  openTimer = undefined;
  closeTimer = undefined;
  contentTimer = undefined;
  sharedImageTimer = undefined;
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
      <LumiWorkDetailContent
        embedded
        :open="isOpen"
        :initial-work-id="workId"
        :shared-transitioning="sharedImageVisible"
        :content-visible="contentVisible"
        @close="void closeOverlay()"
      />
    </view>
    <view
      v-if="sharedImageVisible && sharedImage"
      class="work-detail-shared-image-frame"
      :style="surfaceStyle"
    >
      <image class="work-detail-shared-image" :src="sharedImage" mode="aspectFill" />
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

.work-detail-shared-image-frame {
  position: absolute;
  z-index: 2;
  top: var(--detail-source-top);
  left: var(--detail-source-x);
  width: var(--detail-source-width);
  height: var(--detail-source-height);
  overflow: hidden;
  pointer-events: none;
  border-radius: 10px;
  transition:
    top 390ms cubic-bezier(.4, 0, .2, 1),
    left 390ms cubic-bezier(.4, 0, .2, 1),
    width 390ms cubic-bezier(.4, 0, .2, 1),
    height 390ms cubic-bezier(.4, 0, .2, 1),
    border-radius 390ms cubic-bezier(.4, 0, .2, 1);
  will-change: top, left, width, height, border-radius;
}

.work-detail-overlay.open .work-detail-shared-image-frame {
  top: var(--detail-image-top);
  left: 0;
  width: 100%;
  height: var(--detail-image-height);
  border-radius: 0;
  transition-duration: 320ms;
}

.work-detail-shared-image {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
