// 跨端 tabbar 切换动效：根据 tab 顺序方向给页面根节点返回进入动画类。
// 无 DOM 操作，H5 与微信小程序通用。模块级变量在同一 JS 运行时内跨页面保留，
// 用于记录上一个 tab，从而判断切换方向。

const TAB_ORDER: Record<string, number> = {
  "pages/home/index": 0,
  "pages/plaza/index": 1,
  "pages/gallery/index": 2,
  "pages/mine/index": 3
};

let lastTabIndex = -1;

// 在 tab 页面 setup 时调用，传入当前页面 route（不带前导斜杠）。
// 首次进入或方向未知返回空串（不播放动画）。
export function resolveTabEnterClass(route: string): string {
  const index = TAB_ORDER[route];
  if (index === undefined) return "";

  const prev = lastTabIndex;
  lastTabIndex = index;

  if (prev === -1 || prev === index) return "";
  return index > prev ? "tab-in-right" : "tab-in-left";
}
