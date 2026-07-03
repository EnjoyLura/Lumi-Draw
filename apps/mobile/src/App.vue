<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";

onLaunch(() => {
  console.log("Lumi Draw mobile started");
});
</script>

<template>
  <slot />
</template>
