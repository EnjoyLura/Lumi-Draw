<script setup lang="ts">
import { onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import GalleryPage from "../gallery/index.vue";

const props = withDefaults(defineProps<{ detailOwnerRoute?: string; renderDetailOverlay?: boolean }>(), {
  detailOwnerRoute: "pages/mine/index",
  renderDetailOverlay: true
});

onShow(() => {
  uni.showShareMenu({
    menus: ["shareAppMessage", "shareTimeline"]
  });
});

onShareAppMessage(() => ({
  title: "露米绘画AI｜发现灵感，轻松创作",
  path: "/pages/home/index"
}));

onShareTimeline(() => ({
  title: "露米绘画AI｜发现灵感，轻松创作",
  query: ""
}));
</script>

<template>
  <GalleryPage page-mode="mine" :detail-owner-route="props.detailOwnerRoute" :render-detail-overlay="props.renderDetailOverlay" />
</template>
