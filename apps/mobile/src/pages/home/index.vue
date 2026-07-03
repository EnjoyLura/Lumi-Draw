<script setup lang="ts">
import { computed, ref } from "vue";
import { gameplays, homeBanners, homeUsers, homeWorks, type HomeWork } from "./homeData";

type HomeTab = "recommend" | "new";

const activeBanner = ref(0);
const activeHomeTab = ref<HomeTab>("recommend");
const likedWorkIds = ref<Set<number>>(new Set());

const displayedWorks = computed(() => {
  return activeHomeTab.value === "new" ? [...homeWorks].reverse() : homeWorks.slice(0, 8);
});

const leftColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 0));
const rightColumnWorks = computed(() => displayedWorks.value.filter((_, index) => index % 2 === 1));

function showTodo(label: string) {
  uni.showToast({
    title: `${label}将在后续任务迁移`,
    icon: "none"
  });
}

function selectGameplay(name: string) {
  uni.showToast({
    title: `已套用「${name}」模板`,
    icon: "none"
  });
}

function toggleLike(work: HomeWork) {
  const next = new Set(likedWorkIds.value);
  if (next.has(work.id)) {
    next.delete(work.id);
  } else {
    next.add(work.id);
  }
  likedWorkIds.value = next;
}

function getUser(userId: number) {
  return homeUsers.find((user) => user.id === userId) ?? homeUsers[0];
}

function getWorkTitle(work: HomeWork) {
  return work.title || work.prompt.slice(0, 20);
}

function getRatioClass(ratio: string) {
  if (ratio === "1:1") return "ratio-square";
  if (ratio === "4:3" || ratio === "16:9") return "ratio-wide";
  if (ratio === "9:16") return "ratio-portrait";
  return "ratio-tall";
}
</script>

<template>
  <view class="home-page">
    <view class="phone-screen">
      <view class="status-bar">
        <text>9:41</text>
        <view class="status-icons">
          <view class="signal-bars">
            <text />
            <text />
            <text />
            <text />
          </view>
          <text class="wifi-icon">⌁</text>
          <view class="battery"><text /></view>
        </view>
      </view>

      <view class="nav-header">
        <view class="notify-btn" @click="showTodo('消息')">
          <text class="symbol">◌</text>
          <text class="notify-dot" />
        </view>
        <text class="nav-title">露米绘画</text>
      </view>

      <view class="capsule">
        <view class="cap-btn" @click="showTodo('胶囊菜单')">•••</view>
        <view class="cap-divider" />
        <view class="cap-btn" @click="showTodo('关闭')">×</view>
      </view>

      <scroll-view class="content-area" scroll-y>
        <view class="home-content">
          <view class="banner-card">
            <swiper
              class="banner-swiper"
              circular
              autoplay
              :interval="4000"
              :current="activeBanner"
              @change="activeBanner = $event.detail.current"
            >
              <swiper-item v-for="banner in homeBanners" :key="banner.title">
                <view class="banner-slide" @click="showTodo(banner.title)">
                  <image class="banner-image" :src="banner.image" mode="aspectFill" />
                  <view class="banner-shade" />
                  <view class="banner-copy">
                    <text class="banner-title">{{ banner.title }}</text>
                    <text class="banner-desc">{{ banner.description }}</text>
                  </view>
                  <view class="banner-action">了解更多</view>
                </view>
              </swiper-item>
            </swiper>
            <view class="banner-dots">
              <text
                v-for="(_, index) in homeBanners"
                :key="index"
                class="banner-dot"
                :class="{ active: index === activeBanner }"
              />
            </view>
          </view>

          <view class="section-title">
            <text>热门玩法</text>
            <view class="more-link" @click="showTodo('全部玩法')">
              <text>全部</text>
              <text class="chevron">›</text>
            </view>
          </view>

          <scroll-view class="gameplay-scroll" scroll-x>
            <view class="gameplay-list">
              <view
                v-for="gameplay in gameplays"
                :key="gameplay.name"
                class="gameplay-card"
                @click="selectGameplay(gameplay.name)"
              >
                <image class="gameplay-img" :src="gameplay.image" mode="aspectFill" />
                <view class="gameplay-overlay" />
                <view v-if="gameplay.hot" class="hot-badge">HOT</view>
                <view class="gameplay-info">
                  <text class="gameplay-name">{{ gameplay.name }}</text>
                  <text class="gameplay-uses">♨ {{ gameplay.uses }}人用过</text>
                </view>
              </view>
            </view>
          </scroll-view>

          <view class="section-title works-title">
            <text>精选作品</text>
            <view class="home-tabs">
              <view
                class="home-tab"
                :class="{ active: activeHomeTab === 'recommend' }"
                @click="activeHomeTab = 'recommend'"
              >
                推荐
              </view>
              <view
                class="home-tab"
                :class="{ active: activeHomeTab === 'new' }"
                @click="activeHomeTab = 'new'"
              >
                最新
              </view>
              <view class="tab-indicator" :class="{ right: activeHomeTab === 'new' }" />
            </view>
          </view>

          <view class="waterfall">
            <view class="waterfall-col">
              <view v-for="work in leftColumnWorks" :key="work.id" class="work-card">
                <view class="work-media" :class="getRatioClass(work.ratio)" @click="showTodo('作品详情')">
                  <image class="work-image" :src="work.image" mode="aspectFill" />
                </view>
                <view class="work-body">
                  <text class="work-title">{{ getWorkTitle(work) }}</text>
                  <view class="work-meta">
                    <view class="author" @click.stop="showTodo('用户主页')">
                      <view class="avatar" :style="{ background: getUser(work.userId).color }">
                        {{ getUser(work.userId).avatar }}
                      </view>
                      <text class="author-name">{{ getUser(work.userId).name }}</text>
                    </view>
                    <view
                      class="like"
                      :class="{ liked: likedWorkIds.has(work.id) }"
                      @click.stop="toggleLike(work)"
                    >
                      <text>{{ likedWorkIds.has(work.id) ? "♥" : "♡" }}</text>
                      <text>{{ work.likes + (likedWorkIds.has(work.id) ? 1 : 0) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view class="waterfall-col">
              <view v-for="work in rightColumnWorks" :key="work.id" class="work-card">
                <view class="work-media" :class="getRatioClass(work.ratio)" @click="showTodo('作品详情')">
                  <image class="work-image" :src="work.image" mode="aspectFill" />
                </view>
                <view class="work-body">
                  <text class="work-title">{{ getWorkTitle(work) }}</text>
                  <view class="work-meta">
                    <view class="author" @click.stop="showTodo('用户主页')">
                      <view class="avatar" :style="{ background: getUser(work.userId).color }">
                        {{ getUser(work.userId).avatar }}
                      </view>
                      <text class="author-name">{{ getUser(work.userId).name }}</text>
                    </view>
                    <view
                      class="like"
                      :class="{ liked: likedWorkIds.has(work.id) }"
                      @click.stop="toggleLike(work)"
                    >
                      <text>{{ likedWorkIds.has(work.id) ? "♥" : "♡" }}</text>
                      <text>{{ work.likes + (likedWorkIds.has(work.id) ? 1 : 0) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="load-more-hint">继续往下滑获取更多作品</view>
        </view>
      </scroll-view>

      <view class="tab-bar">
        <view class="tab-item active" @click="showTodo('首页')">
          <text class="tab-icon">⌂</text>
          <text class="tab-label">首页</text>
        </view>
        <view class="tab-item" @click="showTodo('广场')">
          <text class="tab-icon">◇</text>
          <text class="tab-label">广场</text>
        </view>
        <view class="tab-item center" @click="showTodo('创作')">
          <text class="tab-icon">✦</text>
          <text class="tab-label">创作</text>
        </view>
        <view class="tab-item" @click="showTodo('画廊')">
          <text class="tab-icon">□</text>
          <text class="tab-label">画廊</text>
        </view>
        <view class="tab-item" @click="showTodo('我的')">
          <text class="tab-icon">☺</text>
          <text class="tab-label">我的</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-page {
  --bg-base: #eef4fc;
  --bg-soft: #e1ebf8;
  --bg-card: #ffffff;
  --bg-glass: rgba(255, 255, 255, 0.72);
  --fg-primary: #0e1f3a;
  --fg-secondary: #445876;
  --fg-muted: #8497b5;
  --border: rgba(91, 159, 232, 0.14);
  --border-strong: rgba(91, 159, 232, 0.32);
  --accent: #5b9fe8;
  --accent-deep: #3b7fc8;
  --accent-soft: rgba(91, 159, 232, 0.12);
  --tab-active: #5b9fe8;
  --mint: #6fd4b0;
  --peach: #ffb59a;
  --lavender: #b8a5e3;
  --lemon: #ffe08a;
  --rose: #ffa8b8;
  --shadow-lg: 0 24px 56px rgba(60, 120, 200, 0.16), 0 8px 16px rgba(60, 120, 200, 0.08);
  min-height: 100vh;
  background: #e2eaf4;
  color: var(--fg-primary);
}

.phone-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  min-height: 0;
  max-height: 100vh;
  overflow: hidden;
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.phone-screen::after {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: "";
  background:
    radial-gradient(ellipse 120% 40% at 80% 0%, rgba(91, 159, 232, 0.06), transparent 60%),
    radial-gradient(ellipse 100% 30% at 10% 100%, rgba(111, 212, 176, 0.04), transparent 50%);
}

.status-bar {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 600;
}

.status-icons {
  display: flex;
  gap: 5px;
  align-items: center;
}

.signal-bars {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 11px;
}

.signal-bars text {
  display: block;
  width: 2px;
  background: var(--fg-primary);
}

.signal-bars text:nth-child(1) {
  height: 4px;
}

.signal-bars text:nth-child(2) {
  height: 6px;
}

.signal-bars text:nth-child(3) {
  height: 8px;
}

.signal-bars text:nth-child(4) {
  height: 10px;
}

.wifi-icon {
  font-size: 14px;
  line-height: 1;
}

.battery {
  position: relative;
  width: 24px;
  height: 11px;
  border: 1px solid rgba(14, 31, 58, 0.4);
  border-radius: 3px;
}

.battery::after {
  position: absolute;
  top: 3px;
  right: -3px;
  width: 2px;
  height: 3px;
  content: "";
  background: rgba(14, 31, 58, 0.4);
  border-radius: 1px;
}

.battery text {
  display: block;
  width: 16px;
  height: 5px;
  margin: 2px;
  background: var(--fg-primary);
  border-radius: 1px;
}

.nav-header {
  position: absolute;
  top: 24px;
  right: 0;
  left: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  background: var(--bg-base);
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
}

.notify-btn {
  position: absolute;
  left: 12px;
  padding: 6px;
}

.symbol {
  font-size: 20px;
  line-height: 1;
}

.notify-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  background: var(--rose);
  border: 1.5px solid var(--bg-base);
  border-radius: 50%;
}

.capsule {
  position: absolute;
  top: 28px;
  right: 7px;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 87px;
  height: 32px;
  background: rgba(0, 0, 0, 0.06);
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(8px);
}

.cap-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 43.5px;
  height: 32px;
  font-size: 16px;
  font-weight: 700;
}

.cap-divider {
  width: 0.5px;
  height: 16px;
  background: rgba(0, 0, 0, 0.15);
}

.content-area {
  position: absolute;
  top: 74px;
  right: 0;
  bottom: 80px;
  left: 0;
  z-index: 1;
  height: auto;
  box-sizing: border-box;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.content-area::-webkit-scrollbar,
.gameplay-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.content-area :deep(.uni-scroll-view),
.gameplay-scroll :deep(.uni-scroll-view) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.content-area :deep(.uni-scroll-view::-webkit-scrollbar),
.gameplay-scroll :deep(.uni-scroll-view::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

.home-content {
  padding: 4px 0 20px;
}

.banner-card {
  position: relative;
  height: 150px;
  margin: 0 12px 16px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.banner-swiper,
.banner-slide,
.banner-image {
  width: 100%;
  height: 150px;
}

.banner-slide {
  position: relative;
  overflow: hidden;
}

.banner-shade {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 88px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

.banner-copy {
  position: absolute;
  bottom: 20px;
  left: 16px;
  display: flex;
  flex-direction: column;
  max-width: 220px;
  color: #fff;
}

.banner-title {
  margin-bottom: 3px;
  font-size: 15px;
  font-weight: 700;
}

.banner-desc {
  font-size: 11px;
  line-height: 1.4;
  opacity: 0.86;
}

.banner-action {
  position: absolute;
  top: 50%;
  right: 16px;
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-50%);
  backdrop-filter: blur(12px) saturate(180%);
}

.banner-dots {
  position: absolute;
  right: 0;
  bottom: 8px;
  left: 0;
  display: flex;
  gap: 6px;
  justify-content: center;
}

.banner-dot {
  width: 6px;
  height: 6px;
  background: var(--accent-soft);
  border-radius: 50%;
  transition: all 0.3s;
}

.banner-dot.active {
  width: 20px;
  background: var(--accent);
  border-radius: 999px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 700;
}

.more-link {
  display: flex;
  gap: 2px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.chevron {
  font-size: 20px;
  line-height: 1;
}

.gameplay-scroll {
  width: 100%;
  margin-bottom: 18px;
  white-space: nowrap;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.gameplay-list {
  display: flex;
  gap: 8px;
  padding: 0 16px;
}

.gameplay-card {
  position: relative;
  flex: 0 0 auto;
  width: 90px;
  height: 120px;
  overflow: hidden;
  border-radius: 7px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.gameplay-img {
  width: 90px;
  height: 120px;
}

.gameplay-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.1) 50%, transparent);
}

.hot-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(238, 90, 36, 0.35);
}

.gameplay-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.gameplay-name {
  margin-bottom: 2px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.gameplay-uses {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
}

.works-title {
  padding: 0 12px;
}

.home-tabs {
  position: relative;
  display: flex;
  gap: 16px;
  padding-bottom: 4px;
}

.home-tab {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg-muted);
}

.home-tab.active {
  font-weight: 700;
  color: var(--tab-active);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 4px;
  width: 20px;
  height: 3px;
  background: var(--tab-active);
  border-radius: 999px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-indicator.right {
  transform: translateX(42px);
}

.waterfall {
  display: flex;
  gap: 6px;
  padding: 0 8px;
}

.waterfall-col {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.work-card {
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.work-media {
  width: 100%;
  overflow: hidden;
  background: var(--bg-soft);
}

.ratio-square {
  height: 172px;
}

.ratio-wide {
  height: 128px;
}

.ratio-tall {
  height: 224px;
}

.ratio-portrait {
  height: 260px;
}

.work-image {
  width: 100%;
  height: 100%;
}

.work-body {
  padding: 8px 10px 6px;
}

.work-title {
  display: block;
  margin-bottom: 4px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}

.author {
  display: flex;
  flex: 1;
  gap: 5px;
  align-items: center;
  min-width: 0;
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  overflow: hidden;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.author-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.like {
  display: flex;
  flex-shrink: 0;
  gap: 3px;
  align-items: center;
  padding: 2px 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
}

.like.liked {
  color: var(--rose);
}

.load-more-hint {
  padding: 18px 0 10px;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: center;
}

.tab-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 80;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-around;
  height: 80px;
  padding-bottom: 16px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.6);
  border-top: 0.5px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 -2px 20px rgba(60, 120, 200, 0.06);
  backdrop-filter: blur(24px) saturate(180%);
}

.tab-item {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 4px 8px;
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 22px;
  color: var(--fg-muted);
}

.tab-label {
  font-size: 10px;
  color: var(--fg-muted);
}

.tab-item.active .tab-icon,
.tab-item.active .tab-label {
  color: var(--tab-active);
}

.tab-item.center {
  margin-top: -10px;
}

.tab-item.center .tab-icon {
  width: 40px;
  height: 40px;
  font-size: 24px;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3 0%, #5b9fe8 50%, #6fd4b0 100%);
  border-radius: 50%;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.12),
    inset 0 2px 4px rgba(255, 255, 255, 0.6),
    inset 0 -2px 4px rgba(0, 0, 0, 0.08);
}

.tab-item.center .tab-label {
  margin-top: 2px;
}

@media (min-width: 520px) {
  .home-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
    box-sizing: border-box;
  }

  .phone-screen {
    width: 380px;
    height: 815px;
    min-height: 0;
    max-height: 815px;
    border-radius: 40px;
    box-shadow:
      -8px -8px 24px rgba(255, 255, 255, 0.6),
      8px 8px 30px rgba(0, 0, 0, 0.15),
      0 20px 50px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .content-area {
    height: auto;
  }
}
</style>
