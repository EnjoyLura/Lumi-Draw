<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
</script>

<template>
  <view class="lumi-icon" :class="`lumi-icon-${name}`" :style="{ width: `${size}px`, height: `${size}px` }" />
</template>

<style scoped>
.lumi-icon {
  display: inline-block;
  flex: 0 0 auto;
  background-color: currentColor;
  -webkit-mask: var(--lumi-icon) center / contain no-repeat;
  mask: var(--lumi-icon) center / contain no-repeat;
}

.lumi-icon-house { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1z'/%3E%3C/svg%3E"); }
.lumi-icon-compass { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z'/%3E%3C/svg%3E"); }
.lumi-icon-sparkles { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m12 3-1.8 4.7L5.5 9.5l4.7 1.8L12 16l1.8-4.7 4.7-1.8-4.7-1.8zM19 16l-.8 2.2L16 19l2.2.8L19 22l.8-2.2L22 19l-2.2-.8zM5 2l.6 1.4L7 4l-1.4.6L5 6l-.6-1.4L3 4l1.4-.6z'/%3E%3C/svg%3E"); }
.lumi-icon-images { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-5-5L5 21M3 17l4-4 3 3'/%3E%3C/svg%3E"); }
.lumi-icon-circle-user-round { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3Cpath d='M6.2 18.3a7 7 0 0 1 11.6 0'/%3E%3C/svg%3E"); }
.lumi-icon-search { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E"); }
.lumi-icon-sliders-horizontal { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3'/%3E%3Ccircle cx='12' cy='4' r='2'/%3E%3Ccircle cx='10' cy='12' r='2'/%3E%3Ccircle cx='14' cy='20' r='2'/%3E%3C/svg%3E"); }
.lumi-icon-list-checks { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 5 2 2 4-4M3 12l2 2 4-4M3 19l2 2 4-4M13 6h8M13 13h8M13 20h8'/%3E%3C/svg%3E"); }
.lumi-icon-settings { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2.7l1.2 2.1 2.4.5 2-1.3 2.4 2.4-1.3 2 .5 2.4 2.1 1.2-1.2 3.3-2.4-.1-1.6 1.8.1 2.4-3.3 1.2-1.2-2.1-2.4-.5-2 1.3-2.4-2.4 1.3-2-.5-2.4L2.7 12l1.2-3.3 2.4.1L7.9 7l-.1-2.4 3.3-1.2z'/%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3C/svg%3E"); }
.lumi-icon-calendar-check { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 16l2 2 5-5'/%3E%3C/svg%3E"); }
.lumi-icon-gift { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='8' width='18' height='4' rx='1'/%3E%3Cpath d='M5 12v9h14v-9M12 8v13M12 8H7.5A2.5 2.5 0 1 1 10 5.5C10 8 12 8 12 8zM12 8h4.5A2.5 2.5 0 1 0 14 5.5C14 8 12 8 12 8z'/%3E%3C/svg%3E"); }
.lumi-icon-heart { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z'/%3E%3C/svg%3E"); }
.lumi-icon-star { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linejoin='round'%3E%3Cpath d='m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1z'/%3E%3C/svg%3E"); }
.lumi-icon-download { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3v12m0 0 5-5m-5 5-5-5M5 21h14'/%3E%3C/svg%3E"); }
.lumi-icon-share-2 { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='18' cy='5' r='3'/%3E%3Ccircle cx='6' cy='12' r='3'/%3E%3Ccircle cx='18' cy='19' r='3'/%3E%3Cpath d='m8.6 10.5 6.8-4M8.6 13.5l6.8 4'/%3E%3C/svg%3E"); }
.lumi-icon-trash-2 { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6'/%3E%3C/svg%3E"); }
.lumi-icon-menu { --lumi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M4 6h16M4 12h16M4 18h16'/%3E%3C/svg%3E"); }
</style>
