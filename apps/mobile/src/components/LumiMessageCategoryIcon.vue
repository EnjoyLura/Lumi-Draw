<script setup lang="ts">
withDefaults(defineProps<{ type: string; size?: number }>(), { size: 22 });
</script>

<template>
  <LumiIcon v-if="type === 'like'" name="heart-filled" :size="size" />
  <LumiIcon v-else-if="type === 'favorite'" name="star-filled" :size="size" />
  <LumiIcon v-else-if="type === 'remake'" name="rotate-ccw" :size="size" />
  <LumiIcon v-else-if="type === 'follow'" name="user" :size="size" />
  <LumiIcon v-else-if="type === 'system'" name="bell" :size="size" />
  <LumiIcon v-else name="message-circle" :size="size" />
</template>
