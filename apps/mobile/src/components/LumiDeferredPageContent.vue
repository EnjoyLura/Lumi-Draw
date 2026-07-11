<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const ready = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  timer = setTimeout(() => {
    ready.value = true;
    timer = undefined;
  }, 16);
});

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <view class="deferred-content">
    <view v-if="!ready" class="first-frame" />
    <slot v-else />
  </view>
</template>

<style scoped>
.deferred-content,
.first-frame {
  height: 100%;
}

.first-frame {
  background: var(--page-bg);
}
</style>
