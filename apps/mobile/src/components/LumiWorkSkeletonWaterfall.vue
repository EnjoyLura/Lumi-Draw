<template>
  <view class="skeleton-waterfall" aria-label="正在加载作品">
    <view class="skeleton-loading-ring" />
    <view class="skeleton-column">
      <view class="skeleton-card portrait">
        <view class="skeleton-image" />
        <view class="skeleton-meta"><view class="skeleton-avatar" /><view class="skeleton-line short" /><view class="skeleton-line tiny" /></view>
      </view>
      <view class="skeleton-card square">
        <view class="skeleton-image" />
        <view class="skeleton-meta"><view class="skeleton-avatar" /><view class="skeleton-line medium" /></view>
      </view>
    </view>
    <view class="skeleton-column">
      <view class="skeleton-card square">
        <view class="skeleton-image" />
        <view class="skeleton-meta"><view class="skeleton-avatar" /><view class="skeleton-line medium" /><view class="skeleton-line tiny" /></view>
      </view>
      <view class="skeleton-card portrait">
        <view class="skeleton-image" />
        <view class="skeleton-meta"><view class="skeleton-avatar" /><view class="skeleton-line short" /></view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.skeleton-waterfall {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 2px 8px 12px;
}
.skeleton-loading-ring {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  border: 2px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: lumi-skeleton-spin .72s linear infinite;
}

.skeleton-column { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.skeleton-card { overflow: hidden; border-radius: 12px; background: var(--bg-card); }
.skeleton-card.portrait .skeleton-image { height: 244px; }
.skeleton-card.square .skeleton-image { height: 164px; }
.skeleton-image, .skeleton-avatar, .skeleton-line {
  background: linear-gradient(100deg, var(--bg-soft) 20%, var(--bg-card) 48%, var(--bg-soft) 76%);
  background-size: 240% 100%;
  animation: lumi-skeleton-shimmer 1.25s ease-in-out infinite;
}
.skeleton-meta { display: flex; gap: 6px; align-items: center; min-height: 33px; padding: 6px 8px; }
.skeleton-avatar { flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; }
.skeleton-line { height: 9px; border-radius: 999px; }
.skeleton-line.short { width: 46px; }
.skeleton-line.medium { width: 62px; }
.skeleton-line.tiny { width: 22px; margin-left: auto; }
@keyframes lumi-skeleton-shimmer { to { background-position: -140% 0; } }
@keyframes lumi-skeleton-spin { to { transform: rotate(360deg); } }
</style>
