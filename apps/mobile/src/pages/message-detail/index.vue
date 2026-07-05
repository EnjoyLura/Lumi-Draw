<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { getMessageCategory, getMessages, type MessageCategory, type MessageCategoryKey, type MessageItem } from "../messages/messagesData";
import { fetchMessageList, markMessageCategoryRead } from "../messages/messagesService";

const { requireLogin } = useAuth();
const { useMockData } = useDataMode();

const category = ref<MessageCategory>(getMessageCategory("like"));
const readKeys = ref<Set<string>>(new Set());
const backendMessages = ref<MessageItem[]>([]);
const isLoading = ref(false);

const messages = computed(() => (useMockData.value ? getMessages(category.value.key, readKeys.value) : backendMessages.value));

onLoad((query) => {
  category.value = getMessageCategory(String(query?.type || "like"));
  uni.setNavigationBarTitle({ title: category.value.title });

  const stored = uni.getStorageSync("lumiReadMessageCategories");
  const current = new Set<string>(Array.isArray(stored) ? stored : []);
  readKeys.value = current;

  const next = new Set(current);
  next.add(category.value.key);
  uni.setStorageSync("lumiReadMessageCategories", [...next]);
  void loadMessages(category.value.key);
});

async function loadMessages(type: MessageCategoryKey) {
  if (useMockData.value) return;
  if (!requireLogin()) return;

  isLoading.value = true;
  try {
    backendMessages.value = await fetchMessageList(type);
    await markMessageCategoryRead(type);
  } catch {
    uni.showToast({ title: "消息加载失败", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <view class="message-detail-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="detail-content">
        <view v-if="isLoading" class="empty-state">
          <view class="empty-icon" :style="{ color: category.color, background: `${category.color}22` }">{{ category.icon }}</view>
          <view class="empty-title">消息加载中</view>
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
</style>
