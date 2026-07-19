<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { onLoad, onReady, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import {
  fetchWorkState,
  followUser,
  formatCompactNumber,
  formatRelativeTime,
  recordWorkView,
  toggleWorkFavorite,
  toggleWorkLike,
  unfollowUser
} from "../../services/social";
import { getWorkById, getWorkUser, type DetailWork } from "./workDetailData";
import { deleteWork, fetchWorkDetail, moveWorkToDraft, type DetailAuthor } from "./workDetailService";
import { useTheme } from "../../services/theme";
import { getNavigationMetrics } from "../../services/navigationMetrics";
import { imageSaveFailureMessage, saveImageToDevice } from "../../services/imageSave";
import { openEmbeddedCreate } from "../../services/primaryShell";
import { invalidateTabPages } from "../../services/tabPageCache";
import { consumeWorkDetailStale } from "../../services/workDetailRefresh";
import { getWorkDetailSnapshot } from "../../services/workDetailPreviewCache";

const props = withDefaults(defineProps<{
  embedded?: boolean;
  open?: boolean;
  initialWorkId?: number | null;
  sharedTransitioning?: boolean;
  contentVisible?: boolean;
}>(), {
  embedded: false,
  open: false,
  initialWorkId: null,
  sharedTransitioning: false,
  contentVisible: true
});

const emit = defineEmits<{ close: [] }>();
const { themeClass } = useTheme();
const bottomSafeArea = getNavigationMetrics().bottomSafeArea;

const workId = ref(1);
const { currentUser, isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();
const work = ref<DetailWork | undefined>();
type DetailUser = ReturnType<typeof getWorkUser> | DetailAuthor;

const user = ref<DetailUser | undefined>();
const liked = ref(false);
const favorited = ref(false);
const following = ref(false);
const confirmFollowOpen = ref(false);
const longPressOpen = ref(false);
const detailManageOpen = ref(false);
const showLoginSheet = ref(false);
const likePulse = ref(false);
const favoritePulse = ref(false);
const isDeleting = ref(false);
const isInitialContentReady = ref(props.embedded);
const isDetailLoading = ref(!props.embedded);
const isDetailPreviewReady = ref(false);
const highImage = ref("");

let longPressTimer: ReturnType<typeof setTimeout> | undefined;
let initialContentTimer: ReturnType<typeof setTimeout> | undefined;
let lastMode: boolean | null = null;

const isOwn = computed(() => {
  if (!work.value) return false;
  return useMockData.value ? work.value.userId === 1 : work.value.userId === currentUser.value?.id;
});
const isPendingReview = computed(() => work.value?.status === "pending");
const managePrimaryIcon = computed(() => (work.value?.published ? "pencil" : isPendingReview.value ? "clock-3" : "send"));
const managePrimaryText = computed(() => {
  if (work.value?.published) return "\u7f16\u8f91\u4fe1\u606f";
  if (isPendingReview.value) return "\u5ba1\u6838\u4e2d";
  return "\u53d1\u5e03\u4f5c\u54c1";
});
const likeCount = computed(() => (work.value?.likes || 0) + (useMockData.value && liked.value ? 1 : 0));
const favoriteCount = computed(() => (work.value?.favorites || 0) + (useMockData.value && favorited.value ? 1 : 0));
const authorSub = computed(() => {
  if (!user.value) return "";
  if ("worksText" in user.value) {
    return `${user.value.worksText}作品 · ${user.value.likesText}获赞 · ${user.value.followersText}粉丝`;
  }
  return isOwn.value ? "48作品 · 1.2k获赞" : "32作品 · 860获赞";
});
const detailImageStyle = computed(() => {
  if (!work.value) return {};
  const [width, height] = work.value.ratio.split(":").map(Number);
  if (!width || !height) return {};
  const ratioHeight = Math.round((height / width) * 750);
  const minHeight = width > height ? 640 : 0;
  return { height: `${Math.max(ratioHeight, minHeight)}rpx` };
});

// The embedded host has the work id before its first paint. Use the list
// snapshot in setup so opening never starts with a skeleton or empty state.
if (props.embedded && props.initialWorkId) {
  workId.value = props.initialWorkId;
  hydrateDetailSnapshot();
}

onLoad((query) => {
  if (props.embedded) return;
  workId.value = resolveRouteId(query);
  lastMode = useMockData.value;
  isInitialContentReady.value = true;
  void loadDetail();
});

onShow(() => {
  if (props.embedded) return;
  const nextId = resolveRouteId();
  if (nextId !== workId.value) {
    workId.value = nextId;
    lastMode = useMockData.value;
    void loadDetail();
    return;
  }
  if (lastMode !== useMockData.value) {
    lastMode = useMockData.value;
    void loadDetail();
    return;
  }
  if (consumeWorkDetailStale(workId.value)) void loadDetail();
});

onMounted(() => {
  if (props.embedded) {
    syncEmbeddedDetail();
    return;
  }
  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", handleHashChange);
});

onReady(() => {
  if (props.embedded) return;
  initialContentTimer = setTimeout(() => {
    isInitialContentReady.value = true;
    initialContentTimer = undefined;
  }, 16);
});

onUnmounted(() => {
  if (initialContentTimer) clearTimeout(initialContentTimer);
  if (typeof window === "undefined") return;
  window.removeEventListener("hashchange", handleHashChange);
});

function handleHashChange() {
  const nextId = resolveRouteId();
  if (nextId === workId.value) return;
  workId.value = nextId;
  lastMode = useMockData.value;
  void loadDetail();
}

function resolveRouteId(query?: Record<string, unknown>) {
  const queryId = Number(query?.id || 0);
  if (Number.isFinite(queryId) && queryId > 0) return queryId;

  if (typeof window !== "undefined") {
    const hashId = Number(window.location.hash.match(/[?&]id=([^&]+)/)?.[1] || 0);
    if (Number.isFinite(hashId) && hashId > 0) return hashId;
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  const pageId = Number(current?.options?.id || current?.$page?.options?.id || 0);
  return Number.isFinite(pageId) && pageId > 0 ? pageId : 1;
}

function loadMockDetail() {
  const item = getWorkById(workId.value);
  work.value = item;
  user.value = item ? getWorkUser(item) : undefined;
}

function hydrateDetailSnapshot() {
  const snapshot = getWorkDetailSnapshot(workId.value);
  if (!snapshot) return false;
  const item = snapshot.work;
  work.value = {
    ...item,
    previewImage: item.image,
    description: item.description || "",
    modelId: item.modelId || "",
    modelName: item.modelName || "AI 绘画",
    quality: item.quality || "",
    styleName: item.styleName || "默认",
    tags: item.tags || [],
    editTags: [],
    favorites: item.favorites || 0,
    remakes: item.remakes || 0,
    time: formatRelativeTime(item.createdAt || "")
  };
  user.value = {
    ...snapshot.user,
    worksText: formatCompactNumber(snapshot.user.worksCount || 0),
    likesText: formatCompactNumber(snapshot.user.likesCount || 0),
    followersText: formatCompactNumber(snapshot.user.followers || 0),
    followersCount: snapshot.user.followers || 0
  };
  // These interaction flags are fetched with the list metadata. Hydrate them
  // before the overlay's first frame so filled icons never visibly correct.
  liked.value = Boolean(item.liked);
  favorited.value = Boolean(item.favorited);
  return Boolean(item.isDetailPreloaded);
}

watch(
  () => props.open,
  (opened) => {
    if (props.embedded && opened) syncEmbeddedDetail();
  }
);

function syncEmbeddedDetail() {
  if (!props.embedded || !props.initialWorkId) return;
  const isSameWork = work.value?.id === props.initialWorkId && Boolean(user.value);
  if (!isSameWork) {
    workId.value = props.initialWorkId;
    resetTransientState();
    liked.value = false;
    favorited.value = false;
    following.value = false;
    highImage.value = "";
    hydrateDetailSnapshot();
  }
  isDetailPreviewReady.value = Boolean(work.value);
  isInitialContentReady.value = true;
  isDetailLoading.value = false;
  const hasSnapshot = Boolean(work.value && user.value);
  if (!hasSnapshot) {
    isDetailLoading.value = true;
    void loadDetail();
    return;
  }
  // The animation owns the first frame. Refresh fields afterwards without
  // assigning the high-resolution image to the rendered <image>.
  if (props.open) setTimeout(() => void refreshEmbeddedDetail(), 260);
}

async function refreshEmbeddedDetail() {
  if (!props.embedded || !props.open || !work.value) return;
  const id = work.value.id;
  try {
    const detailResult = await fetchWorkDetail(id);
    if (work.value?.id === id) {
      const latest = detailResult;
      // Static detail fields were populated while the card list was loading.
      // Do not replace them after open, or labels visibly pop into the page.
      work.value = { ...work.value, likes: latest.work.likes, favorites: latest.work.favorites, remakes: latest.work.remakes };
    }
    if (isLoggedIn.value && work.value?.published) void recordWorkView(id);
  } catch {
    // Cached content remains interactive when the background refresh fails.
  }
}

function resetTransientState() {
  cancelLongPress();
  confirmFollowOpen.value = false;
  longPressOpen.value = false;
  detailManageOpen.value = false;
  likePulse.value = false;
  favoritePulse.value = false;
}

async function loadDetail() {
  resetTransientState();
  liked.value = false;
  favorited.value = false;
  following.value = false;
  isDetailLoading.value = true;
  isDetailPreviewReady.value = true;
  const hasVisibleDetail = work.value?.id === workId.value && Boolean(user.value);
  const hasPreloadedDetail = !hasVisibleDetail && hydrateDetailSnapshot();
  if (!hasVisibleDetail && !work.value) {
    work.value = undefined;
    user.value = undefined;
  }

  try {
    if (useMockData.value) {
      loadMockDetail();
      return;
    }
    if (hasPreloadedDetail && work.value?.published) {
      if (!isLoggedIn.value) return;
      const [stateResult] = await Promise.allSettled([fetchWorkState(workId.value), recordWorkView(workId.value)]);
      if (stateResult.status === "fulfilled") {
        liked.value = stateResult.value.liked;
        favorited.value = stateResult.value.favorited;
        following.value = stateResult.value.following;
      }
      return;
    }
    const detail = await fetchWorkDetail(workId.value);
    work.value = detail.work;
    user.value = detail.user;
    if (!detail.work.published) return;
    if (!isLoggedIn.value) return;
    const [stateResult] = await Promise.allSettled([fetchWorkState(workId.value), recordWorkView(workId.value)]);
    if (stateResult.status === "fulfilled") {
      liked.value = stateResult.value.liked;
      favorited.value = stateResult.value.favorited;
      following.value = stateResult.value.following;
    }
  } catch {
    if (!work.value || !user.value) {
      work.value = undefined;
      user.value = undefined;
    }
    uni.showToast({ title: "作品详情加载失败", icon: "none" });
  } finally {
    isDetailLoading.value = false;
  }
}

function copyPrompt() {
  if (!work.value) return;
  uni.setClipboardData({ data: work.value.prompt });
}

function updateAuthorFollowers(followers: number) {
  if (!user.value || !("worksText" in user.value)) return;
  user.value = {
    ...user.value,
    followersCount: followers,
    followersText: formatCompactNumber(followers)
  };
}

function playPulse(target: "like" | "favorite") {
  if (target === "like") {
    likePulse.value = false;
    setTimeout(() => {
      likePulse.value = true;
    }, 0);
    setTimeout(() => {
      likePulse.value = false;
    }, 220);
    return;
  }

  favoritePulse.value = false;
  setTimeout(() => {
    favoritePulse.value = true;
  }, 0);
  setTimeout(() => {
    favoritePulse.value = false;
  }, 220);
}

function openLoginSheet() {
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
}

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    await loadDetail();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

async function toggleLike() {
  if (!work.value) return;
  if (useMockData.value) {
    liked.value = !liked.value;
    playPulse("like");
    return;
  }
  if (!ensureLogin()) return;
  try {
    const result = await toggleWorkLike(work.value.id);
    liked.value = Boolean(result.liked);
    work.value.likes = result.likes;
    playPulse("like");
  } catch {
    uni.showToast({ title: "点赞失败，请稍后重试", icon: "none" });
  }
}

async function toggleFavorite() {
  if (!work.value) return;
  if (useMockData.value) {
    favorited.value = !favorited.value;
    playPulse("favorite");
    return;
  }
  if (!ensureLogin()) return;
  try {
    const result = await toggleWorkFavorite(work.value.id);
    favorited.value = Boolean(result.favorited);
    work.value.favorites = result.favorites;
    playPulse("favorite");
  } catch {
    uni.showToast({ title: "收藏失败，请稍后重试", icon: "none" });
  }
}

async function toggleFollow() {
  if (!user.value) return;
  if (!following.value) {
    if (!useMockData.value && !ensureLogin()) return;
    try {
      if (!useMockData.value) {
        const result = await followUser(user.value.id);
        updateAuthorFollowers(result.followers);
      }
      following.value = true;
      uni.showToast({ title: "关注成功", icon: "none" });
    } catch {
      uni.showToast({ title: "关注失败，请稍后重试", icon: "none" });
    }
    return;
  }

  confirmFollowOpen.value = true;
}

async function cancelFollow() {
  if (!user.value) return;
  try {
    if (!useMockData.value) {
      const result = await unfollowUser(user.value.id);
      updateAuthorFollowers(result.followers);
    }
    following.value = false;
    confirmFollowOpen.value = false;
    uni.showToast({ title: "已取消关注", icon: "none" });
  } catch {
    uni.showToast({ title: "取消关注失败，请稍后重试", icon: "none" });
  }
}

function closeConfirmFollow() {
  confirmFollowOpen.value = false;
}

function goReport() {
  longPressOpen.value = false;
  uni.navigateTo({ url: `/pages/report/index?workId=${workId.value}` });
}

function goUserProfile() {
  if (!user.value) return;
  uni.navigateTo({ url: `/pages/user-profile/index?id=${user.value.id}` });
}

function previewWorkImage() {
  if (!work.value) return;
  void resolveHighImage().then((url) => uni.previewImage({ urls: [url], current: url }));
}

async function resolveHighImage() {
  if (!props.embedded || highImage.value || !work.value) return highImage.value || work.value?.image || "";
  const detail = await fetchWorkDetail(work.value.id);
  highImage.value = detail.work.image;
  return highImage.value;
}

function openLongPressSheet() {
  if (isOwn.value) return;
  longPressOpen.value = true;
}

function startLongPress() {
  if (isOwn.value) return;
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    longPressOpen.value = true;
  }, 600);
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = undefined;
  }
}

function closeLongPressSheet() {
  cancelLongPress();
  longPressOpen.value = false;
}

function getShareLink() {
  const path = `/pages/work-detail/index?id=${workId.value}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/#${path}`;
  }
  return path;
}

function shareWork() {
  longPressOpen.value = false;
  detailManageOpen.value = false;
  uni.setClipboardData({
    data: getShareLink(),
    success() {
      uni.showToast({ title: "作品链接已复制", icon: "none" });
    },
    fail() {
      uni.showToast({ title: "分享失败，请稍后重试", icon: "none" });
    }
  });
}

async function saveWorkImage() {
  if (!work.value) return;
  try {
    const imageUrl = await resolveHighImage();
    await saveImageToDevice(imageUrl, `lumi-work-${work.value.id}.jpg`);
    uni.showToast({ title: "已保存到相册", icon: "none" });
  } catch (error) {
    uni.showToast({ title: imageSaveFailureMessage(error), icon: "none" });
  }
}

async function remakeWork(current: DetailWork) {
  openEmbeddedCreate({
    prompt: current.prompt,
    model: current.modelId || "",
    ratio: current.ratio || "",
    quality: current.quality || "",
    style: current.styleName || ""
  });
  if (props.embedded) {
    emit("close");
    return;
  }
  if (getCurrentPages().length > 1) uni.navigateBack();
  else uni.reLaunch({ url: "/pages/home/index" });
}

function openDetailManage() {
  detailManageOpen.value = true;
}

function closeDetailManage() {
  detailManageOpen.value = false;
}

function editOrPublishWork() {
  closeDetailManage();
  if (!work.value) return;
  if (work.value.published) {
    uni.navigateTo({ url: `/pages/edit-work/index?id=${workId.value}` });
    return;
  }
  if (work.value.status === "pending") {
    uni.showToast({ title: "\u4f5c\u54c1\u6b63\u5728\u5ba1\u6838\u4e2d", icon: "none" });
    return;
  }
  uni.navigateTo({ url: `/pages/publish/index?draftId=${workId.value}` });
}

function confirmMoveToDraft() {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: "下架作品",
      content: "下架后作品将转入草稿箱，广场和详情分享中不再公开展示，确定继续吗？",
      confirmText: "下架",
      confirmColor: "#ff5c7a",
      success(result) {
        resolve(Boolean(result.confirm));
      },
      fail() {
        resolve(false);
      }
    });
  });
}

async function moveOwnWorkToDraft() {
  if (!work.value || !work.value.published || isDeleting.value) return;
  closeDetailManage();
  const confirmed = await confirmMoveToDraft();
  if (!confirmed) return;

  if (useMockData.value) {
    work.value.published = false;
    uni.showToast({ title: "作品已转入草稿箱", icon: "none" });
    return;
  }

  if (!ensureLogin()) return;
  isDeleting.value = true;
  try {
    await moveWorkToDraft(work.value.id);
    await loadDetail();
    uni.showToast({ title: "作品已转入草稿箱", icon: "none" });
  } catch {
    uni.showToast({ title: "下架失败，请稍后重试", icon: "none" });
  } finally {
    isDeleting.value = false;
  }
}

function confirmDeleteWork() {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: "删除作品",
      content: "删除后不可恢复，确定要删除这个作品吗？",
      confirmText: "删除",
      confirmColor: "#ff5c7a",
      success(result) {
        resolve(Boolean(result.confirm));
      },
      fail() {
        resolve(false);
      }
    });
  });
}

function leaveAfterDelete() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }
  uni.redirectTo({ url: "/pages/gallery/index" });
}

async function removeOwnWork() {
  if (!work.value || isDeleting.value) return;
  closeDetailManage();
  const confirmed = await confirmDeleteWork();
  if (!confirmed) return;

  if (useMockData.value) {
    uni.showToast({ title: "已删除作品", icon: "none" });
    leaveAfterDelete();
    return;
  }

  if (!ensureLogin()) return;
  isDeleting.value = true;
  try {
    await deleteWork(work.value.id);
    invalidateTabPages("gallery:");
    uni.showToast({ title: "已删除作品", icon: "none" });
    leaveAfterDelete();
  } catch {
    uni.showToast({ title: "删除失败，请稍后重试", icon: "none" });
  } finally {
    isDeleting.value = false;
  }
}

function showToast(title: string) {
  uni.showToast({ title, icon: "none" });
}

function handleDetailPreviewLoad() {
  isDetailPreviewReady.value = true;
}
</script>

<template>
  <view class="detail-page" :class="[themeClass, { embedded: props.embedded, 'detail-content-visible': props.contentVisible }]" :style="{ '--lumi-safe-bottom': `${bottomSafeArea}px` }">
    <LumiPageHeader title="作品详情" :embedded="props.embedded" @back="props.embedded ? emit('close') : undefined" />
    <view v-if="!isInitialContentReady" class="page-first-frame" aria-label="作品详情加载中">
      <view class="detail-first-image skeleton-shimmer" />
      <view class="detail-first-body">
        <view class="detail-first-author">
          <view class="detail-first-avatar skeleton-shimmer" />
          <view class="detail-first-author-copy">
            <view class="detail-first-line name skeleton-shimmer" />
            <view class="detail-first-line sub skeleton-shimmer" />
          </view>
          <view class="detail-first-follow skeleton-shimmer" />
        </view>
        <view class="detail-first-title skeleton-shimmer" />
        <view class="detail-first-tags">
          <view class="detail-first-tag skeleton-shimmer" />
          <view class="detail-first-tag short skeleton-shimmer" />
          <view class="detail-first-tag tiny skeleton-shimmer" />
        </view>
        <view class="detail-first-prompt skeleton-shimmer" />
      </view>
      <view class="detail-first-bottom">
        <view class="detail-first-action skeleton-shimmer" />
        <view class="detail-first-action skeleton-shimmer" />
        <view class="detail-first-remake skeleton-shimmer" />
      </view>
    </view>
    <template v-else-if="work && user">
      <scroll-view class="detail-scroll" scroll-y>
        <view class="detail-image-frame" :class="{ 'shared-transitioning': props.sharedTransitioning }" :style="detailImageStyle">
          <image
            class="detail-image detail-image-full"
            :class="{ ready: isDetailPreviewReady }"
            :src="work.previewImage || work.image"
            mode="aspectFill"
            @load="handleDetailPreviewLoad"
            @error="handleDetailPreviewLoad"
            @click="previewWorkImage"
            @longpress="openLongPressSheet"
            @mousedown="startLongPress"
            @mouseup="cancelLongPress"
            @mouseleave="cancelLongPress"
            @touchstart="startLongPress"
            @touchend="cancelLongPress"
          />
        </view>

        <view class="detail-body">
          <view class="author-row">
            <view class="author-main" @click="goUserProfile">
              <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
              <view class="author-text">
                <view class="author-name">{{ user.name }}</view>
                <view class="author-sub">{{ authorSub }}</view>
              </view>
            </view>
            <button v-if="isOwn" class="small-btn muted" @click="openDetailManage">
              <LumiIcon class="btn-icon" name="settings" :size="14" />
              <text>管理</text>
            </button>
            <button v-else class="small-btn" :class="following ? 'muted' : 'primary'" @click="toggleFollow">
              {{ following ? "已关注" : "+ 关注" }}
            </button>
          </view>

          <view class="title-row">
            <view class="work-title">{{ work.title }}</view>
            <view v-if="!isOwn" class="report-link" @click="goReport">举报</view>
          </view>
          <view v-if="work.published" class="work-desc">{{ work.description }}</view>

          <view class="tag-row">
            <text class="tag accent">{{ work.modelName }}</text>
            <text class="tag mint">{{ work.ratio }}</text>
            <text class="tag lavender">{{ work.styleName }}</text>
            <text v-for="tag in work.tags" :key="tag" class="tag peach">{{ tag }}</text>
          </view>

          <view class="prompt-card">
            <view class="prompt-head">
              <text>提示词</text>
              <button class="copy-btn" @click="copyPrompt">
                <LumiIcon class="copy-icon" name="copy" :size="14" />
                <text>复制</text>
              </button>
            </view>
            <view class="prompt-text">{{ work.prompt }}</view>
          </view>

          <view class="time-row">
            <text class="time-text">生成于 {{ work.time }}</text>
            <view class="ai-generated-note">
              <LumiIcon name="circle-alert" :size="13" />
              <text>图片内容由AI生成</text>
            </view>
          </view>

          <view v-if="work.published" class="stats-row">
            <view class="stat">
              <view class="stat-num rose">{{ likeCount }}</view>
              <view class="stat-label">点赞</view>
            </view>
            <view class="stat">
              <view class="stat-num accent">{{ favoriteCount }}</view>
              <view class="stat-label">收藏</view>
            </view>
            <view class="stat">
              <view class="stat-num lavender">{{ work.remakes }}</view>
              <view class="stat-label">同款</view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="detail-bottom" :class="{ own: isOwn }">
        <template v-if="isOwn">
          <view class="bottom-icon danger" :class="{ disabled: isDeleting }" @click="removeOwnWork">
            <LumiIcon name="trash-2" :size="24" />
            <text>{{ isDeleting ? "删除中" : "删除" }}</text>
          </view>
          <view class="bottom-icon" @click="saveWorkImage">
            <LumiIcon name="download" :size="24" />
            <text>下载</text>
          </view>
          <view class="remake-btn" role="button" aria-label="重新生成" hover-class="remake-btn-pressed" @click="remakeWork(work)">
            <LumiIcon class="remake-icon" name="rotate-ccw" :size="16" />
            <text>重新生成</text>
          </view>
        </template>
        <template v-else>
          <view class="bottom-action" :class="{ active: liked, pulse: likePulse }" @click="toggleLike">
            <LumiIcon :name="liked ? 'heart-filled' : 'heart'" :size="26" />
            <text>{{ likeCount }}</text>
          </view>
          <view class="bottom-action favorite" :class="{ active: favorited, pulse: favoritePulse }" @click="toggleFavorite">
            <LumiIcon :name="favorited ? 'star-filled' : 'star'" :size="26" />
            <text>{{ favoriteCount }}</text>
          </view>
          <view class="remake-btn" role="button" aria-label="一键同款" hover-class="remake-btn-pressed" @click="remakeWork(work)">
            <LumiIcon class="remake-icon" name="sparkles" :size="16" />
            <text>一键同款</text>
          </view>
        </template>
      </view>
      <view class="bottom-safe-area" />

      <view class="sheet-overlay" :class="{ show: longPressOpen }" @click="closeLongPressSheet" />
      <view class="long-press-sheet" :class="{ show: longPressOpen }">
        <view class="sheet-handle" />
        <view class="long-actions">
          <view class="long-action" @click="toggleLike(); closeLongPressSheet()">
            <view class="long-icon rose"><LumiIcon :name="liked ? 'heart-filled' : 'heart'" :size="24" /></view>
            <text>点赞</text>
          </view>
          <view class="long-action" @click="toggleFavorite(); closeLongPressSheet()">
            <view class="long-icon lemon"><LumiIcon :name="favorited ? 'star-filled' : 'star'" :size="24" /></view>
            <text>收藏</text>
          </view>
          <view class="long-action" @click="shareWork">
            <view class="long-icon accent"><LumiIcon name="share-2" :size="24" /></view>
            <text>分享</text>
          </view>
          <view class="long-action" @click="goReport">
            <view class="long-icon peach"><LumiIcon name="flag" :size="24" /></view>
            <text>举报</text>
          </view>
        </view>
      </view>

      <view class="confirm-overlay" :class="{ show: confirmFollowOpen }" @click="closeConfirmFollow" />
      <view class="confirm-dialog" :class="{ show: confirmFollowOpen }">
        <view class="confirm-icon"><LumiIcon name="user" :size="24" /></view>
        <view class="confirm-title">取消关注</view>
        <view class="confirm-msg">确定要取消关注该用户吗？</view>
        <view class="confirm-actions">
          <button class="confirm-cancel" @click="closeConfirmFollow">取消</button>
          <button class="confirm-ok" @click="cancelFollow">取消关注</button>
        </view>
      </view>

      <view class="sheet-overlay" :class="{ show: detailManageOpen }" @click="closeDetailManage" />
      <view class="detail-manage-sheet" :class="{ show: detailManageOpen }">
        <view class="sheet-handle" />
        <view class="manage-title">管理作品</view>
        <view class="manage-card">
          <view class="manage-row" @click="editOrPublishWork">
            <view class="manage-icon lavender"><LumiIcon :name="managePrimaryIcon" :size="18" /></view>
            <view class="manage-text">{{ managePrimaryText }}</view>
            <LumiIcon class="manage-arrow" name="chevron-right" :size="18" />
          </view>
          <view v-if="work.published" class="manage-row" @click="moveOwnWorkToDraft">
            <view class="manage-icon peach"><LumiIcon name="arrow-down" :size="18" /></view>
            <view class="manage-text">下架</view>
            <LumiIcon class="manage-arrow" name="chevron-right" :size="18" />
          </view>
          <view class="manage-row" @click="saveWorkImage(); closeDetailManage()">
            <view class="manage-icon accent"><LumiIcon name="download" :size="18" /></view>
            <view class="manage-text">保存图片</view>
            <LumiIcon class="manage-arrow" name="chevron-right" :size="18" />
          </view>
          <view class="manage-row" @click="shareWork">
            <view class="manage-icon mint"><LumiIcon name="share-2" :size="18" /></view>
            <view class="manage-text">分享作品</view>
            <LumiIcon class="manage-arrow" name="chevron-right" :size="18" />
          </view>
        </view>
        <view class="manage-card danger-card">
          <view class="manage-row" :class="{ disabled: isDeleting }" @click="removeOwnWork">
            <view class="manage-icon rose"><LumiIcon name="trash-2" :size="18" /></view>
            <view class="manage-text danger">{{ isDeleting ? "处理中" : "删除作品" }}</view>
            <LumiIcon class="manage-arrow" name="chevron-right" :size="18" />
          </view>
        </view>
      </view>
    </template>

    <view v-else-if="isDetailLoading" class="detail-loading-state">
      <view class="detail-loading-spinner" />
    </view>
    <view v-else class="empty-state">
      <view class="empty-icon"><LumiIcon name="images" :size="30" /></view>
      <view class="empty-title">作品不存在</view>
    </view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.detail-page {
  --lumi-detail-action-height: calc(72px + var(--lumi-safe-bottom, 0px));
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--bg-base);
}

.page-first-frame {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: var(--bg-base);
}

.skeleton-shimmer {
  background: linear-gradient(100deg, var(--bg-soft) 18%, var(--bg-card) 48%, var(--bg-soft) 78%);
  background-size: 240% 100%;
  animation: detail-skeleton-shimmer 1.15s ease-in-out infinite;
}

.detail-first-image {
  width: 100%;
  height: min(60vw, 460px);
  min-height: 260px;
}

.detail-first-body {
  padding: 16px;
}

.detail-first-author {
  display: flex;
  gap: 10px;
  align-items: center;
}

.detail-first-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.detail-first-author-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
}

.detail-first-line,
.detail-first-title,
.detail-first-tag,
.detail-first-prompt,
.detail-first-follow,
.detail-first-action,
.detail-first-remake {
  border-radius: 999px;
}

.detail-first-line.name { width: 84px; height: 14px; }
.detail-first-line.sub { width: 132px; height: 10px; }
.detail-first-follow { width: 64px; height: 30px; }
.detail-first-title { width: 58%; height: 20px; margin-top: 20px; }
.detail-first-tags { display: flex; gap: 6px; margin-top: 14px; }
.detail-first-tag { width: 72px; height: 24px; }
.detail-first-tag.short { width: 48px; }
.detail-first-tag.tiny { width: 56px; }
.detail-first-prompt { width: 100%; height: 78px; margin-top: 18px; border-radius: 10px; }

.detail-first-bottom {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 16px;
  align-items: center;
  height: 72px;
  padding: 14px 16px;
  box-sizing: border-box;
  background: var(--bg-base);
}

.detail-first-action { width: 44px; height: 36px; }
.detail-first-remake { flex: 1; height: 44px; }

@keyframes detail-skeleton-shimmer {
  to { background-position: -140% 0; }
}

.detail-scroll {
  position: absolute;
  inset: 0 0 var(--lumi-detail-action-height);
}

.detail-image-frame {
  position: relative;
  width: 100%;
  min-height: 260px;
  max-height: 560px;
  overflow: hidden;
  background: var(--bg-soft);
}

.detail-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-image-full {
  position: relative;
}

.detail-page.embedded .detail-image-frame.shared-transitioning .detail-image {
  opacity: 0;
}

.detail-page.embedded .detail-body,
.detail-page.embedded .detail-bottom,
.detail-page.embedded .bottom-safe-area {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 300ms ease, transform 340ms cubic-bezier(.16, 1, .3, 1);
}

.detail-page.embedded:not(.detail-content-visible) :deep(.lumi-page-header) {
  opacity: 0;
  transition: opacity 240ms ease;
}

.detail-page.embedded.detail-content-visible :deep(.lumi-page-header) { opacity: 1; }

.detail-page.embedded.detail-content-visible .detail-body,
.detail-page.embedded.detail-content-visible .detail-bottom,
.detail-page.embedded.detail-content-visible .bottom-safe-area {
  opacity: 1;
  transform: translateY(0);
}

.detail-body {
  padding: 16px;
}

.author-row,
.author-main {
  display: flex;
  gap: 10px;
  align-items: center;
}

.author-row {
  margin-bottom: 12px;
}

.author-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.author-text {
  min-width: 0;
}

.author-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
}

.small-btn {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  min-height: 30px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 999px;
  line-height: 1.2;
}

.small-btn::after,
.copy-btn::after {
  border: none;
}

.small-btn.primary {
  color: #fff;
  background: var(--accent);
}

.small-btn.muted {
  color: var(--fg-secondary);
  background: var(--bg-soft);
}

.btn-icon {
  font-size: 14px;
  line-height: 1;
}

.title-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.work-title {
  flex: 1;
  min-width: 0;
  font-size: 18px;
  font-weight: 700;
}

.report-link {
  font-size: 12px;
  color: var(--fg-muted);
}

.work-desc {
  margin-bottom: 14px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fg-secondary);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.tag {
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
}

.tag.accent {
  color: var(--accent);
  background: var(--accent-soft);
}

.tag.mint {
  color: var(--mint);
  background: var(--mint-soft);
}

.tag.lavender {
  color: #8470c7;
  background: var(--lavender-soft);
}

.tag.peach {
  color: #e07a5a;
  background: var(--peach-soft);
}

.prompt-card {
  padding: 12px;
  margin-bottom: 14px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.prompt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
}

.prompt-head > text:first-child {
  flex: 1;
  min-width: 0;
}

.copy-btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 24px;
  margin-left: auto;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--accent);
  background: transparent;
  border: none;
}

.copy-icon {
  font-size: 14px;
  line-height: 1;
}

.prompt-text {
  font-size: 13px;
  line-height: 1.6;
}

.time-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.time-text {
  font-size: 12px;
  color: var(--fg-muted);
}

.ai-generated-note {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
  font-size: 12px;
  color: var(--accent);
}

.stats-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 0.5px solid var(--border);
  border-bottom: 0.5px solid var(--border);
}

.stat {
  flex: 1;
  text-align: center;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
}

.stat-num.rose {
  color: var(--rose);
}

.stat-num.accent {
  color: var(--accent);
}

.stat-num.lavender {
  color: var(--lavender);
}

.stat-label {
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
}

.detail-bottom {
  position: absolute;
  right: 0;
  bottom: var(--lumi-safe-bottom, 0px);
  left: 0;
  z-index: 20;
  display: flex;
  gap: 16px;
  align-items: center;
  height: 72px;
  padding: 14px 16px;
  box-sizing: border-box;
  background: var(--bg-base);
  border-top: 0;
  box-shadow: none;
  backdrop-filter: none;
  overflow: hidden;
  contain: paint;
}

.bottom-safe-area {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  height: var(--lumi-safe-bottom, 0px);
  pointer-events: none;
  background: var(--bg-base);
  box-shadow: none;
}

.detail-bottom.own {
  gap: 10px;
}

.bottom-action,
.bottom-icon {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-muted);
  transition: color 0.3s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bottom-icon {
  flex-direction: column;
  gap: 2px;
  min-width: 44px;
  font-size: 11px;
}

.bottom-icon text:first-child {
  font-size: 24px;
}

.bottom-icon.danger {
  color: var(--rose);
}

.bottom-icon.disabled {
  pointer-events: none;
  opacity: 0.55;
}

.bottom-action text:first-child {
  font-size: 28px;
}

.bottom-action.active {
  color: var(--rose);
}

.bottom-action.favorite.active {
  color: #d8a600;
}

.bottom-action.pulse text:first-child {
  animation: icon-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.remake-btn {
  display: inline-flex;
  flex: 1;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 44px;
  min-height: 0;
  margin-left: auto;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 12px;
  box-shadow: none;
  contain: paint;
}

.remake-btn-pressed {
  opacity: 0.88;
}

.remake-icon {
  font-size: 16px;
  line-height: 1;
}

.sheet-overlay,
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  pointer-events: none;
  background: rgba(15, 31, 58, 0);
  opacity: 0;
  transition: opacity 0.25s ease, background 0.25s ease;
}

.sheet-overlay.show,
.confirm-overlay.show {
  pointer-events: auto;
  background: rgba(15, 31, 58, 0.38);
  opacity: 1;
}

.long-press-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 130;
  padding: 8px 16px calc(18px + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  visibility: hidden;
  box-shadow: none;
  transform: translateY(105%);
  transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 0.34s;
}

.long-press-sheet.show {
  visibility: visible;
  transform: translateY(0);
  transition-delay: 0s;
}

.detail-manage-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 135;
  padding: 8px 16px calc(18px + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  visibility: hidden;
  box-shadow: none;
  transform: translateY(105%);
  transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 0.34s;
}

.detail-manage-sheet.show {
  visibility: visible;
  transform: translateY(0);
  transition-delay: 0s;
}

.manage-title {
  margin: 8px 4px 14px;
  font-size: 16px;
  font-weight: 700;
}

.manage-card {
  overflow: hidden;
  margin-bottom: 12px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.manage-row {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 52px;
  padding: 0 14px;
  border-bottom: 0.5px solid var(--border);
}

.manage-row:last-child {
  border-bottom: none;
}

.manage-row.disabled {
  pointer-events: none;
  opacity: 0.55;
}

.manage-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 18px;
}

.manage-icon.lavender {
  color: var(--lavender);
}

.manage-icon.peach {
  color: #e07a5a;
}

.manage-icon.accent {
  color: var(--accent);
}

.manage-icon.mint {
  color: var(--mint);
}

.manage-icon.rose {
  color: var(--rose);
}

.manage-text {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
}

.manage-text.danger {
  color: var(--rose);
}

.manage-arrow {
  font-size: 18px;
  color: var(--fg-muted);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  margin: 0 auto 12px;
  background: var(--border);
  border-radius: 999px;
}

.long-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.long-action {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 12px 0;
  font-size: 12px;
  color: var(--fg-secondary);
}

.long-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 24px;
  border-radius: 50%;
}

.long-icon.rose {
  color: var(--rose);
  background: var(--rose-soft);
}

.long-icon.lemon {
  color: #d8a600;
  background: rgba(255, 222, 102, 0.18);
}

.long-icon.accent {
  color: var(--accent);
  background: var(--accent-soft);
}

.long-icon.peach {
  color: #e07a5a;
  background: var(--peach-soft);
}

.confirm-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 140;
  width: calc(100% - 64px);
  max-width: 300px;
  padding-top: 22px;
  overflow: hidden;
  pointer-events: none;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.16);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.confirm-dialog.show {
  pointer-events: auto;
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  font-size: 24px;
  color: #e07a5a;
  background: var(--peach-soft);
  border-radius: 50%;
}

.confirm-title {
  margin-bottom: 6px;
  font-size: 17px;
  font-weight: 700;
}

.confirm-msg {
  padding: 0 24px 18px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--fg-muted);
}

.confirm-actions {
  display: flex;
  border-top: 0.5px solid var(--border);
}

.confirm-cancel,
.confirm-ok {
  flex: 1;
  padding: 14px 0;
  font-size: 15px;
  font-weight: 600;
  background: transparent;
  border: none;
}

.confirm-cancel {
  color: var(--fg-secondary);
  border-right: 0.5px solid var(--border);
}

.confirm-ok {
  color: var(--rose);
}

.confirm-cancel::after,
.confirm-ok::after {
  border: none;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--fg-muted);
}

.detail-loading-state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.detail-loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: detail-loading-spin 0.72s linear infinite;
}

@keyframes detail-loading-spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  margin-bottom: 8px;
  font-size: 38px;
  color: var(--accent);
}

.empty-title {
  font-size: 15px;
  font-weight: 700;
}

@keyframes icon-pop {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.4);
  }

  100% {
    transform: scale(1);
  }
}

/* Lumi custom page header layout */
.detail-page {
  display: flex;
  flex-direction: column;
}

.detail-page > .detail-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
