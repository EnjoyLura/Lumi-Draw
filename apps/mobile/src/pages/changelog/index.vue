<script setup lang="ts">
import { currentVersion, versionLogs, type ChangeKind } from "./changelogData";

const kindClass: Record<ChangeKind, string> = {
  新增: "tag-mint",
  优化: "tag-accent",
  修复: "tag-peach"
};
</script>

<template>
  <view class="changelog-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="changelog-content">
        <view class="app-head">
          <view class="app-logo">L</view>
          <view>
            <view class="app-name">Lumi-Draw</view>
            <view class="app-version">当前版本 {{ currentVersion }}</view>
          </view>
        </view>

        <view v-for="log in versionLogs" :key="log.version" class="version-card">
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
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
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
  border: 1px solid var(--border);
  border-radius: 12px;
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
</style>
