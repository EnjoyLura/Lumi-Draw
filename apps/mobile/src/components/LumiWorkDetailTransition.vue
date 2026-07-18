<script setup lang="ts">
import { nextTick, ref } from "vue";
import { getNavigationMetrics } from "../services/navigationMetrics";

const visible = ref(false);
const expanded = ref(false);
const image = ref("");
const fromStyle = ref<Record<string, string>>({});
const toStyle = ref<Record<string, string>>({});

function getRect(selector: string) {
  return new Promise<UniApp.NodeInfo | null>((resolve) => {
    uni.createSelectorQuery().select(selector).boundingClientRect((rect) => resolve(rect)).exec();
  });
}

async function play(options: { selector: string; image: string; ratio: string }) {
  const rect = await getRect(options.selector);
  if (!rect || !options.image) return false;

  const metrics = getNavigationMetrics();
  const windowWidth = metrics.windowWidth || rect.width;
  const [ratioWidth, ratioHeight] = options.ratio.split(":").map(Number);
  const imageHeight = ratioWidth && ratioHeight ? (ratioHeight / ratioWidth) * windowWidth : windowWidth;
  const targetHeight = Math.min(Math.max(imageHeight, 260), 560);
  const targetTop = metrics.statusBarHeight + metrics.navigationBarHeight;

  image.value = options.image;
  fromStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: "10px"
  };
  toStyle.value = {
    left: "0px",
    top: `${targetTop}px`,
    width: `${windowWidth}px`,
    height: `${targetHeight}px`,
    borderRadius: "0px"
  };
  visible.value = true;
  expanded.value = false;
  await nextTick();
  await new Promise<void>((resolve) => setTimeout(resolve, 16));
  expanded.value = true;
  await new Promise<void>((resolve) => setTimeout(resolve, 270));
  return true;
}

function finish() {
  visible.value = false;
  expanded.value = false;
}

defineExpose({ play, finish });
</script>

<template>
  <view v-if="visible" class="work-detail-transition" :class="{ expanded }">
    <view class="transition-backdrop" />
    <image class="transition-image" :src="image" mode="aspectFill" :style="expanded ? toStyle : fromStyle" />
  </view>
</template>

<style scoped>
.work-detail-transition {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.transition-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  transition: background .28s cubic-bezier(.16, 1, .3, 1);
}

.expanded .transition-backdrop { background: rgba(0, 0, 0, .58); }

.transition-image {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  box-shadow: 0 16px 42px rgba(0, 0, 0, .28);
  transition: left .28s cubic-bezier(.16, 1, .3, 1), top .28s cubic-bezier(.16, 1, .3, 1), width .28s cubic-bezier(.16, 1, .3, 1), height .28s cubic-bezier(.16, 1, .3, 1), border-radius .28s cubic-bezier(.16, 1, .3, 1);
}
</style>
