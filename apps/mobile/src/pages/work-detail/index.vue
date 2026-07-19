<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiWorkDetailContent from "../../components/LumiWorkDetailContent.vue";

const workId = ref<number | null>(null);
const refreshVersion = ref(0);

onLoad((query) => {
  const id = Number(query?.id || 0);
  workId.value = Number.isFinite(id) && id > 0 ? id : 1;
});

onShow(() => {
  refreshVersion.value += 1;
});
</script>

<template>
  <LumiWorkDetailContent
    v-if="workId"
    :initial-work-id="workId"
    :refresh-version="refreshVersion"
  />
</template>
