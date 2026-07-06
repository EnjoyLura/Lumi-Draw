<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useDataMode } from "../../services/dataMode";
import { fetchChangelog } from "../settings/settingsService";
import { currentVersion, versionLogs, type ChangeKind, type VersionLog } from "./changelogData";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const { useMockData } = useDataMode();
const logs = ref<VersionLog[]>([]);
const isLoading = ref(false);
const loadFailed = ref(false);
let lastMode: boolean | null = null;

const latestVersion = computed(() => logs.value[0]?.version || currentVersion);
const kindClass: Record<ChangeKind, string> = {
  新增: "tag-mint",
  优化: "tag-accent",
  修复: "tag-peach"
};

onShow(() => {
  if (lastMode === useMockData.value) return;
  lastMode = useMockData.value;
  void loadChangelog();
});

function normalizeKind(value: string): ChangeKind {
  if (value.includes("修")) return "修复";
  if (value.includes("优")) return "优化";
  return "新增";
}

async function loadChangelog() {
  if (useMockData.value) {
    logs.value = versionLogs;
    loadFailed.value = false;
    return;
  }

  isLoading.value = true;
  loadFailed.value = false;
  try {
    const rows = await fetchChangelog();
    logs.value = rows.map((row, index) => ({
      version: row.version,
      date: row.releasedAt,
      latest: index === 0,
      changes: (row.items || []).map((item) => ({
        kind: normalizeKind(item.type),
        text: item.text
      }))
    }));
  } catch {
    logs.value = [];
    loadFailed.value = true;
    uni.showToast({ title: "更新日志加载失败，请稍后重试", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <view class="changelog-page" :class="themeClass">
    <scroll-view class="page-scroll" scroll-y>
      <view class="changelog-content">
        <view class="app-head">
          <view class="app-logo">L</view>
          <view class="app-main">
            <view class="app-name">Lumi-Draw</view>
            <view class="app-version">当前版本 {{ latestVersion }}</view>
          </view>
          <view v-if="isLoading" class="spinner" />
        </view>

        <view v-if="!useMockData && loadFailed" class="empty-card">
          <view class="empty-title">更新日志加载失败</view>
          <view class="empty-sub">当前不会显示本地模拟日志，请重新加载后查看后端配置。</view>
          <button class="empty-btn" @click="loadChangelog">重新加载</button>
        </view>

        <view v-else-if="!logs.length && !isLoading" class="empty-card">
          <view class="empty-title">暂无更新日志</view>
          <view class="empty-sub">后端版本记录配置后会显示在这里。</view>
        </view>

        <view v-for="log in logs" :key="log.version" class="version-card">
          <view class="version-head">
            <text class="version-num">{{ log.version }}</text>
            <text v-if="log.latest" class="tag tag-accent">最新版本</text>
          </view>
          <view class="version-date">{{ log.date }}</view>
          <view class="change-list">
            <view v-for="(change, index) in log.changes" :key="index" class="change-item">
              <text class="tag change-tag" :class="kindClass[change.kind]">{{ change.kind }}</text>
              <text class="change-text">{{ change.text }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.changelog-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.changelog-content {
  padding: 16px;
}

.app-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), #4ecba0);
  border-radius: 16px;
}

.app-main {
  flex: 1;
  min-width: 0;
}

.app-name {
  font-size: 18px;
  font-weight: 700;
}

.app-version {
  margin-top: 2px;
  font-size: 13px;
  color: var(--fg-muted);
}

.version-card {
  padding: 16px;
  margin-bottom: 12px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.empty-card {
  padding: 22px 16px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.empty-title {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 700;
}

.empty-sub {
  margin-bottom: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--fg-muted);
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin: 0 auto;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 999px;
  line-height: 1.4;
}

.empty-btn::after {
  border: none;
}

.version-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.version-num {
  font-size: 16px;
  font-weight: 700;
}

.version-date {
  margin-bottom: 10px;
  font-size: 11px;
  color: var(--fg-muted);
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
}

.tag-accent {
  color: var(--accent-deep);
  background: var(--accent-soft);
}

.tag-mint {
  color: var(--mint);
  background: var(--mint-soft);
}

.tag-peach {
  color: var(--peach-deep);
  background: var(--peach-soft);
}

.change-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.change-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.change-tag {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 1px 7px;
  font-size: 9px;
}

.change-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--fg-secondary);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
