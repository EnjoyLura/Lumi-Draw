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
/* 主文本（标题、名称等） */
[data-theme="dark"] .section-title,
[data-theme="dark"] .form-label,
[data-theme="dark"] .group-title,
[data-theme="dark"] .detail-title,
[data-theme="dark"] .user-name,
[data-theme="dark"] .wf-title,
[data-theme="dark"] .menu-text,
[data-theme="dark"] .author-name,
[data-theme="dark"] .detail-desc,
[data-theme="dark"] .prompt-text,
[data-theme="dark"] .model-name,
[data-theme="dark"] .gp-placeholder-title,
[data-theme="dark"] .plan-name,
[data-theme="dark"] .stat-num,
[data-theme="dark"] .record-title,
[data-theme="dark"] .invite-name,
[data-theme="dark"] .user-signature,
[data-theme="dark"] .msg-title,
[data-theme="dark"] .hot-keyword,
[data-theme="dark"] .history-title,
[data-theme="dark"] .checkin-label,
[data-theme="dark"] .sheet-title,
[data-theme="dark"] .dialog-title,
[data-theme="dark"] .code-value,
[data-theme="dark"] .tier-price,
[data-theme="dark"] .balance-num,
[data-theme="dark"] .login-title,
[data-theme="dark"] .works-title {
  color: #EAF2FF !important;
}

/* 二级文本（描述、副标题等） */
[data-theme="dark"] .wf-author-name,
[data-theme="dark"] .model-desc,
[data-theme="dark"] .gp-placeholder-desc,
[data-theme="dark"] .user-bio,
[data-theme="dark"] .plan-desc,
[data-theme="dark"] .msg-preview,
[data-theme="dark"] .record-time,
[data-theme="dark"] .detail-time,
[data-theme="dark"] .author-sub,
[data-theme="dark"] .invite-time,
[data-theme="dark"] .form-count,
[data-theme="dark"] .form-hint,
[data-theme="dark"] .dialog-msg {
  color: #A8BBD6 !important;
}

/* 灰色文本（提示、占位） */
[data-theme="dark"] .more-text,
[data-theme="dark"] .home-tab,
[data-theme="dark"] .gallery-tab,
[data-theme="dark"] .manage-text,
[data-theme="dark"] .manage-icon,
[data-theme="dark"] .cost-label,
[data-theme="dark"] .cost-unit,
[data-theme="dark"] .ratio-name,
[data-theme="dark"] .prompt-label,
[data-theme="dark"] .prompt-count,
[data-theme="dark"] .menu-arrow,
[data-theme="dark"] .menu-value,
[data-theme="dark"] .msg-time,
[data-theme="dark"] .stat-label,
[data-theme="dark"] .user-id,
[data-theme="dark"] .gp-arrow,
[data-theme="dark"] .draft-arrow,
[data-theme="dark"] .clear-btn,
[data-theme="dark"] .tags-hint,
[data-theme="dark"] .load-text,
[data-theme="dark"] .result-placeholder-text {
  color: #6B7E9E !important;
}

/* 输入框 */
[data-theme="dark"] .form-input,
[data-theme="dark"] .form-textarea,
[data-theme="dark"] .prompt-input,
[data-theme="dark"] .search-input,
[data-theme="dark"] .amount-input {
  background: #1A2F58 !important;
  color: #EAF2FF !important;
  border-color: rgba(123,184,240,0.16) !important;
}

/* 底部操作栏 */
[data-theme="dark"] .create-bottom,
[data-theme="dark"] .bottom-bar,
[data-theme="dark"] .manage-bar {
  background: rgba(19,36,74,0.88) !important;
  border-top-color: rgba(123,184,240,0.16) !important;
}

/* 底部弹窗/抽屉 */
[data-theme="dark"] .bottom-sheet,
[data-theme="dark"] .bg-sheet,
[data-theme="dark"] .login-sheet,
[data-theme="dark"] .dialog-box {
  background: #13244A !important;
}

/* TabBar 胶囊 */
[data-theme="dark"] .capsule {
  background: rgba(255,255,255,0.08) !important;
  border-color: rgba(255,255,255,0.1) !important;
}
[data-theme="dark"] .cap-btn { color: #EAF2FF !important; }
[data-theme="dark"] .cap-divider { background: rgba(255,255,255,0.2) !important; }

/* 标签/芯片 */
[data-theme="dark"] .tag-chip,
[data-theme="dark"] .history-tag,
[data-theme="dark"] .detail-tag {
  border-color: rgba(123,184,240,0.2) !important;
  color: #A8BBD6 !important;
}

/* 比例/精度卡片 */
[data-theme="dark"] .ratio-card,
[data-theme="dark"] .tier-card,
[data-theme="dark"] .milestone-card,
[data-theme="dark"] .type-card,
[data-theme="dark"] .plan-card,
[data-theme="dark"] .benefit-card,
[data-theme="dark"] .style-card {
  background: #1A2F58 !important;
  border-color: rgba(123,184,240,0.16) !important;
}

/* 列表行 */
[data-theme="dark"] .menu-row:active,
[data-theme="dark"] .drawer-row:active,
[data-theme="dark"] .hot-item:active,
[data-theme="dark"] .user-item:active,
[data-theme="dark"] .history-item:active {
  background: rgba(123,184,240,0.08) !important;
}

/* 退出按钮 */
[data-theme="dark"] .logout-btn {
  background: #1A2F58 !important;
  border-color: rgba(123,184,240,0.16) !important;
}

/* 开关 */
[data-theme="dark"] .toggle-switch {
  background: #1A2F58 !important;
  border-color: rgba(123,184,240,0.16) !important;
}

/* 预览框/统计行 */
[data-theme="dark"] .stats-row,
[data-theme="dark"] .stats-follow-row {
  border-color: rgba(123,184,240,0.16) !important;
}

/* 画廊/我的头部 */
[data-theme="dark"] .gallery-header,
[data-theme="dark"] .profile-header,
[data-theme="dark"] .user-card {
  background: #0F1B33 !important;
}

/* 搜索栏 */
[data-theme="dark"] .search-input-wrap .search-icon { color: #6B7E9E !important; }

/* 左侧抽屉 */
[data-theme="dark"] .left-drawer {
  background: #13244A !important;
}
[data-theme="dark"] .drawer-header {
  background: linear-gradient(180deg, #0F1B33 0%, #13244A 100%) !important;
  border-bottom-color: rgba(123,184,240,0.16) !important;
}
[data-theme="dark"] .drawer-name,
[data-theme="dark"] .drawer-row-text { color: #EAF2FF !important; }

/* 性别标签 */
[data-theme="dark"] .gender-tag { opacity: 0.85; }

/* 生成loading文字 */
[data-theme="dark"] .gen-text { color: #6B7E9E !important; }
[data-theme="dark"] .gen-progress { background: #1A2F58 !important; }

/* 通用 tab 下划线滑动过渡（所有页面统一用 transition: left） */
</style>
