<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
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
</style>
