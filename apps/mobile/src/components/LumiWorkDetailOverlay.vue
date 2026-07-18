<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useTheme } from "../services/theme";
import { useAuth } from "../services/auth";
import { useDataMode } from "../services/dataMode";
import { fetchWorkState, formatCompactNumber, formatRelativeTime, recordWorkView, toggleWorkFavorite, toggleWorkLike } from "../services/social";
import { fetchWorkDetail, type DetailAuthor } from "../pages/work-detail/workDetailService";
import type { DetailWork } from "../pages/work-detail/workDetailData";
import { imageSaveFailureMessage, saveImageToDevice } from "../services/imageSave";
import { openEmbeddedCreate } from "../services/primaryShell";
import { workDetailOverlay } from "../services/workDetailOverlay";

const { themeClass } = useTheme();
const { currentUser, isLoggedIn, requireLogin } = useAuth();
const { useMockData } = useDataMode();
const contentVisible = ref(false);
const refreshing = ref(false);
const liked = ref(false);
const favorited = ref(false);
const following = ref(false);
const highImage = ref("");
const work = ref<DetailWork | null>(null);
const user = ref<DetailAuthor | null>(null);

const isOpen = computed(() => workDetailOverlay.open.value && Boolean(work.value && user.value));
const isOwn = computed(() => Boolean(work.value && currentUser.value?.id === work.value.userId));
const displayedImage = computed(() => work.value?.image || "");
const authorSub = computed(() => {
  if (!user.value) return "";
  return `${formatCompactNumber(user.value.worksCount || 0)}作品 · ${formatCompactNumber(user.value.likesCount || 0)}获赞 · ${formatCompactNumber(user.value.followers || 0)}粉丝`;
});
const workTitle = computed(() => work.value?.title || work.value?.prompt?.slice(0, 20) || "作品详情");
const detailImageStyle = computed(() => {
  const [width, height] = (work.value?.ratio || "1:1").split(":").map(Number);
  if (!width || !height) return {};
  return { aspectRatio: `${width} / ${height}` };
});

function close() {
  contentVisible.value = false;
  setTimeout(() => workDetailOverlay.close(), 180);
}

function hydrate() {
  const seed = workDetailOverlay.seed.value;
  if (!seed) return;
  const item = seed.work;
  work.value = {
    ...item,
    previewImage: item.image,
    description: item.description || "",
    modelId: item.modelId || "",
    modelName: item.modelName || "AI 绘画",
    quality: item.quality || "",
    styleName: item.styleName || "默认",
    tags: item.tags || [],
    editTags: item.tags || [],
    favorites: item.favorites || 0,
    remakes: item.remakes || 0,
    time: formatRelativeTime(item.createdAt || "")
  };
  user.value = {
    ...seed.user,
    worksText: formatCompactNumber(seed.user.worksCount || 0),
    likesText: formatCompactNumber(seed.user.likesCount || 0),
    followersText: formatCompactNumber(seed.user.followers || 0),
    followersCount: seed.user.followers || 0
  };
  liked.value = Boolean(item.liked);
  favorited.value = Boolean(item.favorited);
  following.value = false;
  highImage.value = "";
}

/** Refresh mutable fields after the animation. Deliberately do not replace
 * image/previewImage: list and detail share one cached preview image. */
async function refreshSilently() {
  if (!work.value || useMockData.value) return;
  refreshing.value = true;
  try {
    const [detailResult, stateResult] = await Promise.allSettled([
      fetchWorkDetail(work.value.id),
      isLoggedIn.value ? fetchWorkState(work.value.id) : Promise.resolve(null)
    ]);
    if (detailResult.status === "fulfilled" && work.value?.id === detailResult.value.work.id) {
      const latest = detailResult.value.work;
      highImage.value = latest.image;
      work.value = { ...work.value, ...latest, image: work.value.image, previewImage: work.value.previewImage };
      user.value = detailResult.value.user;
    }
    if (stateResult.status === "fulfilled" && stateResult.value) {
      liked.value = stateResult.value.liked;
      favorited.value = stateResult.value.favorited;
      following.value = stateResult.value.following;
    }
    if (isLoggedIn.value && work.value?.published) void recordWorkView(work.value.id);
  } finally {
    refreshing.value = false;
  }
}

watch(
  () => workDetailOverlay.open.value,
  async (opened) => {
    if (!opened) return;
    hydrate();
    await nextTick();
    contentVisible.value = true;
    // Let the expand animation own the first frame; network work is then invisible.
    setTimeout(() => void refreshSilently(), 220);
  }
);

function ensureLogin() {
  return requireLogin(() => uni.showToast({ title: "请先登录后操作", icon: "none" }));
}

async function toggleLike() {
  if (!work.value || !ensureLogin() || useMockData.value) return;
  const result = await toggleWorkLike(work.value.id);
  liked.value = Boolean(result.liked);
  work.value.likes = result.likes;
}

async function toggleFavorite() {
  if (!work.value || !ensureLogin() || useMockData.value) return;
  const result = await toggleWorkFavorite(work.value.id);
  favorited.value = Boolean(result.favorited);
  work.value.favorites = result.favorites;
}

function previewHighImage() {
  if (!work.value) return;
  // The original/high-resolution address is only used when the user explicitly opens the viewer.
  uni.previewImage({ urls: [highImage.value || work.value.image], current: highImage.value || work.value.image });
}

async function downloadHighImage() {
  if (!work.value) return;
  try {
    await saveImageToDevice(highImage.value || work.value.image, `lumi-work-${work.value.id}.jpg`);
    uni.showToast({ title: "已保存到相册", icon: "none" });
  } catch (error) {
    uni.showToast({ title: imageSaveFailureMessage(error), icon: "none" });
  }
}

function remake() {
  if (!work.value) return;
  openEmbeddedCreate({ prompt: work.value.prompt, model: work.value.modelId || "", ratio: work.value.ratio, quality: work.value.quality || "", style: work.value.styleName || "" });
  close();
}
</script>

<template>
  <!-- Keep a native host in the tree. mp-weixin may not reliably attach a
       custom component whose first render has no root node. -->
  <view class="work-detail-overlay-host">
    <view v-if="work && user" class="work-detail-overlay" :class="[themeClass, { open: isOpen, visible: contentVisible }]" @touchmove.stop.prevent>
      <view class="detail-dim" @click="close" />
      <view class="detail-panel">
      <view class="detail-nav">
        <view class="nav-back" @click="close"><LumiIcon name="chevron-left" :size="25" /></view>
        <text>作品详情</text>
        <view class="nav-spacer" />
      </view>
      <scroll-view class="detail-scroll" scroll-y>
        <view class="detail-image-frame" :style="detailImageStyle" @click="previewHighImage">
          <image class="detail-image" :src="displayedImage" mode="widthFix" />
        </view>
        <view class="detail-body">
          <view class="author-row">
            <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
            <view class="author-copy"><text class="author-name">{{ user.name }}</text><text class="author-sub">{{ authorSub }}</text></view>
            <view v-if="!isOwn" class="follow-btn" :class="{ following }">{{ following ? '已关注' : '+ 关注' }}</view>
          </view>
          <view class="work-title">{{ workTitle }}</view>
          <view class="tag-row"><text class="tag accent">{{ work.modelName }}</text><text class="tag mint">{{ work.ratio }}</text><text class="tag lavender">{{ work.styleName }}</text></view>
          <view v-if="work.description" class="work-description">{{ work.description }}</view>
          <view class="prompt-card"><view class="prompt-label">提示词</view><view class="prompt-text">{{ work.prompt }}</view></view>
        </view>
      </scroll-view>
      <view class="detail-actions">
        <view v-if="!isOwn" class="action" :class="{ selected: liked }" @click="toggleLike"><LumiIcon :name="liked ? 'heart-filled' : 'heart'" :size="23" /><text>{{ work.likes }}</text></view>
        <view v-if="!isOwn" class="action" :class="{ selected: favorited }" @click="toggleFavorite"><LumiIcon :name="favorited ? 'star-filled' : 'star'" :size="23" /><text>{{ work.favorites }}</text></view>
        <view v-if="isOwn" class="action" @click="downloadHighImage"><LumiIcon name="download" :size="23" /><text>下载</text></view>
        <view class="remake-button" @click="remake"><LumiIcon name="rotate-ccw" :size="17" /><text>{{ isOwn ? '重新生成' : '一键同款' }}</text></view>
      </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.work-detail-overlay-host { display: block; width: 0; height: 0; }
.work-detail-overlay { position: fixed; inset: 0; z-index: 1000; pointer-events: none; overflow: hidden; }
.work-detail-overlay.open { pointer-events: auto; }
.detail-dim { position: absolute; inset: 0; opacity: 0; background: rgba(0,0,0,.46); transition: opacity .22s ease; }
.detail-panel { position: absolute; inset: 0 0 0 7%; display: flex; flex-direction: column; overflow: hidden; color: var(--fg-primary); background: var(--bg-base); border-radius: 28rpx 0 0 28rpx; box-shadow: -20rpx 0 56rpx rgba(0,0,0,.18); transform: translateX(104%) scale(.94); transform-origin: right center; opacity: .72; transition: transform .28s cubic-bezier(.18,.85,.2,1), opacity .18s ease; will-change: transform, opacity; }
.visible .detail-dim { opacity: 1; }
.visible .detail-panel { transform: translateX(0) scale(1); opacity: 1; }
.detail-nav { flex: 0 0 auto; height: calc(50px + var(--status-bar-height, 0px)); padding-top: var(--status-bar-height, 0px); display:flex; align-items:center; justify-content:center; font-size: 34rpx; font-weight: 700; background: var(--bg-base); }
.nav-back,.nav-spacer { position:absolute; top: var(--status-bar-height, 0px); width:50px; height:50px; display:flex; align-items:center; justify-content:center; }
.nav-back { left: 4px; }.nav-spacer { right: 4px; }
.detail-scroll { flex:1; min-height:0; }.detail-image-frame { overflow:hidden; background: var(--bg-soft); }.detail-image { display:block; width:100%; min-height: 360rpx; }
.detail-body { padding: 26rpx 28rpx calc(132rpx + env(safe-area-inset-bottom)); }.author-row { display:flex; align-items:center; gap:16rpx; }.avatar { width:58rpx; height:58rpx; display:flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; font-size:26rpx; font-weight:700; }.author-copy{min-width:0; flex:1; display:flex; flex-direction:column; gap:5rpx}.author-name{font-size:28rpx;font-weight:650}.author-sub{font-size:21rpx;color:var(--fg-muted)}.follow-btn{padding:12rpx 19rpx;border-radius:999px;background:var(--accent);color:#fff;font-size:22rpx}.follow-btn.following{background:var(--bg-soft);color:var(--fg-secondary)}
.work-title{margin-top:24rpx;font-size:38rpx;font-weight:750;line-height:1.28}.tag-row{display:flex;gap:12rpx;flex-wrap:wrap;margin-top:20rpx}.tag{padding:7rpx 14rpx;border-radius:999px;font-size:21rpx;background:var(--bg-soft)}.accent{color:var(--accent)}.mint{color:var(--mint)}.lavender{color:var(--lavender)}.work-description{margin-top:19rpx;color:var(--fg-secondary);font-size:25rpx;line-height:1.6}.prompt-card{margin-top:22rpx;padding:18rpx 20rpx;border-radius:18rpx;background:var(--bg-soft)}.prompt-label{font-size:23rpx;font-weight:650}.prompt-text{margin-top:10rpx;color:var(--fg-secondary);font-size:23rpx;line-height:1.55}
.detail-actions{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:18rpx;padding:16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));background:var(--bg-glass);border-top:1px solid var(--border)}.action{min-width:55rpx;display:flex;flex-direction:column;align-items:center;gap:3rpx;color:var(--fg-secondary);font-size:20rpx}.action.selected{color:var(--rose)}.remake-button{margin-left:auto;min-width:250rpx;height:76rpx;display:flex;align-items:center;justify-content:center;gap:10rpx;border-radius:38rpx;background:var(--gradient-dream);color:#fff;font-size:27rpx;font-weight:650}
</style>
