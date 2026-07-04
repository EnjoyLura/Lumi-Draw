<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getWorkById, getWorkUser, type DetailWork } from "./workDetailData";

const workId = ref(1);
const liked = ref(false);
const favorited = ref(false);
const following = ref(false);
const confirmFollowOpen = ref(false);
const longPressOpen = ref(false);
const likePulse = ref(false);
const favoritePulse = ref(false);

let longPressTimer: ReturnType<typeof setTimeout> | undefined;

const work = computed(() => getWorkById(workId.value));
const user = computed(() => (work.value ? getWorkUser(work.value) : undefined));
const isOwn = computed(() => work.value?.userId === 1);
const likeCount = computed(() => (work.value?.likes || 0) + (liked.value ? 1 : 0));
const favoriteCount = computed(() => (work.value?.favorites || 0) + (favorited.value ? 1 : 0));
const detailImageStyle = computed(() => {
  if (!work.value) return {};
  const [width, height] = work.value.ratio.split(":").map(Number);
  if (!width || !height) return {};
  if (height > width) return { height: "400px" };
  return { height: `${Math.round((height / width) * 750)}rpx` };
});

onLoad((query) => {
  const id = Number(query?.id || 1);
  if (Number.isFinite(id) && id > 0) workId.value = id;
});

function copyPrompt() {
  if (!work.value) return;
  uni.setClipboardData({ data: work.value.prompt });
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

function toggleLike() {
  liked.value = !liked.value;
  playPulse("like");
}

function toggleFavorite() {
  favorited.value = !favorited.value;
  playPulse("favorite");
}

function toggleFollow() {
  if (!following.value) {
    following.value = true;
    uni.showToast({ title: "关注成功", icon: "none" });
    return;
  }

  confirmFollowOpen.value = true;
}

function cancelFollow() {
  following.value = false;
  confirmFollowOpen.value = false;
  uni.showToast({ title: "已取消关注", icon: "none" });
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

function shareWork() {
  longPressOpen.value = false;
  uni.showToast({ title: "分享", icon: "none" });
}

function remakeWork(current: DetailWork) {
  uni.navigateTo({
    url: `/pages/create/index?prompt=${encodeURIComponent(current.prompt)}`
  });
}

function manageWork() {
  if (!work.value) return;
  if (work.value.published) {
    uni.navigateTo({ url: `/pages/edit-work/index?id=${workId.value}` });
    return;
  }
  uni.navigateTo({ url: "/pages/publish/index" });
}

function showToast(title: string) {
  uni.showToast({ title, icon: "none" });
}
</script>

<template>
  <view class="detail-page">
    <template v-if="work && user">
      <scroll-view class="detail-scroll" scroll-y>
        <image
          class="detail-image"
          :src="work.image"
          mode="aspectFill"
          :style="detailImageStyle"
          @longpress="openLongPressSheet"
          @mousedown="startLongPress"
          @mouseup="cancelLongPress"
          @mouseleave="cancelLongPress"
          @touchstart="startLongPress"
          @touchend="cancelLongPress"
        />

        <view class="detail-body">
          <view class="author-row">
            <view class="author-main" @click="goUserProfile">
              <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
              <view class="author-text">
                <view class="author-name">{{ user.name }}</view>
                <view class="author-sub">{{ isOwn ? "48作品 · 1.2k获赞" : "32作品 · 860获赞" }}</view>
              </view>
            </view>
            <button v-if="isOwn" class="small-btn muted" @click="manageWork">
              <text class="btn-icon">⚙</text>
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
                <text class="copy-icon">⧉</text>
                <text>复制</text>
              </button>
            </view>
            <view class="prompt-text">{{ work.prompt }}</view>
          </view>

          <view class="time-text">生成于 {{ work.time }}</view>

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

      <view class="detail-bottom">
        <template v-if="isOwn">
          <view class="bottom-icon danger" @click="showToast('删除作品将在后续任务迁移')">
            <text>⌫</text>
            <text>删除</text>
          </view>
          <view class="bottom-icon" @click="showToast('已保存到相册')">
            <text>⇩</text>
            <text>下载</text>
          </view>
          <button class="remake-btn" @click="remakeWork(work)">
            <text class="remake-icon">↻</text>
            <text>重新生成</text>
          </button>
        </template>
        <template v-else>
          <view class="bottom-action" :class="{ active: liked, pulse: likePulse }" @click="toggleLike">
            <text>{{ liked ? "♥" : "♡" }}</text>
            <text>{{ likeCount }}</text>
          </view>
          <view class="bottom-action favorite" :class="{ active: favorited, pulse: favoritePulse }" @click="toggleFavorite">
            <text>{{ favorited ? "★" : "☆" }}</text>
            <text>{{ favoriteCount }}</text>
          </view>
          <button class="remake-btn" @click="remakeWork(work)">
            <text class="remake-icon">✦</text>
            <text>一键同款</text>
          </button>
        </template>
      </view>

      <view class="sheet-overlay" :class="{ show: longPressOpen }" @click="closeLongPressSheet" />
      <view class="long-press-sheet" :class="{ show: longPressOpen }">
        <view class="sheet-handle" />
        <view class="long-actions">
          <view class="long-action" @click="toggleLike(); closeLongPressSheet()">
            <view class="long-icon rose">♡</view>
            <text>点赞</text>
          </view>
          <view class="long-action" @click="toggleFavorite(); closeLongPressSheet()">
            <view class="long-icon lemon">☆</view>
            <text>收藏</text>
          </view>
          <view class="long-action" @click="shareWork">
            <view class="long-icon accent">⇪</view>
            <text>分享</text>
          </view>
          <view class="long-action" @click="goReport">
            <view class="long-icon peach">⚑</view>
            <text>举报</text>
          </view>
        </view>
      </view>

      <view class="confirm-overlay" :class="{ show: confirmFollowOpen }" @click="closeConfirmFollow" />
      <view class="confirm-dialog" :class="{ show: confirmFollowOpen }">
        <view class="confirm-icon">♙</view>
        <view class="confirm-title">取消关注</view>
        <view class="confirm-msg">确定要取消关注该用户吗？</view>
        <view class="confirm-actions">
          <button class="confirm-cancel" @click="closeConfirmFollow">取消</button>
          <button class="confirm-ok" @click="cancelFollow">取消关注</button>
        </view>
      </view>
    </template>

    <view v-else class="empty-state">
      <view class="empty-icon">▧</view>
      <view class="empty-title">作品不存在</view>
    </view>
  </view>
</template>

<style scoped>
.detail-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--bg-base);
}

.detail-scroll {
  position: absolute;
  inset: 0 0 76px;
}

.detail-image {
  display: block;
  width: 100%;
  min-height: 220px;
  max-height: 400px;
  object-fit: cover;
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
.copy-btn::after,
.remake-btn::after {
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
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
}

.copy-btn {
  display: inline-flex;
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

.time-text {
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--fg-muted);
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
  bottom: 0;
  left: 0;
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 14px 16px 20px;
  background: var(--bg-glass);
  border-top: 0.5px solid var(--border);
  box-shadow: 0 -4px 20px rgba(60, 120, 200, 0.06);
  backdrop-filter: blur(20px) saturate(180%);
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
  min-height: 44px;
  margin-left: auto;
  padding: 12px 0;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(91, 159, 232, 0.24);
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
  box-shadow: 0 -10px 30px rgba(60, 120, 200, 0.16);
  transform: translateY(105%);
  transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1);
}

.long-press-sheet.show {
  transform: translateY(0);
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
</style>
