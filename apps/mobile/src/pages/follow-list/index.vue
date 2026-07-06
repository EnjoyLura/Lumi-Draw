<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { fetchFollowList, followUser, formatCompactNumber, unfollowUser, type BackendUserProfile } from "../../services/social";
import { isFollowing, profileUsers, setFollowing, type ProfileUser } from "../user-profile/userProfileData";

const PAGE_SIZE = 30;
const type = ref<"following" | "followers">("following");
const followTick = ref(0);
type FollowProfileUser = ProfileUser & { isFollowing?: boolean };
const realUsers = ref<FollowProfileUser[]>([]);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const pageState = reactive({ page: 1, hasMore: false });
const { useMockData } = useDataMode();
const { login: commitLogin, requireLogin } = useAuth();
const showLoginSheet = ref(false);
const loginRequired = ref(false);

const others = computed(() => profileUsers.filter((user) => user.id !== 1));
const list = computed(() => {
  followTick.value;
  if (!useMockData.value) return realUsers.value;
  if (type.value === "following") return others.value.filter((user) => isFollowing(user.id));
  return others.value;
});

onLoad((query) => {
  type.value = query?.type === "followers" ? "followers" : "following";
  uni.setNavigationBarTitle({ title: type.value === "following" ? "我的关注" : "我的粉丝" });
  void loadList();
});

function toProfileUser(user: BackendUserProfile): FollowProfileUser {
  return {
    id: user.id,
    name: user.nickname,
    avatar: user.avatarText || user.nickname.slice(0, 1) || "露",
    color: user.avatarColor || "var(--accent)",
    bio: user.bio || "用 AI 描绘心中的灵感。",
    works: user.worksCount,
    likes: formatCompactNumber(user.likesCount),
    followers: formatCompactNumber(user.followers),
    following: user.following,
    gender: user.gender === "male" ? "male" : "female",
    role: "AI 创作者",
    isFollowing: user.isFollowing
  };
}

async function loadList() {
  if (useMockData.value) {
    realUsers.value = [];
    pageState.page = 1;
    pageState.hasMore = false;
    loginRequired.value = false;
    return;
  }
  if (!ensureLogin()) {
    realUsers.value = [];
    pageState.page = 1;
    pageState.hasMore = false;
    loginRequired.value = true;
    return;
  }
  loginRequired.value = false;
  isLoading.value = true;
  try {
    const page = await fetchFollowList(type.value, 1, PAGE_SIZE);
    realUsers.value = page.items.map(toProfileUser);
    pageState.page = page.page;
    pageState.hasMore = page.hasMore;
  } catch {
    realUsers.value = [];
    pageState.page = 1;
    pageState.hasMore = false;
    uni.showToast({ title: "关注列表加载失败", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}

async function loadMoreList() {
  if (useMockData.value || isLoading.value || isLoadingMore.value || !pageState.hasMore) return;

  isLoadingMore.value = true;
  try {
    const page = await fetchFollowList(type.value, pageState.page + 1, PAGE_SIZE);
    realUsers.value = [...realUsers.value, ...page.items.map(toProfileUser)];
    pageState.page = page.page;
    pageState.hasMore = page.hasMore;
  } catch {
    uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
  } finally {
    isLoadingMore.value = false;
  }
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
    await loadList();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function rowFollowing(id: number) {
  followTick.value;
  if (!useMockData.value) return Boolean(realUsers.value.find((user) => user.id === id)?.isFollowing);
  return isFollowing(id);
}

function goProfile(id: number) {
  uni.navigateTo({ url: `/pages/user-profile/index?id=${id}` });
}

async function toggleFollow(id: number) {
  const next = !rowFollowing(id);
  if (!useMockData.value && !ensureLogin()) return;
  try {
    if (!useMockData.value) {
      if (next) await followUser(id);
      else await unfollowUser(id);
      if (!next && type.value === "following") {
        realUsers.value = realUsers.value.filter((user) => user.id !== id);
      } else {
        realUsers.value = realUsers.value.map((user) => (user.id === id ? { ...user, isFollowing: next } : user));
      }
    } else {
      setFollowing(id, next);
    }
  } catch {
    uni.showToast({ title: next ? "关注失败，请稍后重试" : "取消关注失败，请稍后重试", icon: "none" });
    return;
  }
  followTick.value += 1;
  uni.showToast({ title: next ? "关注成功" : "已取消关注", icon: "none" });
}

function goHome() {
  uni.reLaunch({ url: "/pages/home/index" });
}
</script>

<template>
  <view class="follow-page">
    <scroll-view class="page-scroll" scroll-y :lower-threshold="80" @scrolltolower="loadMoreList">
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        :title="type === 'following' ? '登录后查看我的关注' : '登录后查看我的粉丝'"
        subtitle="登录后即可同步关注关系和创作者动态。"
        @login="showLoginSheet = true"
      />

      <view v-else-if="isLoading" class="empty-state">
        <view class="empty-icon">♡</view>
        <view class="empty-title">正在加载</view>
      </view>

      <view v-else-if="list.length" class="follow-content">
        <view v-for="user in list" :key="user.id" class="follow-row">
          <view class="avatar" :style="{ background: user.color }" @click="goProfile(user.id)">{{ user.avatar }}</view>
          <view class="row-text" @click="goProfile(user.id)">
            <view class="row-name">{{ user.name }}</view>
            <view class="row-bio">{{ user.bio }}</view>
          </view>
          <button class="follow-btn" :class="{ following: rowFollowing(user.id) }" @click="toggleFollow(user.id)">
            {{ rowFollowing(user.id) ? "已关注" : "+ 关注" }}
          </button>
        </view>
        <view v-if="!useMockData" class="load-more-hint">
          {{ isLoadingMore ? "正在加载更多" : pageState.hasMore ? "继续下滑查看更多" : "没有更多了" }}
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">♡</view>
        <view class="empty-title">{{ type === "following" ? "暂无关注" : "暂无粉丝" }}</view>
        <view class="empty-sub">{{ type === "following" ? "去广场发现有趣的创作者吧" : "创作更多优秀作品来吸引粉丝" }}</view>
        <button v-if="type === 'following'" class="empty-btn" @click="goHome">✦ 去广场</button>
      </view>
    </scroll-view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.follow-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.follow-content {
  padding: 8px 16px 20px;
}

.follow-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 0.5px solid var(--border);
}

.follow-row:last-child {
  border-bottom: none;
}

.load-more-hint {
  padding: 12px 0 4px;
  font-size: 12px;
  color: var(--fg-muted);
  text-align: center;
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

.row-text {
  flex: 1;
  min-width: 0;
}

.row-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--fg-primary);
}

.row-bio {
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-btn {
  flex: 0 0 auto;
  min-height: 30px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border: none;
  border-radius: 999px;
}

.follow-btn::after {
  border: none;
}

.follow-btn.following {
  color: var(--fg-muted);
  background: var(--bg-soft);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 10px;
  font-size: 28px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 16px;
}

.empty-title {
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 700;
}

.empty-sub {
  font-size: 12px;
  color: var(--fg-muted);
}

.empty-btn {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  margin-top: 14px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border: none;
  border-radius: 999px;
}

.empty-btn::after {
  border: none;
}
</style>
