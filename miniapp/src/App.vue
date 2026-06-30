<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  // 启动时恢复深色模式状态
  // #ifdef H5
  const isDark = uni.getStorageSync('dark_mode');
  if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
  // #endif
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
page {
  background-color: #EEF4FC;
  min-height: 100vh;
  overflow-x: hidden;
}
body {
  margin: 0;
  padding: 0;
  background-color: #EEF4FC;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
  overflow-x: hidden;
}
uni-page-wrapper {
  background-color: #EEF4FC;
  min-height: 100vh;
  overflow-x: hidden;
}
uni-page-body {
  background-color: #EEF4FC;
  min-height: 100vh;
  overflow-x: hidden;
}

/* 所有页面根容器防止横向溢出 */
.sub-page,
.page-home,
.page-plaza,
.page-create,
.page-gallery,
.page-mine {
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
}

/* 所有 scroll-view 防止内容溢出 */
scroll-view,
.page-scroll,
.detail-scroll,
.gallery-scroll,
.content-scroll,
.create-scroll,
.recharge-scroll {
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
}

/* 全局 box-sizing 修复 */
*, *::before, *::after {
  box-sizing: border-box;
}

/* 页面转场动画 — 暂时禁用，后续再实现 */

/* 统一二级页面导航栏位置，与一级页面标题对齐 */
.sub-nav {
  height: 50px !important;
  padding-top: 0 !important;
  top: 24px !important;
}

/* ====== 深色模式 ====== */
[data-theme="dark"] page,
[data-theme="dark"] body,
[data-theme="dark"] uni-page-wrapper,
[data-theme="dark"] uni-page-body {
  background-color: #0A1428 !important;
}
[data-theme="dark"] .page-home,
[data-theme="dark"] .page-plaza,
[data-theme="dark"] .page-create,
[data-theme="dark"] .page-gallery,
[data-theme="dark"] .page-mine,
[data-theme="dark"] .sub-page {
  background: #0A1428 !important;
}
[data-theme="dark"] .glass-header {
  background: rgba(19,36,74,0.72) !important;
  border-bottom-color: rgba(123,184,240,0.16) !important;
}
[data-theme="dark"] .nav-title,
[data-theme="dark"] .sb-time,
[data-theme="dark"] .sb-icon,
[data-theme="dark"] .sb-battery,
[data-theme="dark"] .back-arrow {
  color: #EAF2FF !important;
}
[data-theme="dark"] .wf-card,
[data-theme="dark"] .menu-card,
[data-theme="dark"] .msg-card,
[data-theme="dark"] .draft-card,
[data-theme="dark"] .model-card,
[data-theme="dark"] .gp-card,
[data-theme="dark"] .prompt-box,
[data-theme="dark"] .input-card,
[data-theme="dark"] .textarea-card,
[data-theme="dark"] .calendar-card,
[data-theme="dark"] .code-card,
[data-theme="dark"] .invite-list,
[data-theme="dark"] .result-card {
  background: #13244A !important;
  border-color: rgba(123,184,240,0.16) !important;
}
[data-theme="dark"] .section-title,
[data-theme="dark"] .form-label,
[data-theme="dark"] .group-title,
[data-theme="dark"] .detail-title,
[data-theme="dark"] .user-name,
[data-theme="dark"] .wf-title,
[data-theme="dark"] .menu-text {
  color: #EAF2FF !important;
}

/* 通用 tab 下划线出场动画 */
@keyframes tabIndicatorIn {
  from { transform: scaleX(0); opacity: 0; }
  to { transform: scaleX(1); opacity: 1; }
}
.home-tab-indicator,
.tab-indicator,
.gallery-tab-indicator {
  animation: tabIndicatorIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: center;
}
</style>
