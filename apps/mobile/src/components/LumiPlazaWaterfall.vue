<script setup lang="ts">
import type { HomeUser, HomeWork } from "../pages/home/homeData";

defineProps<{
  animationClass: string;
  leftWorks: HomeWork[];
  likedWorkIds: Set<number>;
  renderKey: number;
  rightWorks: HomeWork[];
  switching: boolean;
  displayLikeCount: (work: HomeWork) => number;
  getUser: (work: HomeWork) => HomeUser;
}>();

const emit = defineEmits<{
  openWork: [workId: number];
  openUser: [userId: number];
  toggleLike: [event: Event, workId: number];
  imageLoad: [workId: number, event: Event];
}>();
</script>

<template>
  <view :key="renderKey" class="waterfall" :class="[animationClass, { switching }]">
    <view class="waterfall-column">
      <view v-for="work in leftWorks" :key="work.id" class="work-card">
        <image class="work-img" :src="work.image" mode="widthFix" lazy-load @click="emit('openWork', work.id)" @load="emit('imageLoad', work.id, $event)" />
        <view class="work-body">
          <view class="work-title">{{ work.title }}</view>
          <view class="work-meta">
            <view class="author" @click.stop="emit('openUser', work.userId)">
              <view class="avatar" :style="{ background: getUser(work).color }">{{ getUser(work).avatar }}</view>
              <text class="author-name">{{ getUser(work).name }}</text>
            </view>
            <view class="like" :class="{ liked: likedWorkIds.has(work.id) }" @click.stop="emit('toggleLike', $event, work.id)">
              <LumiIcon :name="likedWorkIds.has(work.id) ? 'heart-filled' : 'heart'" :size="15" />
              <text>{{ displayLikeCount(work) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="waterfall-column">
      <view v-for="work in rightWorks" :key="work.id" class="work-card">
        <image class="work-img" :src="work.image" mode="widthFix" lazy-load @click="emit('openWork', work.id)" @load="emit('imageLoad', work.id, $event)" />
        <view class="work-body">
          <view class="work-title">{{ work.title }}</view>
          <view class="work-meta">
            <view class="author" @click.stop="emit('openUser', work.userId)">
              <view class="avatar" :style="{ background: getUser(work).color }">{{ getUser(work).avatar }}</view>
              <text class="author-name">{{ getUser(work).name }}</text>
            </view>
            <view class="like" :class="{ liked: likedWorkIds.has(work.id) }" @click.stop="emit('toggleLike', $event, work.id)">
              <LumiIcon :name="likedWorkIds.has(work.id) ? 'heart-filled' : 'heart'" :size="15" />
              <text>{{ displayLikeCount(work) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.waterfall {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 0 8px;
}

.waterfall.switching {
  opacity: 0;
}

.waterfall-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.work-card {
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(91, 159, 232, 0.05);
}

.work-img {
  display: block;
  width: 100%;
}

.work-body {
  padding: 8px 10px 6px;
}

.work-title {
  margin-bottom: 2px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-meta,
.author,
.like {
  display: flex;
  align-items: center;
}

.work-meta {
  gap: 6px;
}

.author {
  flex: 1;
  gap: 5px;
  min-width: 0;
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.author-name {
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.like {
  gap: 3px;
  align-items: center;
  padding: 2px 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
  border-radius: 8px;
  transition: color 0.25s ease, background 0.25s ease, transform 0.25s ease;
}

.like.liked {
  color: var(--rose);
  transform: scale(1.04);
}
</style>
