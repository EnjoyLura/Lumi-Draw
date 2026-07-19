<script setup lang="ts">
import GalleryPage from "../gallery/index.vue";

const props = withDefaults(defineProps<{ detailOwnerRoute?: string; renderDetailOverlay?: boolean }>(), {
  detailOwnerRoute: "pages/mine/index",
  renderDetailOverlay: true
});
</script>

<template>
  <GalleryPage page-mode="mine" :detail-owner-route="props.detailOwnerRoute" :render-detail-overlay="props.renderDetailOverlay" />
</template>
