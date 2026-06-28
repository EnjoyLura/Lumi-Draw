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
}
body {
  margin: 0;
  padding: 0;
  background-color: #EEF4FC;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
}
uni-page-wrapper {
  background-color: #EEF4FC;
  min-height: 100vh;
}
uni-page-body {
  background-color: #EEF4FC;
  min-height: 100vh;
}
</style>
