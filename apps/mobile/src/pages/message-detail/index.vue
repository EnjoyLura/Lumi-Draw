<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { refreshNavigationTitle } from "../../services/navigationTitle";
import { getMessageCategory, getMessages, type MessageCategory, type MessageCategoryKey, type MessageItem } from "../messages/messagesData";
import { fetchMessageList, markMessageCategoryRead } from "../messages/messagesService";

const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();

const category = ref<MessageCategory>(getMessageCategory("like"));
const readKeys = ref<Set<string>>(new Set());
const backendMessages = ref<MessageItem[]>([]);
const isLoading = ref(false);
const showLoginSheet = ref(false);
const hasLoaded = ref(false);
const loginRequired = ref(false);
const loadFailed = ref(false);

const messages = computed(() => (useMockData.value ? getMessages(category.value.key, readKeys.value) : backendMessages.value));

onLoad((query) => {
  void syncCategory(resolveRouteType(query), true);
});

onShow(() => {
  void syncCategory(resolveRouteType(), false);
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", handleHashChange);
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("hashchange", handleHashChange);
});

function handleHashChange() {
  void syncCategory(resolveRouteType(), false);
}

function resolveRouteType(query?: Record<string, unknown>) {
  const queryType = typeof query?.type === "string" ? query.type : undefined;
  if (queryType) return getMessageCategory(queryType).key;

  if (typeof window !== "undefined") {
    const hashType = window.location.hash.match(/[?&]type=([^&]+)/)?.[1];
    if (hashType) return getMessageCategory(decodeURIComponent(hashType)).key;
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string>; fullPath?: string };
      }
    | undefined;
  const pageType = current?.options?.type || current?.$page?.options?.type;
  if (pageType) return getMessageCategory(pageType).key;

  return category.value.key;
}

async function syncCategory(type: MessageCategoryKey, force: boolean) {
  const nextCategory = getMessageCategory(type);
  const changed = nextCategory.key !== category.value.key;
  if (!force && !changed && hasLoaded.value) return;

  category.value = nextCategory;
  refreshNavigationTitle(nextCategory.title);

  const stored = uni.getStorageSync("lumiReadMessageCategories");
  const nextReadKeys = new Set<string>(Array.isArray(stored) ? stored : []);
  nextReadKeys.add(nextCategory.key);
  readKeys.value = nextReadKeys;
  uni.setStorageSync("lumiReadMessageCategories", [...nextReadKeys]);

  await loadMessages(nextCategory.key);
  hasLoaded.value = true;
}

async function loadMessages(type: MessageCategoryKey) {
  if (useMockData.value) {
    loginRequired.value = false;
    loadFailed.value = false;
    return;
  }
  backendMessages.value = [];
  loadFailed.value = false;
  if (!isLoggedIn.value) {
    loginRequired.value = true;
    return;
  }
  loginRequired.value = false;

  isLoading.value = true;
  try {
    const rows = await fetchMessageList(type);
    backendMessages.value = rows;
    try {
      await markMessageCategoryRead(type);
      backendMessages.value = rows.map((message) => ({ ...message, unread: false }));
    } catch {
      uni.showToast({ title: "已读状态同步失败，稍后会自动重试", icon: "none" });
    }
  } catch {
    backendMessages.value = [];
    loadFailed.value = true;
    uni.showToast({ title: "消息加载失败", icon: "none" });
  } finally {
    isLoading.value = false;
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
    await loadMessages(category.value.key);
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}
</script>

<template>
  <view class="message-detail-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="detail-content">
        <LumiLoginRequired
          v-if="!useMockData && loginRequired"
          title="登录后查看消息详情"
          subtitle="登录后即可查看并同步当前消息分类。"
          @login="showLoginSheet = true"
        />

        <view v-else-if="isLoading" class="empty-state">
          <view class="empty-icon" :style="{ color: category.color, background: `${category.color}22` }">{{ category.icon }}</view>
          <view class="empty-title">消息加载中</view>
        </view>

        <view v-else-if="loadFailed" class="empty-state">
          <view class="empty-icon" :style="{ color: category.color, background: `${category.color}22` }">{{ category.icon }}</view>
          <view class="empty-title">消息加载失败</view>
          <view class="empty-sub">请稍后重试，或检查当前登录状态。</view>
          <button class="retry-btn" @click="loadMessages(category.key)">重新加载</button>
        </view>

        <view v-else-if="messages.length === 0" class="empty-state">
          <view class="empty-icon" :style="{ color: category.color, background: `${category.color}22` }">{{ category.icon }}</view>
          <view class="empty-title">暂无{{ category.title }}</view>
          <view class="empty-sub">有新消息时会显示在这里</view>
        </view>

        <view v-for="(message, index) in messages" v-else :key="`${message.time}-${index}`" class="message-card">
          <template v-if="message.user">
            <view class="avatar" :style="{ background: message.user.color }">{{ message.user.avatar }}</view>
            <view class="message-main">
              <view class="message-head">
                <text class="sender-name">{{ message.user.name }}</text>
                <text class="message-time">{{ message.time }}</text>
              </view>
              <view class="message-content">{{ message.content }}</view>
            </view>
          </template>
          <template v-else>
            <view class="system-icon" :style="{ background: category.gradient }">{{ category.icon }}</view>
            <view class="message-main">
              <view class="message-head">
                <text class="sender-name">{{ category.title }}</text>
                <text class="message-time">{{ message.time }}</text>
              </view>
              <view class="message-content">{{ message.content }}</view>
            </view>
          </template>
          <view v-if="message.unread" class="unread-dot" />
        </view>
      </view>
    </scroll-view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.message-detail-page {
  --rose: #ff4d6d;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.detail-content {
  padding: 12px 16px 16px;
}

.message-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  margin-bottom: 10px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.avatar,
.system-icon,
.empty-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.avatar {
  width: 40px;
  height: 40px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 50%;
}

.system-icon {
  width: 40px;
  height: 40px;
  font-size: 18px;
  font-weight: 700;
  border-radius: 12px;
}

.message-main {
  flex: 1;
  min-width: 0;
}

.message-head {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.sender-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-time {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--fg-muted);
}

.message-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg-secondary);
}

.unread-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  background: var(--rose);
  border-radius: 50%;
}

.empty-state {
  padding: 76px 20px 40px;
  text-align: center;
}

.empty-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  font-size: 28px;
  font-weight: 700;
  border-radius: 18px;
}

.empty-title {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 700;
}

.empty-sub {
  font-size: 12px;
  color: var(--fg-muted);
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 108px;
  height: 36px;
  padding: 0 18px;
  margin: 16px auto 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  background: var(--rose);
  border: none;
  border-radius: 999px;
}

.retry-btn::after {
  border: none;
}
</style>
