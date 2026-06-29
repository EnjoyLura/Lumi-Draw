/**
 * 带退出动画的返回
 * 给页面根元素添加退出动画类，动画结束后执行 navigateBack
 */
export function animateBack() {
  // #ifdef H5
  const pages = getCurrentPages();
  const curPage = pages[pages.length - 1] as any;
  const el = curPage?.$el || curPage?.$vm?.$el;
  if (el) {
    const subPage = el.querySelector('.sub-page') || el;
    subPage.style.animation = 'pageDrawerOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => {
      uni.navigateBack();
    }, 250);
    return;
  }
  // #endif
  uni.navigateBack();
}
