<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { initTheme } from "./services/theme";

onLaunch(() => {
  initTheme();
  console.log("Lumi Draw mobile started");
});
</script>

<template>
  <slot />
</template>

<style>
:root {
  --bg-base: #eef4fc;
  --bg-soft: #e1ebf8;
  --bg-card: #ffffff;
  --bg-elevated: #fbfdff;
  --bg-glass: rgba(255, 255, 255, 0.72);
  --fg-primary: #0e1f3a;
  --fg-secondary: #445876;
  --fg-muted: #8497b5;
  --border: rgba(91, 159, 232, 0.14);
  --border-strong: rgba(91, 159, 232, 0.32);
  --card-border: rgba(91, 159, 232, 0.14);
  --accent: #5b9fe8;
  --accent-deep: #3b7fc8;
  --accent-soft: rgba(91, 159, 232, 0.12);
  --accent-glow: rgba(91, 159, 232, 0.28);
  --tab-active: #5b9fe8;
  --tab-active-fg: #ffffff;
  --mint: #6fd4b0;
  --mint-soft: rgba(111, 212, 176, 0.16);
  --peach: #ffb59a;
  --peach-soft: rgba(255, 181, 154, 0.2);
  --peach-deep: #e07a5a;
  --lavender: #b8a5e3;
  --lavender-soft: rgba(184, 165, 227, 0.2);
  --lemon: #ffe08a;
  --lemon-soft: rgba(255, 224, 138, 0.24);
  --rose: #ffa8b8;
  --rose-soft: rgba(255, 168, 184, 0.22);
  --gradient-dream: linear-gradient(135deg, #b8a5e3 0%, #5b9fe8 52%, #6fd4b0 100%);
  --gradient-aurora: linear-gradient(135deg, #a3e4cc 0%, #5b9fe8 52%, #b8a5e3 100%);
  --page-bg: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

uni-page-wrapper,
uni-page,
uni-page-body {
  overflow-x: hidden;
}

.page-anim-sub-in {
  animation: pageSubIn 0.36s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-anim-back {
  animation: pageBack 0.28s ease;
}

.page-anim-tab-right {
  animation: tabInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-anim-tab-left {
  animation: tabInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pageSubIn {
  from {
    opacity: 0.4;
    transform: translateX(100%);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pageBack {
  from {
    opacity: 0.6;
    transform: translateX(-6%);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes tabInRight {
  from {
    opacity: 0;
    transform: translateX(36px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes tabInLeft {
  from {
    opacity: 0;
    transform: translateX(-36px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

:root[data-theme="dark"] {
  --bg-base: #141416;
  --bg-soft: #2c2c2e;
  --bg-card: #262628;
  --bg-elevated: #1c1c1e;
  --bg-glass: rgba(20, 20, 20, 0.82);
  --fg-primary: #ffffff;
  --fg-secondary: #c7c7cc;
  --fg-muted: #8e8e93;
  --border: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.22);
  --card-border: transparent;
  --accent: #5b9fe8;
  --accent-deep: #3b7fc8;
  --accent-soft: rgba(91, 159, 232, 0.2);
  --accent-glow: rgba(91, 159, 232, 0.28);
  --tab-active: #fafafa;
  --tab-active-fg: #101010;
  --mint: #7bd4b5;
  --mint-soft: rgba(123, 212, 181, 0.22);
  --peach: #ffb59a;
  --peach-soft: rgba(255, 181, 154, 0.24);
  --lavender: #b8a5e3;
  --lavender-soft: rgba(184, 165, 227, 0.24);
  --lemon: #ffe08a;
  --lemon-soft: rgba(255, 224, 138, 0.26);
  --rose: #ffa8b8;
  --rose-soft: rgba(255, 168, 184, 0.26);
  --page-bg: var(--bg-base);
}
</style>
