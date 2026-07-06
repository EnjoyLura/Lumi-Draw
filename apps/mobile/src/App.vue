<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { initAuth } from "./services/auth";
import { initDataMode } from "./services/dataMode";
import { initNavigationTitleSync } from "./services/navigationTitle";
import { initTheme } from "./services/theme";

onLaunch(() => {
  initDataMode();
  initAuth();
  initTheme();
  initNavigationTitleSync();
});
</script>

<template>
  <slot />
</template>

<style>
page {
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
  --gradient-sky: linear-gradient(180deg, #e1ebf8 0%, #f5f9fe 100%);
  --page-bg: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

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
  --gradient-sky: linear-gradient(180deg, #e1ebf8 0%, #f5f9fe 100%);
  --page-bg: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

uni-page-wrapper,
uni-page,
uni-page-body {
  overflow-x: hidden;
}

.page-enter {
  animation: pageEnter 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;
  backface-visibility: hidden;
  will-change: transform;
}

@keyframes pageEnter {
  from {
    transform: translate3d(42px, 0, 0);
  }

  to {
    transform: translate3d(0, 0, 0);
  }
}

.waterfall.wf-slide-left {
  animation: slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  backface-visibility: hidden;
  will-change: transform, opacity;
}

.waterfall.wf-slide-right {
  animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  backface-visibility: hidden;
  will-change: transform, opacity;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translate3d(-30px, 0, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translate3d(30px, 0, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.tab-item {
  transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-item:active {
  transform: scale(0.96);
}

.tab-item.active .tab-icon {
  animation: tabIconSettle 0.26s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes tabIconSettle {
  from {
    transform: translate3d(0, 2px, 0) scale(0.94);
  }

  to {
    transform: translate3d(0, 0, 0) scale(1);
  }
}

.theme-dark,
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
  --gradient-sky: linear-gradient(180deg, #1c1c1e 0%, #141416 100%);
  --page-bg: var(--bg-base);
}
</style>
