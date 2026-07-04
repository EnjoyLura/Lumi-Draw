<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { isFollowing, profileUsers, setFollowing } from "../user-profile/userProfileData";

const type = ref<"following" | "followers">("following");
const followTick = ref(0);

const others = computed(() => profileUsers.filter((user) => user.id !== 1));
const list = computed(() => {
  followTick.value;
  if (type.value === "following") return others.value.filter((user) => isFollowing(user.id));
  return others.value;
});

onLoad((query) => {
  type.value = query?.type === "followers" ? "followers" : "following";
  uni.setNavigationBarTitle({ title: type.value === "following" ? "我的关注" : "我的粉丝" });
});

function rowFollowing(id: number) {
  followTick.value;
  return isFollowing(id);
}

function goProfile(id: number) {
  uni.navigateTo({ url: `/pages/user-profile/index?id=${id}` });
}

function toggleFollow(id: number) {
  const next = !isFollowing(id);
  setFollowing(id, next);
  followTick.value += 1;
  uni.showToast({ title: next ? "关注成功" : "已取消关注", icon: "none" });
}

function goHome() {
  uni.reLaunch({ url: "/pages/home/index" });
}
</script>

<template>
  <view class="follow-page">
    <scroll-view class="page-scroll" scroll-y>
      <view v-if="list.length" class="follow-content">
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
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">♡</view>
        <view class="empty-title">{{ type === "following" ? "暂无关注" : "暂无粉丝" }}</view>
        <view class="empty-sub">{{ type === "following" ? "去广场发现有趣的创作者吧" : "创作更多优秀作品来吸引粉丝" }}</view>
        <button v-if="type === 'following'" class="empty-btn" @click="goHome">✦ 去广场</button>
      </view>
    </scroll-view>
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
