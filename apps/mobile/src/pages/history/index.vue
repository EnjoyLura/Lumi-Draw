<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { clearHistory as clearRemoteHistory, fetchHistory, toHomeWork } from "../../services/social";
import { homeWorks, type HomeWork } from "../home/homeData";

const cleared = ref(false);
const realWorks = ref<HomeWork[]>([]);
const { useMockData } = useDataMode();
const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const showLoginSheet = ref(false);
const loginRequired = ref(false);
let lastMode: boolean | null = null;

const sourceWorks = computed(() => (useMockData.value ? homeWorks : realWorks.value));
const todayWorks = computed(() => sourceWorks.value.slice(0, 6));
const yesterdayWorks = computed(() => sourceWorks.value.slice(6, 9));
const earlierWorks = computed(() => sourceWorks.value.slice(9));

onLoad(() => {
  lastMode = null;
});

onShow(() => {
  if (useMockData.value && lastMode === useMockData.value) return;
  lastMode = useMockData.value;
  void loadHistory();
});

async function loadHistory() {
  cleared.value = false;
  if (useMockData.value) {
    realWorks.value = [];
    loginRequired.value = false;
    return;
  }
  if (!isLoggedIn.value) {
    realWorks.value = [];
    loginRequired.value = true;
    return;
  }
  loginRequired.value = false;
  try {
    const page = await fetchHistory();
    realWorks.value = page.items.map(toHomeWork);
    cleared.value = realWorks.value.length === 0;
  } catch {
    realWorks.value = [];
    cleared.value = true;
    uni.showToast({ title: "浏览记录加载失败", icon: "none" });
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
    await loadHistory();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function openWork(work: HomeWork) {
  uni.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` });
}

async function clearHistory() {
  if (!useMockData.value) {
    if (!ensureLogin()) return;
    try {
      await clearRemoteHistory();
      realWorks.value = [];
    } catch {
      uni.showToast({ title: "清空失败，请稍后重试", icon: "none" });
      return;
    }
  }
  cleared.value = true;
  uni.showToast({ title: "已清空浏览记录", icon: "none" });
}

function goHome() {
  uni.reLaunch({ url: "/pages/home/index" });
}
</script>

<template>
  <view class="history-page">
    <scroll-view class="page-scroll" scroll-y>
      <LumiLoginRequired
        v-if="!useMockData && loginRequired"
        title="登录后查看浏览记录"
        subtitle="这里会保存你看过的作品，方便回到喜欢的灵感。"
        @login="showLoginSheet = true"
      />

      <template v-else-if="!cleared">
        <view class="toolbar">
          <button class="clear-btn" @click="clearHistory">清空记录</button>
        </view>
        <view class="history-content">
          <view class="section-title">今天</view>
          <view class="grid">
            <view v-for="work in todayWorks" :key="work.id" class="grid-item" @click="openWork(work)">
              <image class="grid-img" :src="work.image" mode="aspectFill" />
            </view>
          </view>

          <view class="section-title">昨天</view>
          <view class="grid">
            <view v-for="work in yesterdayWorks" :key="work.id" class="grid-item" @click="openWork(work)">
              <image class="grid-img" :src="work.image" mode="aspectFill" />
            </view>
          </view>

          <template v-if="earlierWorks.length">
            <view class="section-title">更早</view>
            <view class="grid">
              <view v-for="work in earlierWorks" :key="work.id" class="grid-item" @click="openWork(work)">
                <image class="grid-img" :src="work.image" mode="aspectFill" />
              </view>
            </view>
          </template>
        </view>
      </template>

      <view v-else class="empty-state">
        <view class="empty-icon">◷</view>
        <view class="empty-title">暂无浏览记录</view>
        <view class="empty-sub">去广场逛逛，发现更多精彩作品</view>
        <button class="empty-btn" @click="goHome">✦ 去逛逛</button>
      </view>
    </scroll-view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.history-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  color: var(--fg-secondary);
  background: transparent;
  border: none;
  border-radius: 10px;
}

.clear-btn::after {
  border: none;
}

.history-content {
  padding: 0 16px 20px;
}

.section-title {
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--fg-primary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.grid-item {
  overflow: hidden;
  aspect-ratio: 1;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.grid-img {
  display: block;
  width: 100%;
  height: 100%;
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
  font-size: 30px;
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
