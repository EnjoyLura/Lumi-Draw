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

const OPEN_DURATION = 340;
const CLOSE_DURATION = 390;
const OPEN_FINAL_FRAME_DELAY = 24;
const CLOSE_FINAL_FRAME_DELAY = 48;
const CLOSE_FALLBACK_DELAY = 80;
const INITIAL_FRAME_DELAY = 16;
const SOURCE_FRAME_DELAY = 20;

const navigationMetrics = getNavigationMetrics();
const workId = ref<number | null>(null);
const isOpen = ref(false);
const backGuardMounted = ref(false);
const backGuardVisible = ref(false);
const surfaceVisible = ref(false);
const contentVisible = ref(false);
const sharedActive = ref(false);
const sharedImageVisible = ref(false);
const detailReady = ref(false);
const sharedImage = ref("");
const sourceRect = ref<WorkDetailSourceRect | null>(null);
const workRatio = ref("1:1");
const transitionPhase = ref<"idle" | "opening" | "open" | "closing">("idle");

let openTimer: ReturnType<typeof setTimeout> | undefined;
let surfaceTimer: ReturnType<typeof setTimeout> | undefined;
let backGuardTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
let detailReadyTimer: ReturnType<typeof setTimeout> | undefined;
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
  const sourceAspectRatio = source.width / source.height;
  const sharedWidth = Math.max(windowWidth, destinationHeight * sourceAspectRatio);
  const sharedHeight = Math.max(destinationHeight, windowWidth / sourceAspectRatio);
  const sharedCropX = Math.max(0, (sharedWidth - windowWidth) / 2);
  const sharedCropY = Math.max(0, (sharedHeight - destinationHeight) / 2);
  const sharedScale = source.width / sharedWidth;
  const pageSourceScale = Math.min(0.96, Math.max(0.24, source.width / windowWidth));
  const pageSourceWidth = windowWidth * pageSourceScale;
  const pageSourceHeight = windowHeight * pageSourceScale;
  const pageSourceX = Math.min(
    Math.max(0, source.left + source.width / 2 - pageSourceWidth / 2),
    Math.max(0, windowWidth - pageSourceWidth)
  );
  const pageSourceY = Math.min(
    Math.max(0, source.top + source.height / 2 - pageSourceHeight / 2),
    Math.max(0, windowHeight - pageSourceHeight)
  );
  return {
    "--detail-source-x": `${source.left}px`,
    "--detail-source-top": `${source.top}px`,
    "--detail-source-y": `${source.top - imageTop * (source.height / destinationHeight)}px`,
    "--detail-source-scale-x": String(source.width / windowWidth),
    "--detail-source-scale-y": String(source.height / destinationHeight),
    "--detail-shared-width": `${sharedWidth}px`,
    "--detail-shared-height": `${sharedHeight}px`,
    "--detail-shared-crop-x": `${sharedCropX}px`,
    "--detail-shared-crop-y": `${sharedCropY}px`,
    "--detail-shared-open-x": `${-sharedCropX}px`,
    "--detail-shared-open-y": `${imageTop - sharedCropY}px`,
    "--detail-shared-scale": String(sharedScale),
    "--detail-page-source-x": `${pageSourceX}px`,
    "--detail-page-source-y": `${pageSourceY}px`,
    "--detail-page-source-scale": String(pageSourceScale),
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
  backGuardMounted.value = false;
  backGuardVisible.value = false;
  surfaceVisible.value = false;
  contentVisible.value = Boolean(payload.sourceRect);
  workId.value = payload.work.id;
  workRatio.value = payload.work.ratio || "1:1";
  sharedImage.value = payload.work.image;
  sourceRect.value = payload.sourceRect;
  activeSourceId = payload.sourceId;
  activeSourceContext = payload.sourceContext;
  sharedActive.value = Boolean(payload.sourceRect);
  sharedImageVisible.value = false;
  detailReady.value = false;
  transitionPhase.value = "opening";
  closing = false;

  void nextTick(() => {
    surfaceTimer = setTimeout(() => {
      surfaceVisible.value = true;
      surfaceTimer = undefined;

      openTimer = setTimeout(() => {
        isOpen.value = true;
        openTimer = undefined;
        if (!payload.sourceRect) {
          contentVisible.value = true;
        }
        backGuardTimer = setTimeout(() => {
          backGuardMounted.value = true;
          backGuardVisible.value = true;
          backGuardTimer = undefined;
        }, OPEN_DURATION);
        detailReadyTimer = setTimeout(() => {
          detailReady.value = true;
          transitionPhase.value = "open";
          detailReadyTimer = undefined;
        }, OPEN_DURATION + OPEN_FINAL_FRAME_DELAY);
      }, SOURCE_FRAME_DELAY);
    }, INITIAL_FRAME_DELAY);
  });
}

async function closeOverlay() {
  if (closing || !workId.value) return;
  closing = true;
  transitionPhase.value = "closing";
  detailReady.value = false;
  if (detailReadyTimer) clearTimeout(detailReadyTimer);
  if (activeSourceId) {
    const latestRect = await resolveWorkDetailSourceRect(activeSourceId, activeSourceContext);
    if (latestRect) {
      sourceRect.value = latestRect;
      sharedActive.value = true;
      await nextTick();
    }
  }
  if (openTimer) clearTimeout(openTimer);
  if (backGuardTimer) {
    clearTimeout(backGuardTimer);
    backGuardTimer = undefined;
  }
  backGuardVisible.value = false;
  contentVisible.value = false;
  if (closeTimer) clearTimeout(closeTimer);
  sharedImageVisible.value = Boolean(sharedActive.value && sharedImage.value);
  await nextTick();
  openTimer = setTimeout(() => {
    isOpen.value = false;
    openTimer = undefined;
    closeTimer = setTimeout(finishClose, CLOSE_DURATION + CLOSE_FALLBACK_DELAY);
  }, 16);
}

function handleTransitionEnd() {
  if (isOpen.value) return;
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(finishClose, CLOSE_FINAL_FRAME_DELAY);
}

function finishClose() {
  if (isOpen.value) return;
  clearTimers();
  workId.value = null;
  backGuardMounted.value = false;
  backGuardVisible.value = false;
  surfaceVisible.value = false;
  detailReady.value = false;
  sharedImageVisible.value = false;
  sharedImage.value = "";
  activeSourceId = undefined;
  activeSourceContext = undefined;
  transitionPhase.value = "idle";
  closing = false;
}

function handleSystemBack() {
  if (!workId.value || !isOpen.value) return;
  void closeOverlay();
}

function clearTimers() {
  if (openTimer) clearTimeout(openTimer);
  if (surfaceTimer) clearTimeout(surfaceTimer);
  if (backGuardTimer) clearTimeout(backGuardTimer);
  if (closeTimer) clearTimeout(closeTimer);
  if (detailReadyTimer) clearTimeout(detailReadyTimer);
  openTimer = undefined;
  surfaceTimer = undefined;
  backGuardTimer = undefined;
  closeTimer = undefined;
  detailReadyTimer = undefined;
}
</script>

<template>
  <page-container
    v-if="workId && backGuardMounted"
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
    :class="{
      open: isOpen,
      opening: transitionPhase === 'opening',
      closing: transitionPhase === 'closing',
      'surface-visible': surfaceVisible
    }"
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
        :detail-ready="detailReady"
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
  --detail-target-offset: 0px;
  --detail-target-scale: 1;
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
  background: rgba(0, 0, 0, .58);
  opacity: 0;
  transition: opacity 390ms cubic-bezier(.4, 0, .2, 1);
}

.work-detail-overlay.open .work-detail-overlay-backdrop {
  opacity: 1;
  transition-duration: 340ms;
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
  -webkit-transform: translate3d(var(--detail-source-x), var(--detail-source-y), 0) scale3d(var(--detail-source-scale-x), var(--detail-source-scale-y), 1);
  transform: translate3d(var(--detail-source-x), var(--detail-source-y), 0) scale3d(var(--detail-source-scale-x), var(--detail-source-scale-y), 1);
  transition: opacity 60ms ease, transform 390ms cubic-bezier(.4, 0, .2, 1), -webkit-clip-path 390ms cubic-bezier(.4, 0, .2, 1), clip-path 390ms cubic-bezier(.4, 0, .2, 1);
  will-change: transform, clip-path;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.work-detail-overlay.open {
  pointer-events: auto;
}

.work-detail-overlay.open .work-detail-overlay-surface.from-source {
  -webkit-clip-path: inset(0 0 0 0 round 0);
  clip-path: inset(0 0 0 0 round 0);
  -webkit-transform: translate3d(var(--detail-target-offset), var(--detail-target-offset), 0) scale3d(var(--detail-target-scale), var(--detail-target-scale), 1);
  transform: translate3d(var(--detail-target-offset), var(--detail-target-offset), 0) scale3d(var(--detail-target-scale), var(--detail-target-scale), 1);
  transition: opacity 60ms ease, transform 320ms cubic-bezier(.4, 0, .2, 1), -webkit-clip-path 320ms cubic-bezier(.4, 0, .2, 1), clip-path 320ms cubic-bezier(.4, 0, .2, 1);
}

.work-detail-overlay.opening .work-detail-overlay-surface.from-source {
  -webkit-clip-path: inset(0 0 0 0 round 0);
  clip-path: inset(0 0 0 0 round 0);
  -webkit-transform: translate3d(var(--detail-page-source-x), var(--detail-page-source-y), 0) scale3d(var(--detail-page-source-scale), var(--detail-page-source-scale), 1);
  transform: translate3d(var(--detail-page-source-x), var(--detail-page-source-y), 0) scale3d(var(--detail-page-source-scale), var(--detail-page-source-scale), 1);
  border-radius: 10px;
  transition: transform 340ms cubic-bezier(.22, 1, .36, 1);
  will-change: transform;
}

.work-detail-overlay.opening.open .work-detail-overlay-surface.from-source {
  -webkit-transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
  transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
}

.work-detail-shared-image-frame {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: var(--detail-shared-width);
  height: var(--detail-shared-height);
  overflow: hidden;
  pointer-events: none;
  -webkit-clip-path: inset(0 0 0 0 round 10px);
  clip-path: inset(0 0 0 0 round 10px);
  -webkit-transform-origin: top left;
  transform-origin: top left;
  -webkit-transform: translate3d(var(--detail-source-x), var(--detail-source-top), 0) scale3d(var(--detail-shared-scale), var(--detail-shared-scale), 1);
  transform: translate3d(var(--detail-source-x), var(--detail-source-top), 0) scale3d(var(--detail-shared-scale), var(--detail-shared-scale), 1);
  transition:
    transform 390ms cubic-bezier(.4, 0, .2, 1),
    -webkit-clip-path 390ms cubic-bezier(.4, 0, .2, 1),
    clip-path 390ms cubic-bezier(.4, 0, .2, 1);
  will-change: transform, clip-path;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.work-detail-overlay.open .work-detail-shared-image-frame {
  -webkit-clip-path: inset(var(--detail-shared-crop-y) var(--detail-shared-crop-x) var(--detail-shared-crop-y) var(--detail-shared-crop-x) round 0);
  clip-path: inset(var(--detail-shared-crop-y) var(--detail-shared-crop-x) var(--detail-shared-crop-y) var(--detail-shared-crop-x) round 0);
  -webkit-transform: translate3d(var(--detail-shared-open-x), var(--detail-shared-open-y), 0) scale3d(1, 1, 1);
  transform: translate3d(var(--detail-shared-open-x), var(--detail-shared-open-y), 0) scale3d(1, 1, 1);
  transition-duration: 320ms;
}

.work-detail-shared-image {
  display: block;
  width: 100%;
  height: 100%;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}
</style>
