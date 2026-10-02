<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from "vue";
import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { toCssAspectRatio } from "../services/aspectRatio";
import { resolveWorkDetailSourceRect, type WorkDetailSourceRect } from "../services/workDetailNavigation";

const componentInstance = getCurrentInstance();
const sourceContext = componentInstance?.proxy;

const props = defineProps<{
  animationClass: string;
  works: HomeWork[];
  likedWorkIds: Set<number>;
  renderKey: number;
  scrollTopValue?: number;
  switching: boolean;
  displayLikeCount: (work: HomeWork) => number;
  getUser: (work: HomeWork) => HomeUser;
}>();

const emit = defineEmits<{
  openWork: [work: HomeWork, sourceRect: WorkDetailSourceRect | null];
  openUser: [userId: number];
  toggleLike: [event: Event, workId: number];
  imageLoad: [workId: number, event: Event];
}>();

// ---------- 窗口化渲染：节点数恒定，深滚动不再变卡 ----------
// 列分配基于 works 全量贪心（与旧父级实现同公式），裁剪/回填只移动窗口边界，
// 列归属保持稳定，卡片不会跳列。裁剪前实测卡片高度入栈，回填时等高还原，
// 滚动位置不跳动。
const TRIM_BATCH = 10;
const KEEP_NODES = 40;
const RESTORE_LEAD_VIEWPORTS = 0.6;

const viewportHeight = uni.getSystemInfoSync().windowHeight || 667;
const trimStart = ref(0);
const isTrimming = ref(false);
const trimmedPages = ref<Array<{ count: number; left: number; right: number }>>([]);

const assignedFlat = computed(() => {
  const out: Array<{ work: HomeWork; col: 0 | 1; indexInCol: number }> = [];
  const heights = [0, 0];
  const counts = [0, 0];
  props.works.forEach((work) => {
    const [width, height] = work.ratio.split(":").map(Number);
    const estimatedHeight = width && height ? height / width + 0.34 : 1.34;
    const col: 0 | 1 = heights[0] <= heights[1] ? 0 : 1;
    out.push({ work, col, indexInCol: counts[col] });
    counts[col] += 1;
    heights[col] += estimatedHeight;
  });
  return out;
});

const renderedItems = computed(() => assignedFlat.value.slice(trimStart.value));
const leftWorks = computed(() => renderedItems.value.filter((item) => item.col === 0).map((item) => item.work));
const rightWorks = computed(() => renderedItems.value.filter((item) => item.col === 1).map((item) => item.work));
const colSpacers = computed<[number, number]>(() => {
  let left = 0;
  let right = 0;
  trimmedPages.value.forEach((page) => {
    left += page.left;
    right += page.right;
  });
  return [left, right];
});

function measureHeights(ids: string[]): Promise<number[]> {
  return new Promise((resolve) => {
    const query = uni.createSelectorQuery().in(sourceContext);
    ids.forEach((id) => query.select(id).boundingClientRect());
    query.exec((res) => {
      const heights = (res || []).map((rect: unknown) => Number((rect as { height?: number } | null)?.height || 0));
      resolve(heights);
    });
  });
}

async function maybeTrim() {
  if (isTrimming.value) return;
  if (props.works.length - trimStart.value <= KEEP_NODES + TRIM_BATCH) return;
  isTrimming.value = true;
  try {
    while (props.works.length - trimStart.value > KEEP_NODES + TRIM_BATCH) {
      const batch = assignedFlat.value.slice(trimStart.value, trimStart.value + TRIM_BATCH);
      if (batch.length < TRIM_BATCH) break;
      const heights = await measureHeights(batch.map((item) => `#lumi-work-card-${item.work.id}`));
      if (heights.length !== batch.length || heights.some((h) => h <= 0)) break;
      let left = 0;
      let right = 0;
      batch.forEach((item, index) => {
        if (item.col === 0) left += heights[index];
        else right += heights[index];
      });
      trimmedPages.value = [...trimmedPages.value, { count: batch.length, left, right }];
      trimStart.value += batch.length;
    }
  } finally {
    isTrimming.value = false;
  }
}

function restoreTrimmed() {
  const page = trimmedPages.value[trimmedPages.value.length - 1];
  if (!page) return;
  trimmedPages.value = trimmedPages.value.slice(0, -1);
  trimStart.value = Math.max(0, trimStart.value - page.count);
}

watch(
  () => props.works.length,
  () => {
    void maybeTrim();
  },
  { immediate: true }
);

watch(
  () => props.scrollTopValue,
  (top) => {
    if (!top || !trimmedPages.value.length) return;
    const seamDepth = Math.max(colSpacers.value[0], colSpacers.value[1]);
    if (top < seamDepth - viewportHeight * RESTORE_LEAD_VIEWPORTS) restoreTrimmed();
  }
);

// ---------- 模糊占位 + 淡入 ----------
const imageLoaded = ref<Record<string, boolean>>({});

function handleImageLoad(work: HomeWork, event: Event) {
  imageLoaded.value = { ...imageLoaded.value, [String(work.id)]: true };
  emit("imageLoad", work.id, event);
}

function mediaStyle(work: HomeWork) {
  return {
    aspectRatio: toCssAspectRatio(work.ratio),
    backgroundImage: work.blur ? `url("${work.blur}")` : ""
  };
}

async function openWork(work: HomeWork) {
  const sourceRect = await resolveWorkDetailSourceRect(`lumi-plaza-work-media-${work.id}`, sourceContext);
  emit("openWork", work, sourceRect);
}

</script>

<template>
  <view :key="renderKey" class="waterfall" :class="[animationClass, { switching }]">
    <view class="waterfall-column">
      <view v-if="colSpacers[0] > 0" class="col-spacer" :style="{ height: colSpacers[0] + 'px' }" />
      <view v-for="work in leftWorks" :id="`lumi-work-card-${work.id}`" :key="work.id" class="work-card">
        <view :id="`lumi-plaza-work-media-${work.id}`" class="work-media" :style="mediaStyle(work)" @click="openWork(work)">
          <image class="work-img" :class="{ 'img-shown': !work.blur || imageLoaded[String(work.id)] }" :src="work.image" mode="aspectFill" lazy-load @load="handleImageLoad(work, $event)" />
        </view>
        <view class="work-body">
          <view class="work-title">{{ work.title }}</view>
          <view class="work-meta">
            <view class="author" @click.stop="work.userId > 0 && emit('openUser', work.userId)">
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
      <view v-if="colSpacers[1] > 0" class="col-spacer" :style="{ height: colSpacers[1] + 'px' }" />
      <view v-for="work in rightWorks" :id="`lumi-work-card-${work.id}`" :key="work.id" class="work-card">
        <view :id="`lumi-plaza-work-media-${work.id}`" class="work-media" :style="mediaStyle(work)" @click="openWork(work)">
          <image class="work-img" :class="{ 'img-shown': !work.blur || imageLoaded[String(work.id)] }" :src="work.image" mode="aspectFill" lazy-load @load="handleImageLoad(work, $event)" />
        </view>
        <view class="work-body">
          <view class="work-title">{{ work.title }}</view>
          <view class="work-meta">
            <view class="author" @click.stop="work.userId > 0 && emit('openUser', work.userId)">
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
  animation: plaza-card-rise .36s cubic-bezier(.16, 1, .3, 1) both;
}

.waterfall-column:nth-child(2) .work-card { animation-delay: .06s; }
@keyframes plaza-card-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

.col-spacer {
  width: 100%;
}

.work-media {
  display: block;
  width: 100%;
  overflow: hidden;
  background: var(--bg-soft);
  background-size: cover;
  background-position: center;
}

.work-img {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.16s ease-out;
}

.work-img.img-shown {
  opacity: 1;
}

.work-body {
  padding: 3px 8px 5px;
}

.work-title {
  margin-bottom: 1px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
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
  gap: 4px;
}

.author {
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.author-name {
  flex: 1;
  overflow: hidden;
  font-size: 10px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.like {
  gap: 2px;
  align-items: center;
  padding: 1px 2px;
  font-size: 11px;
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
