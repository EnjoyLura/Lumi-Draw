<script setup lang="ts">
import LumiPageHeader from "../../components/LumiPageHeader.vue";
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import LumiLoginRequired from "../../components/LumiLoginRequired.vue";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { refreshNavigationTitle } from "../../services/navigationTitle";
import { getLatestMessage, getUnreadCount, messageCategories, type MessageCategoryKey } from "./messagesData";
import { fetchMessageSummary, type MessageCategoryRow } from "./messagesService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();

const readKeys = ref<Set<string>>(new Set());
const backendRows = ref<MessageCategoryRow[]>([]);
const isLoading = ref(false);
const showLoginSheet = ref(false);
const loginRequired = ref(false);
const loadFailed = ref(false);

const categoryRows = computed(() => {
  if (!useMockData.value) return backendRows.value;
  return messageCategories.map((category) => ({
    ...category,
    latest: getLatestMessage(category.key),
    unread: getUnreadCount(category.key, readKeys.value)
  }));
});

onShow(() => {
  refreshNavigationTitle("消息");
  const stored = uni.getStorageSync("lumiReadMessageCategories");
  readKeys.value = new Set(Array.isArray(stored) ? stored : []);
  void loadMessages();
});

async function loadMessages() {
  if (useMockData.value) {
    loginRequired.value = false;
    loadFailed.value = false;
    return;
  }
  if (!isLoggedIn.value) {
    backendRows.value = [];
    loginRequired.value = true;
    loadFailed.value = false;
    return;
  }
  loginRequired.value = false;
  loadFailed.value = false;

  isLoading.value = true;
  try {
    backendRows.value = await fetchMessageSummary();
  } catch {
    backendRows.value = [];
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
    await loadMessages();
    uni.showToast({ title: "登录成功", icon: "none" });
  } catch {
    uni.showToast({ title: "登录失败，请稍后重试", icon: "none" });
  }
}

function openCategory(key: MessageCategoryKey) {
  uni.navigateTo({ url: `/pages/message-detail/index?type=${key}` });
}
</script>

<template>
  <view class="messages-page" :class="themeClass">
    <LumiPageHeader title="消息" />
    <LumiDeferredPageContent>
    <scroll-view class="page-scroll" scroll-y>
      <view class="category-list">
        <LumiLoginRequired
          v-if="!useMockData && loginRequired"
          title="登录后查看消息"
          subtitle="点赞、评论、系统通知和审核结果都会同步到这里。"
          @login="showLoginSheet = true"
        />
        <view v-else-if="isLoading && !categoryRows.length" class="empty-row">消息同步中...</view>
        <view v-else-if="loadFailed && !categoryRows.length" class="empty-row retry-row">
          <text>消息加载失败</text>
          <button class="retry-btn" @click.stop="loadMessages">重新加载</button>
        </view>
        <view v-for="category in categoryRows" :key="category.key" class="category-card" @click="openCategory(category.key)">
          <view class="category-icon" :style="{ background: category.gradient }">
            <LumiIcon v-if="category.key === 'like'" class="category-glyph" name="heart-filled" :size="23" />
            <LumiIcon v-else-if="category.key === 'favorite'" class="category-glyph" name="star-filled" :size="23" />
            <LumiIcon v-else-if="category.key === 'remake'" class="category-glyph" name="rotate-ccw" :size="23" />
            <LumiIcon v-else-if="category.key === 'follow'" class="category-glyph" name="user" :size="23" />
            <LumiIcon v-else-if="category.key === 'system'" class="category-glyph" name="bell" :size="23" />
            <LumiIcon v-else class="category-glyph" name="message-circle" :size="23" />
          </view>
          <view class="category-main">
            <view class="category-head">
              <text class="category-title">{{ category.title }}</text>
              <text class="category-time">{{ category.latest.time }}</text>
            </view>
            <view class="category-bottom">
              <text class="category-desc">{{ category.latest.desc }}</text>
              <text v-if="category.unread > 0" class="unread-badge">{{ category.unread }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    </LumiDeferredPageContent>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
  </view>
</template>

<style scoped>
.messages-page {
  --rose: #ff4d6d;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
  box-sizing: border-box;
}

.category-list {
  padding: 12px 16px;
}

.category-card,
.empty-row {
  display: flex;
  gap: 14px;
  align-items: center;
  min-height: 78px;
  padding: 14px 16px;
  margin-bottom: 10px;
  box-sizing: border-box;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.empty-row {
  justify-content: center;
  color: var(--fg-muted);
}

.retry-row {
  flex-direction: column;
  gap: 12px;
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 108px;
  height: 36px;
  padding: 0 18px;
  margin: 0;
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

.category-card:active {
  transform: scale(0.98);
}

.category-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.category-glyph {
  display: block;
  margin: auto;
  line-height: 1;
}

.category-main {
  flex: 1;
  min-width: 0;
}

.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.category-title {
  font-size: 15px;
  font-weight: 700;
}

.category-time {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--fg-muted);
}

.category-bottom {
  display: flex;
  gap: 8px;
  align-items: center;
}

.category-desc {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-badge {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  box-sizing: border-box;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--rose);
  border-radius: 9px;
}
</style>
