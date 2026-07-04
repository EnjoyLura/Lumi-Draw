<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { homeUsers, homeWorks } from "../home/homeData";

const userId = ref(1);
const user = computed(() => homeUsers.find((item) => item.id === userId.value) || homeUsers[0]);
const works = computed(() => homeWorks.filter((work) => work.userId === user.value.id));
const likeCount = computed(() => works.value.reduce((sum, work) => sum + work.likes, 0));

onLoad((query) => {
  const id = Number(query?.id || 1);
  if (Number.isFinite(id) && id > 0) userId.value = id;
});
</script>

<template>
  <view class="user-profile-page">
    <view class="profile-head">
      <view class="avatar" :style="{ background: user.color }">{{ user.avatar }}</view>
      <view class="profile-main">
        <view class="name">{{ user.name }}</view>
        <view class="sub">{{ works.length }}作品 · {{ likeCount }}获赞</view>
      </view>
    </view>
    <view class="placeholder">用户主页将在后续任务完整迁移</view>
  </view>
</template>

<style scoped>
.user-profile-page {
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  padding: 16px;
  box-sizing: border-box;
  color: #0e1f3a;
  background: linear-gradient(175deg, #eef4fc 0%, #e1ebf8 100%);
}

.profile-head {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: #fff;
  border: 1px solid rgba(91, 159, 232, 0.14);
  border-radius: 10px;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.name {
  font-size: 17px;
  font-weight: 700;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  color: #8497b5;
}

.placeholder {
  margin-top: 14px;
  font-size: 13px;
  color: #8497b5;
}
</style>
